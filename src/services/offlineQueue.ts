import NetInfo from '@react-native-community/netinfo';
import api from './api';
import cache from './cache';
import { enqueueQueueItem, getQueue, removeQueueItem, clearQueue } from '../database/database';
import { Platform } from 'react-native';

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

async function writeQueue(list: QueueItem[]) {
  await clearQueue();
  for (const item of list) {
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
  const parsed = isFormData ? parseFormData(data) : { fields: normalizeObject(data), localImageUri: null, filename: null, mimetype: null, fileFieldName: null };

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
  const state = await NetInfo.fetch();
  if (isDefinitelyOffline(state)) return;

  const list = await readQueue();
  for (const item of list) {
    try {
      const data = item.bodyKind === 'form-data' || item.localImageUri ? buildFormData(item) : item.fields ?? {};

      const response = await api.request({
        method: item.method as any,
        url: item.endpoint,
        data,
        headers: item.headers,
      });

      if (item.endpoint === '/fazendas') {
        const createdFarm = response.data?.fazenda ?? response.data;
        const cachedFarmsRaw = await cache.getCache('/fazendas');
        const cachedFarms = Array.isArray(cachedFarmsRaw)
          ? cachedFarmsRaw
          : Array.isArray(cachedFarmsRaw?.fazendas)
            ? cachedFarmsRaw.fazendas
            : Array.isArray(cachedFarmsRaw?.data)
              ? cachedFarmsRaw.data
              : [];

        const nextCachedFarms = [
          ...cachedFarms.filter((farm: any) => {
            const sameServerId = String(farm.id_fazenda ?? farm.id) === String(createdFarm?.id_fazenda ?? createdFarm?.id);
            const sameTempId = item.clientTempId && (
              String(farm.clientTempId ?? '') === String(item.clientTempId) ||
              String(farm.id_fazenda ?? '') === String(item.clientTempId)
            );
            return !sameServerId && !sameTempId;
          }),
          {
            ...createdFarm,
            localImageUri: item.localImageUri ?? null,
            pendingSync: false,
            clientTempId: null,
          },
        ];

        await cache.setCache('/fazendas', nextCachedFarms);
      }

      if (item.endpoint === '/animal' || item.endpoint === '/animais') {
        const createdAnimal = response.data?.animal ?? response.data;
        const cacheKey = '/animais';
        const cachedAnimalsRaw = await cache.getCache(cacheKey);
        const cachedAnimals = Array.isArray(cachedAnimalsRaw)
          ? cachedAnimalsRaw
          : Array.isArray(cachedAnimalsRaw?.animais)
            ? cachedAnimalsRaw.animais
            : Array.isArray(cachedAnimalsRaw?.data)
              ? cachedAnimalsRaw.data
              : [];

        const nextCachedAnimals = [
          ...cachedAnimals.filter((animal: any) => String(animal.id_animal ?? animal.id) !== String(createdAnimal?.id_animal ?? createdAnimal?.id)),
          {
            ...createdAnimal,
            localImageUri: item.localImageUri ?? null,
            pendingSync: false,
            clientTempId: null,
          },
        ];

        await cache.setCache(cacheKey, nextCachedAnimals);
      }

      await removeFromQueue(item.id);
    } catch (e) {
      console.warn('processQueue item failed, keep in queue', item.id, e);
    }
  }
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

export function initQueueListener() {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected || state.isInternetReachable) processQueue();
  });

  return unsubscribe;
}

export default { enqueue, enqueueSerializedRequest, processQueue, initQueueListener, readQueue };
