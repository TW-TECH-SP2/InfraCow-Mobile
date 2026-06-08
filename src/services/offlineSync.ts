import cache from './cache';
import api from './api';
import { enqueueSerializedRequest } from './offlineQueue';
import offlineQueue from './offlineQueue';

export type OptimisticUpdateOptions = {
  endpoint: string;
  method: 'post' | 'put' | 'delete' | 'patch';
  data: any;
  cacheKey?: string;
  onOptimisticUpdate?: (tempItem: any) => Promise<void>;
  onSuccess?: (response: any) => Promise<void>;
  onError?: (error: any) => void;
  clientTempId?: string;
  formData?: FormData;
};

export async function optimisticUpdate(options: OptimisticUpdateOptions) {
  const {
    endpoint,
    method,
    data,
    cacheKey,
    onOptimisticUpdate,
    onSuccess,
    onError,
    clientTempId = `pending_${Date.now()}`,
    formData,
  } = options;

  // PASSO 1: Salvar local PRIMEIRO, sempre — independente de internet
  console.log(`[OfflineSync] Optimistic update for ${endpoint}`);
  if (onOptimisticUpdate) {
    await onOptimisticUpdate(data);
  }

  // PASSO 2: Tentar sincronizar com a API em background
  try {
    console.log(`[OfflineSync] Attempting ${method.toUpperCase()} ${endpoint}`);

    let response;
    if (formData) {
      response = await api.request({
        method,
        url: endpoint,
        data: formData,
        timeout: 0, // sem limite — o Render pode demorar para acordar
        // NÃO usa skipOfflineLogic aqui — o adapter cuida de enfileirar se estiver offline
      });
    } else {
      response = await api.request({
        method,
        url: endpoint,
        data,
        timeout: 0, // sem limite — o Render pode demorar para acordar
      });
    }

    const queued =
      response?.status === 202 ||
      response?.data?.queued === true ||
      response?.data?.offline === true;

    if (queued) {
      // O adapter já enfileirou (estava offline) — dado local já está salvo
      // Marcar o clientTempId na fila para rastrear depois
      console.log(`[OfflineSync] Queued by adapter for ${endpoint}`);
      return { offline: true, data: null, queued: true };
    }

    // Sucesso real na API — atualizar cache com dados do servidor
    if (cacheKey && response.data) {
      await updateCache(cacheKey, response.data, clientTempId, data);
    }

    if (onSuccess) {
      await onSuccess(response.data);
    }

    console.log(`[OfflineSync] ${method.toUpperCase()} ${endpoint} synced successfully`);

    // Aproveitar a conexão para processar outros itens pendentes
    offlineQueue.processQueue();

    return { offline: false, data: response.data, queued: false };

  } catch (error: any) {
    // QUALQUER falha de rede ou timeout → enfileirar para tentar depois
    // O adapter NÃO enfileirou aqui (só faz isso quando definitivamente offline)
    // então cabe ao offlineSync enfileirar quando há erro de rede real.
    console.warn(`[OfflineSync] API call failed for ${endpoint}, enqueueing:`, error?.message);

    // Só enfileira se for erro de rede/timeout — erros 4xx (validação) não faz sentido
    const isValidationError =
      error?.response?.status >= 400 && error?.response?.status < 500;

    if (!isValidationError) {
      try {
        await enqueueSerializedRequest({
          method: options.method,
          url: options.endpoint,
          data: formData ?? options.data,
          clientTempId: options.clientTempId,
        });
        console.log(`[OfflineSync] Enqueued ${endpoint} for later sync`);
      } catch (queueError) {
        console.error(`[OfflineSync] Failed to enqueue ${endpoint}:`, queueError);
      }
    }

    if (isValidationError && onError) {
      onError(error);
      return { offline: false, data: null, queued: false };
    }

    return { offline: true, data: null, queued: true };
  }
}

async function updateCache(
  cacheKey: string,
  responseData: any,
  clientTempId: string,
  requestData?: any
) {
  try {
    const cachedRaw = await cache.getCache(cacheKey);
    let cachedList = Array.isArray(cachedRaw)
      ? cachedRaw
      : Array.isArray(cachedRaw?.fazendas)
        ? cachedRaw.fazendas
        : Array.isArray(cachedRaw?.animais)
          ? cachedRaw.animais
          : Array.isArray(cachedRaw?.data)
            ? cachedRaw.data
            : [];

    const serverItem = responseData?.fazenda ?? responseData?.animal ?? responseData;
    const serverId = String(
      serverItem?.id_fazenda ?? serverItem?.id_animal ?? serverItem?.id ?? ''
    );
    const localImageUri =
      requestData?._localImageUri ??
      serverItem?.localImageUri ??
      serverItem?.imagem ??
      serverItem?.image ??
      null;
    const filename = requestData?._filename ?? null;
    const mimetype = requestData?._mimetype ?? null;

    cachedList = cachedList.filter((item: any) => {
      const itemId = String(item?.id_fazenda ?? item?.id_animal ?? item?.id ?? '');
      const itemTempId = String(item?.clientTempId ?? '');
      return !(
        itemTempId === clientTempId ||
        (serverId && itemId === serverId)
      );
    });

    cachedList.push({
      ...serverItem,
      localImageUri,
      _filename: filename,
      _mimetype: mimetype,
      pendingSync: false,
      clientTempId: null,
    });

    await cache.setCache(cacheKey, cachedList);
    console.log(`[OfflineSync] Cache updated for ${cacheKey}`);
  } catch (e) {
    console.warn(`[OfflineSync] Failed to update cache for ${cacheKey}`, e);
  }
}

export default { optimisticUpdate };
