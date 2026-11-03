import NetInfo from "@react-native-community/netinfo";
import api from "./api";
import {
  getPendingOperations,
  removeOperation,
  incrementAttempts,
  OutboxOperation,
} from "../storage/outbox";
import {
  upsertFazendas,
  upsertAnimais,
  upsertMedicoes,
  replaceLocalAnimalId,
  replaceLocalFazendaId,
  replaceLocalMedicaoId,
  resolveId,
  resolveIdsInPayload,
} from "../storage/repository";

const MAX_ATTEMPTS = 5;

let syncing = false;
let listenerStarted = false;


const usesMultipart = (op: OutboxOperation) =>
  (op.entity === "fazenda" || op.entity === "animal") && op.method !== "delete";


function buildRequestBody(op: OutboxOperation) {


  const payload = resolveIdsInPayload(JSON.parse(op.payload_json));

  if (op.method === "delete") return undefined;

  if (!usesMultipart(op)) return payload;

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    form.append(key, String(value));
  });

  if (op.local_image_uri) {
    const filename = op.local_image_uri.split("/").pop() || "photo.jpg";
    const ext = filename.match(/\.(\w+)$/)?.[1] ?? "jpg";
    form.append(op.image_field ?? "imagem", {
      uri: op.local_image_uri,
      name: filename,
      type: `image/${ext.toLowerCase() === "jpg" ? "jpeg" : ext}`,
    } as any);
  }

  return form;
}


function resolveEndpoint(endpoint: string) {
  return endpoint.replace(/local_[A-Za-z]+_\d+_[a-z0-9]+/g, (match) => resolveId(match) || match);
}


function extractServerId(data: any, entityKey: string, idKey: string): string | null {
  const candidates = [
    data?.[entityKey]?.[idKey],
    data?.[entityKey]?.id,
    data?.[idKey],
    data?.id,
    data?.data?.[entityKey]?.[idKey],
    data?.data?.[idKey],
  ];
  for (const value of candidates) {
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return null;
}


async function drainOutbox() {



  let guard = 0;
  while (guard++ < 200) {
    const pending = getPendingOperations();
    const op = pending[0];
    if (!op) break;

    try {
      const data = buildRequestBody(op);
      const response = await api.request({
        method: op.method,
        url: resolveEndpoint(op.endpoint),
        data,
        headers: usesMultipart(op) ? { "Content-Type": "multipart/form-data" } : undefined,
        // @ts-ignore — campo custom lido pelo interceptor em api.ts
        silentNetworkError: true,
      });

      if (op.method === "post" && op.local_id.startsWith("local_")) {
        if (op.entity === "animal") {
          const serverId = extractServerId(response.data, "animal", "id_animal");
          if (serverId) replaceLocalAnimalId(op.local_id, serverId);
        }
        if (op.entity === "fazenda") {
          const serverId = extractServerId(response.data, "fazenda", "id_fazenda");
          if (serverId) replaceLocalFazendaId(op.local_id, serverId);
        }
        if (op.entity === "medicao") {
          const serverId = extractServerId(response.data, "medicao", "id_medicao");
          if (serverId) replaceLocalMedicaoId(op.local_id, serverId);
        }
      }

      removeOperation(op.id);
    } catch (error: any) {
      const isNetworkError = !error?.response;

      if (isNetworkError) {


        break;
      }

      console.warn(
        "[sync] falha ao enviar",
        op.entity,
        op.method,
        op.endpoint,
        error?.response?.status,
        JSON.stringify(error?.response?.data ?? {})
      );

      incrementAttempts(op.id);
      if (op.attempts + 1 >= MAX_ATTEMPTS) {
        console.warn("[sync] descartando operação após falhas repetidas:", op.endpoint);
        removeOperation(op.id);
      } else {


        break;
      }
    }
  }
}

async function fetchListSafe(endpoint: string, key: string): Promise<any[]> {
  try {
    // @ts-ignore — campo custom lido pelo interceptor em api.ts
    const res = await api.get(endpoint, { silentNetworkError: true });
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    return [];
  } catch (error: any) {
    if (error?.response?.status === 404) return [];
    throw error;
  }
}

async function pullFromServer() {
  const [fazendasResult, animaisResult, medicoesResult] = await Promise.allSettled([
    fetchListSafe("/fazendas", "fazendas"),
    fetchListSafe("/animais", "animais"),
    fetchListSafe("/medicoes", "medicoes"),
  ]);

  if (fazendasResult.status === "fulfilled") upsertFazendas(fazendasResult.value);
  if (animaisResult.status === "fulfilled") upsertAnimais(animaisResult.value);
  if (medicoesResult.status === "fulfilled") upsertMedicoes(medicoesResult.value);
}


export async function runSync() {
  if (syncing) return;
  syncing = true;
  try {
    const net = await NetInfo.fetch();


    if (!net.isConnected || net.isInternetReachable === false) return;

    await drainOutbox();
    await pullFromServer();
  } catch (e) {
    console.warn("[sync] erro na sincronização:", e);
  } finally {
    syncing = false;
  }
}


export function startSyncListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      runSync();
    }
  });
}