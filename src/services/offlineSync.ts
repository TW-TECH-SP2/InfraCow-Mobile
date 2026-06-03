import cache from './cache';
import api from './api';
import { enqueueSerializedRequest } from './offlineQueue';

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
  // Qualquer falha → enfileira para sync posterior (não apaga o dado local)
  try {
    console.log(`[OfflineSync] Attempting ${method.toUpperCase()} ${endpoint}`);

    let response;
    if (formData) {
      response = await api.request({
        method,
        url: endpoint,
        data: formData,
        timeout: 60000,
      });
    } else {
      response = await api.request({
        method,
        url: endpoint,
        data,
      });
    }

    const queued =
      response?.status === 202 ||
      response?.data?.queued === true ||
      response?.data?.offline === true;

    if (queued) {
      // O adapter já enfileirou (estava offline) — dado local já está salvo
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
    return { offline: false, data: response.data, queued: false };

  } catch (error: any) {
    // QUALQUER falha (timeout, 5xx, network error, etc.) → enfileirar
    // O dado já está salvo localmente no passo 1, então o usuário não perde nada
    console.warn(`[OfflineSync] API call failed for ${endpoint}, enqueueing:`, error?.message);

    try {
      if (formData) {
        await enqueueSerializedRequest({
          method: options.method,
          url: options.endpoint,
          data: formData,
          clientTempId: options.clientTempId,
        });
      } else {
        await enqueueSerializedRequest({
          method: options.method,
          url: options.endpoint,
          data: options.data,
          clientTempId: options.clientTempId,
        });
      }
      console.log(`[OfflineSync] Enqueued ${endpoint} for later sync`);
    } catch (queueError) {
      console.error(`[OfflineSync] Failed to enqueue ${endpoint}:`, queueError);
    }

    // Não chamar onError aqui — o item está salvo local e na fila.
    // Chamar onError causaria um Alert de "erro" mesmo o usuário tendo
    // cadastrado com sucesso (aparece na tela, vai sincronizar depois).
    // Só chamar onError se for um erro de validação da API (4xx com response).
    const isValidationError =
      error?.response?.status >= 400 && error?.response?.status < 500;

    if (isValidationError && onError) {
      onError(error);
      return { offline: false, data: null, queued: false };
    }

    return { offline: true, data: null, queued: true };
  }
}

/**
 * Atualiza cache substituindo o item pendente (clientTempId) pelo item real do servidor
 */
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

    // Remover o item pendente (clientTempId) e qualquer duplicata do servidor
    cachedList = cachedList.filter((item: any) => {
      const itemId = String(item?.id_fazenda ?? item?.id_animal ?? item?.id ?? '');
      const itemTempId = String(item?.clientTempId ?? '');
      return !(
        itemTempId === clientTempId ||
        (serverId && itemId === serverId)
      );
    });

    // Adicionar item real do servidor (sem pendingSync)
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
