import axios from 'axios';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import cache from './cache';
import offlineQueue from './offlineQueue';

const RETRYABLE_AUTH_ENDPOINTS = ['/login', '/usuario'];

const getApiUrl = (): string => {
  const expoConfig: any = (Constants as any).expoConfig ?? (Constants as any).manifest;
  return expoConfig?.extra?.API_URL ?? 'https://infracow-api-hv24.onrender.com';
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 0, // sem limite global — o Render pode demorar para acordar
});

const isDefinitelyOffline = (state: any) =>
  state?.isConnected === false || state?.isInternetReachable === false;

const cacheKeyForConfig = (config: any) => {
  const paramsKey = config?.params ? JSON.stringify(config.params) : '';
  return `${config?.url ?? ''}${paramsKey}`;
};

const isAuthEndpoint = (url?: string) => {
  const normalized = String(url ?? '').trim();
  return RETRYABLE_AUTH_ENDPOINTS.some((endpoint) => normalized.includes(endpoint));
};

const resolveBaseAdapter = () => {
  const candidate = api.defaults.adapter;
  if (typeof candidate === 'function') return candidate;
  if ((axios as any).getAdapter) return (axios as any).getAdapter(candidate);
  throw new Error('Axios base adapter is not available in this runtime.');
};

const baseAdapter = resolveBaseAdapter();

api.defaults.adapter = async (config: any) => {
  const method = String(config?.method ?? 'get').toLowerCase();
  const cacheKey = cacheKeyForConfig(config);

  // ─── FLAG: skipOfflineLogic ───────────────────────────────────────────────
  // Usado pelo processQueue para ir direto na rede sem interceptação offline.
  // Evita re-enfileiramento e loops.
  if (config?.skipOfflineLogic) {
    return baseAdapter(config);
  }

  // ─── GET ──────────────────────────────────────────────────────────────────
  if (method === 'get') {
    const state = await NetInfo.fetch();

    if (isDefinitelyOffline(state)) {
      const cached = await cache.getCache(cacheKey);
      if (cached !== null && cached !== undefined) {
        return buildOfflineResponse(config, cached, 200, true);
      }
      const fallback = await buildFallbackData(config);
      if (fallback !== null) return buildOfflineResponse(config, fallback, 200);
      throw createNetworkError(config, 'Offline and no cached data available.');
    }

    try {
      const response = await baseAdapter(config);
      await cache.setCache(cacheKey, response.data);
      return response;
    } catch (error: any) {
      const cached = await cache.getCache(cacheKey);
      if (cached !== null && cached !== undefined) {
        return buildOfflineResponse(config, cached, 200, true);
      }
      const fallback = await buildFallbackData(config);
      if (fallback !== null) return buildOfflineResponse(config, fallback, 200);
      throw error;
    }
  }

  // ─── POST/PUT/PATCH/DELETE ─────────────────────────────────────────────────
  // Só enfileira aqui se estiver definitivamente offline — evita double-enqueue
  // com o offlineSync.optimisticUpdate que já lida com falhas de rede.
  try {
    const state = await NetInfo.fetch();

    if (isDefinitelyOffline(state) && shouldQueueMutatingRequest(config)) {
      await offlineQueue.enqueueSerializedRequest(config);
      return buildOfflineResponse(config, { offline: true, queued: true }, 202);
    }

    return await baseAdapter(config);

  } catch (error: any) {
    // Não enfileira aqui — o offlineSync.optimisticUpdate cuida disso no catch.
    // Relançar para que o chamador decida o que fazer.
    throw error;
  }
};

function shouldQueueMutatingRequest(config: any) {
  const method = String(config?.method ?? 'get').toLowerCase();
  return method !== 'get' && !isAuthEndpoint(config?.url);
}

async function buildFallbackData(config: any) {
  const url = String(config?.url ?? '');
  const detailMatch = url.match(/\/(fazendas|animais)\/([^/?#]+)/i);

  if (detailMatch) {
    const collectionKey = `/${detailMatch[1].toLowerCase()}`;
    const entityId = detailMatch[2];
    const cachedCollection = await cache.getCache<any[]>(collectionKey);
    const items = Array.isArray(cachedCollection)
      ? cachedCollection
      : Array.isArray((cachedCollection as any)?.data)
        ? (cachedCollection as any).data
        : [];
    const found = items.find(
      (item: any) =>
        String(item?.id_fazenda ?? item?.id_animal ?? item?.id) === String(entityId)
    );
    if (found) {
      return detailMatch[1].toLowerCase() === 'fazendas'
        ? { fazenda: found }
        : { animal: found };
    }
    return detailMatch[1].toLowerCase() === 'fazendas'
      ? { fazenda: null }
      : { animal: null };
  }

  if (url.includes('/fazendas')) return { fazendas: [] };
  if (url.includes('/animais')) return { animais: [] };
  if (url.includes('/medicoes')) return { medicoes: [] };
  if (url.includes('/notificacoes')) return { notificacoes: [] };
  if (url.includes('/perfil')) return { user: null };

  return null;
}

function buildOfflineResponse(config: any, data: any, status = 200, fromCache = false) {
  return {
    data,
    status,
    statusText: status === 202 ? 'Accepted' : fromCache ? 'Cache' : 'OK',
    headers: fromCache ? { 'x-local-cache': '1' } : {},
    config,
    request: { offline: true },
  };
}

function createNetworkError(config: any, message: string) {
  const error: any = new Error(message);
  error.config = config;
  error.isAxiosError = true;
  error.code = 'ERR_NETWORK';
  return error;
}

export default api;

export type { AxiosInstance } from 'axios';
