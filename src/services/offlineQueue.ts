import NetInfo from '@react-native-community/netinfo';
import api from './api';
import cache from './cache';
import { enqueueQueueItem, getQueue, removeQueueItem } from '../database/database';
import { Platform, EventEmitter } from 'react-native';

const isDefinitelyOffline = (state: any) => state?.isConnected === false || state?.isInternetReachable === false;

export type QueueItem = {
  id: string;
  endpoint: string;
  method: 'post' | 'put' | 'delete' | 'patch';
  bodyKind?: 'json' | 'form-data';
  fields?: Record<string, any>;
  localImageUri?: string | null;
  filename?: string | null;
  mimetype?: string | null;
  clientTempId?: string | null;
  fileFieldName?: string | null;
  headers?: Record<string, string>;
};

let _isProcessing = false;

// ─── Event Emitter para notificar telas após sync ─────────────────────────
// Simula o comportamento do WhatsApp: atualiza a UI quando chega confirmação
// do servidor, sem precisar que a tela faça polling.
const _syncEmitter = new EventEmitter();
_syncEmitter.setMaxListeners(20);

export const syncEvents = {
  on: (event: 'farmSynced' | 'animalSynced' | 'queueProcessed', cb: (data?: any) => void) =>
    _syncEmitter.addListener(event, cb),
  off: (event: 'farmSynced' | 'animalSynced' | 'queueProcessed', cb: (data?: any) => void) =>
    _syncEmitter.removeListener(event, cb),
  emit: (event: 'farmSynced' | 'animalSynced' | 'queueProcessed', data?: any) =>
    _syncEmitter.emit(event, data),
};

async function readQueue(): Promise<QueueItem[]> {
  const rows = await getQueue();
  return rows.map((row: any) => ({
    id: row.id,
    endpoint: row.endpoint,
    method: row.method,
    bodyKind: row.body_kind ?? row.bodyKind ?? 'json',
    fields: row.fields ? JSON.parse(row.fields) : undefined,
    localImageUri: row.local_image_uri ?? row.localImageUri ?? null,
    filename: row.filename ?? null,
    mimetype: row.mimetype ?? null,
    clientTempId: row.client_temp_id ?? row.clientTempId ?? null,
    fileFieldName: row.file_field_name ?? row.fileFieldName ?? null,
    headers: row.headers ? JSON.parse(row.headers) : undefined,
  }));
}

export async function enqueue(item: QueueItem) {
  await enqueueQueueItem({
    id: item.id,
    endpoint: item.endpoint,
    method: item.method,
    body_kind: item.bodyKind ?? 'json',
    fields: item.fields ? JSON.stringify(item.fields) : null,
    local_image_uri: item.localImageUri ?? null,
    filename: item.filename ?? null,
    mimetype: item.mimetype ?? null,
    client_temp_id: item.clientTempId ?? null,
    file_field_name: item.fileFieldName ?? null,
    headers: item.headers ? JSON.stringify(item.headers) : null,
    created_at: Date.now(),
    attempts: 0,
    last_error: null,
  });
}

export async function removeFromQueue(id: string) {
  await removeQueueItem(id);
}

export async function enqueueSerializedRequest(config: any) {
  const method = String(config?.method ?? 'post').toLowerCase() as QueueItem['method'];
  const data = config?.data;
  const isFormData = Boolean(data && typeof data === 'object' && typeof data._parts !== 'undefined');
  const parsed = isFormData
    ? parseFormData(data)
    : { fields: normalizeObject(data), localImageUri: null, filename: null, mimetype: null, fileFieldName: null };

  const item: QueueItem = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    endpoint: String(config?.url ?? ''),
    method,
    bodyKind: isFormData ? 'form-data' : 'json',
    fields: parsed.fields,
    localImageUri: parsed.localImageUri,
    filename: parsed.filename,
    mimetype: parsed.mimetype,
    clientTempId: config?.clientTempId ?? null,
    fileFieldName: parsed.fileFieldName,
    headers: normalizeHeaders(config?.headers),
  };

  await enqueue(item);
  return item;
}

export async function processQueue() {
  if (_isProcessing) return;

  const state = await NetInfo.fetch();
  if (isDefinitelyOffline(state)) return;

  const list = await readQueue();
  if (list.length === 0) return;

  _isProcessing = true;
  console.log(`[processQueue] Processando ${list.length} item(s) na fila`);

  let syncedAny = false;

  try {
    for (const item of list) {
      try {
        const data = item.bodyKind === 'form-data' || item.localImageUri
          ? buildFormData(item)
          : item.fields ?? {};

        // ⚠️  skipOfflineLogic=true: vai direto na rede, sem passar pelo adapter customizado.
        // Isso evita: (1) re-enfileiramento, (2) loop infinito, (3) falso "offline" por timing.
        const response = await api.request({
          method: item.method as any,
          url: item.endpoint,
          data,
          headers: item.headers,
          timeout: 0, // sem limite — o Render pode demorar para acordar
          skipOfflineLogic: true,  // bypassa o adapter customizado
        } as any);

        await updateCacheAfterSync(item, response.data);
        await removeFromQueue(item.id);
        syncedAny = true;

        console.log(`[processQueue] Sincronizado: ${item.endpoint} (${item.id})`);

        // Notificar telas que algo foi sincronizado
        if (item.endpoint === '/fazendas' || item.endpoint.startsWith('/fazendas/')) {
          syncEvents.emit('farmSynced', { item, responseData: response.data });
        } else if (item.endpoint === '/animal' || item.endpoint === '/animais' || item.endpoint.startsWith('/animais/')) {
          syncEvents.emit('animalSynced', { item, responseData: response.data });
        }

      } catch (e: any) {
        console.warn('[processQueue] Item falhou, mantendo na fila:', item.id, e?.message);
        // Não re-enfileira — o item já está na fila, só falhou essa tentativa
      }
    }
  } finally {
    _isProcessing = false;
    if (syncedAny) {
      syncEvents.emit('queueProcessed');
    }
  }
}

async function updateCacheAfterSync(item: QueueItem, responseData: any) {
  try {
    if (item.endpoint === '/fazendas' || item.endpoint.startsWith('/fazendas/')) {
      if (item.method === 'delete') {
        const farmId = item.endpoint.split('/').pop();
        const cachedRaw = await cache.getCache('/fazendas');
        const cachedList = normalizeCacheList(cachedRaw);
        const updated = cachedList.filter(
          (f: any) => String(f.id_fazenda ?? f.id) !== String(farmId)
        );
        await cache.setCache('/fazendas', updated);
        return;
      }

      const createdFarm = responseData?.fazenda ?? responseData;
      const serverId = String(createdFarm?.id_fazenda ?? createdFarm?.id ?? '');
      const cachedRaw = await cache.getCache('/fazendas');
      const cachedList = normalizeCacheList(cachedRaw);

      const next = [
        ...cachedList.filter((farm: any) => {
          const sameServerId = serverId && String(farm.id_fazenda ?? farm.id) === serverId;
          const sameTempId =
            item.clientTempId &&
            (String(farm.clientTempId ?? '') === String(item.clientTempId) ||
              String(farm.id_fazenda ?? '') === String(item.clientTempId));
          return !sameServerId && !sameTempId;
        }),
        {
          ...createdFarm,
          localImageUri: item.localImageUri ?? null,
          pendingSync: false,
          clientTempId: null,
        },
      ];

      await cache.setCache('/fazendas', next);
      console.log('[processQueue] Cache /fazendas atualizado com dado real do servidor');
    }

    if (item.endpoint === '/animal' || item.endpoint === '/animais' || item.endpoint.startsWith('/animais/')) {
      if (item.method === 'delete') {
        const animalId = item.endpoint.split('/').pop();
        const cachedRaw = await cache.getCache('/animais');
        const cachedList = normalizeCacheList(cachedRaw);
        const updated = cachedList.filter(
          (a: any) => String(a.id_animal ?? a.id) !== String(animalId)
        );
        await cache.setCache('/animais', updated);
        return;
      }

      const createdAnimal = responseData?.animal ?? responseData;
      const cachedRaw = await cache.getCache('/animais');
      const cachedList = normalizeCacheList(cachedRaw);

      const next = [
        ...cachedList.filter((animal: any) => {
          const sameServerId =
            String(animal.id_animal ?? animal.id) ===
            String(createdAnimal?.id_animal ?? createdAnimal?.id);
          const sameTempId =
            item.clientTempId &&
            String(animal.clientTempId ?? '') === String(item.clientTempId);
          return !sameServerId && !sameTempId;
        }),
        {
          ...createdAnimal,
          localImageUri: item.localImageUri ?? null,
          pendingSync: false,
          clientTempId: null,
        },
      ];

      await cache.setCache('/animais', next);
      console.log('[processQueue] Cache /animais atualizado com dado real do servidor');
    }
  } catch (e) {
    console.warn('[processQueue] Falha ao atualizar cache após sync:', e);
  }
}

function normalizeCacheList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.fazendas)) return raw.fazendas;
  if (Array.isArray(raw?.animais)) return raw.animais;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function normalizeObject(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {};
  if (typeof data._parts !== 'undefined') return {};
  return { ...data };
}

function normalizeHeaders(headers: any): Record<string, string> | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, String(value)]));
}

function parseFormData(formData: any) {
  const fields: Record<string, any> = {};
  let localImageUri: string | null = null;
  let filename: string | null = null;
  let mimetype: string | null = null;
  let fileFieldName: string | null = null;

  const parts: any[] = Array.isArray(formData?._parts) ? formData._parts : [];

  parts.forEach(([name, value]) => {
    if (value && typeof value === 'object' && 'uri' in value) {
      localImageUri = String(value.uri ?? null);
      filename = value.name ?? null;
      mimetype = value.type ?? null;
      fileFieldName = String(name);
      return;
    }
    fields[String(name)] = value;
  });

  return { fields, localImageUri, filename, mimetype, fileFieldName };
}

function buildFormData(item: QueueItem) {
  const form = new FormData();

  if (item.fields) {
    Object.entries(item.fields).forEach(([key, value]) => {
      form.append(key, value as any);
    });
  }

  if (item.localImageUri) {
    const fieldName = item.fileFieldName ?? 'imagem';
    if (Platform.OS === 'web') {
      throw new Error('Queued web uploads are not supported without a browser file reference.');
    }
    form.append(fieldName, {
      uri: item.localImageUri,
      name: item.filename || 'upload.jpg',
      type: item.mimetype || 'image/jpeg',
    } as any);
  }

  return form;
}

let _pollingInterval: ReturnType<typeof setInterval> | null = null;

export function initQueueListener() {
  // Listener de mudança de conectividade — quando reconecta, processa fila
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      console.log('[offlineQueue] Conexão detectada, processando fila...');
      processQueue();
    }
  });

  // Polling a cada 30s como fallback (Render pode demorar para acordar)
  if (_pollingInterval) clearInterval(_pollingInterval);
  _pollingInterval = setInterval(() => {
    processQueue();
  }, 30000);

  return () => {
    unsubscribeNetInfo();
    if (_pollingInterval) {
      clearInterval(_pollingInterval);
      _pollingInterval = null;
    }
  };
}

export default { enqueue, enqueueSerializedRequest, processQueue, initQueueListener, readQueue, syncEvents };
