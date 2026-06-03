import { clearPrefix, readJson, removeJson, writeJson } from './database';

export type EntityCollectionName = 'fazendas' | 'animais' | 'medicoes' | 'notificacoes' | 'perfil' | 'session';

const COLLECTION_PREFIX = 'collection';
const SESSION_KEY = 'session:active';

const buildCollectionKey = (name: EntityCollectionName | string) => `${COLLECTION_PREFIX}:${name}`;

const normalizeList = <T>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.fazendas)) return value.fazendas as T[];
  if (Array.isArray(value?.animais)) return value.animais as T[];
  if (Array.isArray(value?.medicoes)) return value.medicoes as T[];
  if (Array.isArray(value?.notificacoes)) return value.notificacoes as T[];
  return [];
};

export async function getCollection<T = any>(name: EntityCollectionName | string): Promise<T[]> {
  const stored = await readJson<any[]>(buildCollectionKey(name), []);
  return normalizeList<T>(stored);
}

export async function setCollection<T = any>(name: EntityCollectionName | string, items: T[]): Promise<void> {
  await writeJson(buildCollectionKey(name), Array.isArray(items) ? items : []);
}

export async function upsertCollectionItem<T extends Record<string, any>>(
  name: EntityCollectionName | string,
  item: T,
  matchKeys: string[] = ['id', 'id_fazenda', 'id_animal', 'id_usuario']
): Promise<T[]> {
  const collection = await getCollection<T>(name);
  const itemKey = matchKeys.map((key) => String(item?.[key] ?? '')).find((value) => value !== '') ?? null;

  const next = collection.filter((current) => {
    const currentKey = matchKeys.map((key) => String(current?.[key] ?? '')).find((value) => value !== '') ?? null;
    if (!itemKey || !currentKey) return true;
    return currentKey !== itemKey;
  });

  next.push(item);
  await setCollection(name, next);
  return next;
}

export async function removeCollectionItem(
  name: EntityCollectionName | string,
  predicate: (item: any) => boolean
): Promise<any[]> {
  const collection = await getCollection(name);
  const next = collection.filter((item) => !predicate(item));
  await setCollection(name, next);
  return next;
}

export async function clearCollection(name: EntityCollectionName | string): Promise<void> {
  await removeJson(buildCollectionKey(name));
}

export async function getSession<T = any>(): Promise<T | null> {
  return readJson<T | null>(SESSION_KEY, null);
}

export async function setSession<T = any>(value: T): Promise<void> {
  await writeJson(SESSION_KEY, value);
}

export async function clearSession(): Promise<void> {
  await removeJson(SESSION_KEY);
}

export async function clearAllCollections(): Promise<void> {
  await clearPrefix(COLLECTION_PREFIX);
}

export async function getCollectionRecord<T = any>(name: EntityCollectionName | string): Promise<T | null> {
  return readJson<T | null>(buildCollectionKey(name), null);
}

export async function setCollectionRecord<T = any>(name: EntityCollectionName | string, value: T): Promise<void> {
  await writeJson(buildCollectionKey(name), value);
}
