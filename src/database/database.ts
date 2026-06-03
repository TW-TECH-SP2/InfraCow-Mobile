import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'infracow.db';
const JSON_BUCKET = 'json';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type QueueRow = {
  id: string;
  endpoint: string;
  method: string;
  body_kind: string | null;
  fields: string | null;
  local_image_uri: string | null;
  filename: string | null;
  mimetype: string | null;
  client_temp_id: string | null;
  file_field_name: string | null;
  headers: string | null;
  created_at: number;
  attempts: number;
  last_error: string | null;
};

let initPromise: Promise<void> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }

  return dbPromise;
}

async function runSql(sql: string, params: any[] = []) {
  const db = await getDb();
  return db.runAsync(sql, params as any);
}

async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params as any);
}

async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params as any);
}

async function writeJsonRaw<T>(key: string, value: T): Promise<void> {
  const payload = JSON.stringify(value);
  const now = Date.now();
  await runSql(
    `INSERT INTO kv_store(bucket, item_key, payload, updated_at)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(bucket, item_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    [JSON_BUCKET, key, payload, now]
  );
}

async function deleteJsonRowsByPrefixRaw(prefix: string): Promise<void> {
  await runSql('DELETE FROM kv_store WHERE bucket = ? AND item_key LIKE ?', [JSON_BUCKET, `${prefix}%`]);
}

async function insertQueueItemRaw(item: QueueRow): Promise<void> {
  await runSql(
    `INSERT OR REPLACE INTO sync_queue(
      id, endpoint, method, body_kind, fields, local_image_uri, filename, mimetype,
      client_temp_id, file_field_name, headers, created_at, attempts, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.endpoint,
      item.method,
      item.body_kind,
      item.fields,
      item.local_image_uri,
      item.filename,
      item.mimetype,
      item.client_temp_id,
      item.file_field_name,
      item.headers,
      item.created_at,
      item.attempts,
      item.last_error,
    ]
  );
}

async function ensureSchema() {
  await runSql('PRAGMA journal_mode = WAL');
  await runSql(
    `CREATE TABLE IF NOT EXISTS kv_store (
      bucket TEXT NOT NULL,
      item_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(bucket, item_key)
    )`
  );
  await runSql('CREATE INDEX IF NOT EXISTS idx_kv_store_bucket ON kv_store(bucket)');
  await runSql(
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      body_kind TEXT,
      fields TEXT,
      local_image_uri TEXT,
      filename TEXT,
      mimetype TEXT,
      client_temp_id TEXT,
      file_field_name TEXT,
      headers TEXT,
      created_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    )`
  );
  await runSql('CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at)');
}

async function migrateLegacyStorage() {
  const allKeys = await AsyncStorage.getAllKeys();

  const legacyCacheKeys = allKeys.filter((key) => key.startsWith('@infracow_cache:'));
  for (const legacyKey of legacyCacheKeys) {
    const raw = await AsyncStorage.getItem(legacyKey);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const key = legacyKey.replace('@infracow_cache:', 'cache:');
      await writeJsonRaw(key, parsed);
    } catch (error) {
      console.warn('[database] failed to migrate cache key', legacyKey, error);
    }
  }

  const legacyQueueRaw = await AsyncStorage.getItem('@infracow_pending_uploads');
  if (legacyQueueRaw) {
    try {
      const parsedQueue = JSON.parse(legacyQueueRaw);
      if (Array.isArray(parsedQueue)) {
        for (const item of parsedQueue) {
          await insertQueueItemRaw(normalizeLegacyQueueItem(item));
        }
      }
    } catch (error) {
      console.warn('[database] failed to migrate legacy queue', error);
    }
  }

  const token = await AsyncStorage.getItem('@infracow_token');
  const userRaw = await AsyncStorage.getItem('@infracow_user');
  if (token || userRaw) {
    let user: any = null;

    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch (error) {
        console.warn('[database] failed to parse legacy user during migration', error);
      }
    }

    await writeJsonRaw('session:active', { token: token ?? null, user });
  }
}

function normalizeLegacyQueueItem(item: any): QueueRow {
  return {
    id: String(item?.id ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    endpoint: String(item?.endpoint ?? ''),
    method: String(item?.method ?? 'post'),
    body_kind: item?.bodyKind ?? 'json',
    fields: item?.fields ? JSON.stringify(item.fields) : null,
    local_image_uri: item?.localImageUri ?? null,
    filename: item?.filename ?? null,
    mimetype: item?.mimetype ?? null,
    client_temp_id: item?.clientTempId ?? null,
    file_field_name: item?.fileFieldName ?? null,
    headers: item?.headers ? JSON.stringify(item.headers) : null,
    created_at: Number(item?.createdAt ?? Date.now()),
    attempts: Number(item?.attempts ?? 0),
    last_error: item?.lastError ?? null,
  };
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureSchema();
      await migrateLegacyStorage();
    })();
  }

  return initPromise;
}

async function selectJsonRow(key: string) {
  await ensureInitialized();
  return queryFirst<{ payload: string; updated_at: number }>('SELECT payload, updated_at FROM kv_store WHERE bucket = ? AND item_key = ? LIMIT 1', [JSON_BUCKET, key]);
}

async function selectJsonRowsByPrefix(prefix: string) {
  await ensureInitialized();
  return queryAll<{ item_key: string }>('SELECT item_key FROM kv_store WHERE bucket = ? AND item_key LIKE ?', [JSON_BUCKET, `${prefix}%`]);
}

async function upsertJsonRow(key: string, value: any) {
  await ensureInitialized();
  await writeJsonRaw(key, value);
}

async function deleteJsonRow(key: string) {
  await ensureInitialized();
  await runSql('DELETE FROM kv_store WHERE bucket = ? AND item_key = ?', [JSON_BUCKET, key]);
}

async function deleteJsonRowsByPrefix(prefix: string) {
  await ensureInitialized();
  await deleteJsonRowsByPrefixRaw(prefix);
}

async function selectQueueRows() {
  await ensureInitialized();
  return queryAll<QueueRow>('SELECT * FROM sync_queue ORDER BY created_at ASC, rowid ASC');
}

async function deleteQueueItem(id: string) {
  await ensureInitialized();
  await runSql('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await selectJsonRow(key);
    if (!row) return fallback;
    return JSON.parse(row.payload) as T;
  } catch (error) {
    console.warn('[database] readJson failed for', key, error);
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await upsertJsonRow(key, value);
  } catch (error) {
    console.warn('[database] writeJson failed for', key, error);
  }
}

export async function removeJson(key: string): Promise<void> {
  try {
    await deleteJsonRow(key);
  } catch (error) {
    console.warn('[database] removeJson failed for', key, error);
  }
}

export async function listKeys(prefix: string): Promise<string[]> {
  try {
    const rows = await selectJsonRowsByPrefix(prefix);
    return rows.map((row: any) => row.item_key as string);
  } catch (error) {
    console.warn('[database] listKeys failed for', prefix, error);
    return [];
  }
}

export async function clearPrefix(prefix: string): Promise<void> {
  try {
    await deleteJsonRowsByPrefix(prefix);
  } catch (error) {
    console.warn('[database] clearPrefix failed for', prefix, error);
  }
}

export function makeKey(...parts: Array<string | number | undefined | null>) {
  return parts.filter((part) => part !== undefined && part !== null && part !== '').join(':');
}

export async function getQueue(): Promise<QueueRow[]> {
  try {
    return (await selectQueueRows()) as QueueRow[];
  } catch (error) {
    console.warn('[database] getQueue failed', error);
    return [];
  }
}

export async function enqueueQueueItem(item: Omit<QueueRow, 'created_at' | 'attempts' | 'last_error'> & Partial<Pick<QueueRow, 'created_at' | 'attempts' | 'last_error'>>) {
  try {
    await insertQueueItemRaw({
      ...item,
      created_at: item.created_at ?? Date.now(),
      attempts: item.attempts ?? 0,
      last_error: item.last_error ?? null,
    });
  } catch (error) {
    console.warn('[database] enqueueQueueItem failed', error);
  }
}

export async function removeQueueItem(id: string): Promise<void> {
  try {
    await deleteQueueItem(id);
  } catch (error) {
    console.warn('[database] removeQueueItem failed', error);
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await ensureInitialized();
    await runSql('DELETE FROM sync_queue');
  } catch (error) {
    console.warn('[database] clearQueue failed', error);
  }
}
