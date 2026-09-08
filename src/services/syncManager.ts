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
} from "../storage/repository";

const MAX_ATTEMPTS = 5;

let syncing = false;
let listenerStarted = false;

/** Monta o corpo da requisição: FormData se a operação tiver uma imagem local, senão JSON puro. */
async function buildRequestBody(op: OutboxOperation) {
  const payload = JSON.parse(op.payload_json);

  if (!op.local_image_uri) {
    return payload;
  }

  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    form.append(key, String(value));
  });

  const filename = op.local_image_uri.split("/").pop() || "photo.jpg";
  const ext = filename.match(/\.(\w+)$/)?.[1] ?? "jpg";
  form.append(op.image_field ?? "imagem", {
    uri: op.local_image_uri,
    name: filename,
    type: `image/${ext}`,
  } as any);

  return form;
}

/** Processa a fila de operações pendentes, em ordem, uma por vez. */
async function drainOutbox() {
  // Loop com "pegue a próxima pendente" (em vez de carregar a lista inteira uma
  // única vez) porque processar uma operação pode reescrever o payload_json de
  // outra que ainda está na fila (ex: fazenda sincroniza e atualiza o id_fazenda
  // dentro do payload do animal que está logo atrás dela). Reler do banco a cada
  // volta garante que a gente sempre envie o payload mais atual.
  while (true) {
    const pending = getPendingOperations();
    const op = pending[0];
    if (!op) break;

    try {
      const data = await buildRequestBody(op);
      const response = await api.request({
        method: op.method,
        url: op.endpoint,
        data,
        // @ts-ignore — campo custom lido pelo interceptor em api.ts
        silentNetworkError: true,
      });

      // Se criamos um registro novo (POST) que tinha um id local temporário,
      // troca pelo id definitivo que o servidor acabou de gerar. Os ids vêm
      // aninhados na resposta (confirmado nos controllers da API):
      // POST /animais   -> { animal: { id_animal } }
      // POST /fazendas  -> { fazenda: { id_fazenda } }
      // POST /medicoes  -> { medicao: { id_medicao } }
      if (op.method === "post" && op.local_id.startsWith("local_")) {
        if (op.entity === "animal") {
          const serverId = response.data?.animal?.id_animal;
          if (serverId) replaceLocalAnimalId(op.local_id, String(serverId));
        }
        if (op.entity === "fazenda") {
          const serverId = response.data?.fazenda?.id_fazenda;
          if (serverId) replaceLocalFazendaId(op.local_id, String(serverId));
        }
        if (op.entity === "medicao") {
          const serverId = response.data?.medicao?.id_medicao;
          if (serverId) replaceLocalMedicaoId(op.local_id, String(serverId));
        }
      }

      removeOperation(op.id);
    } catch (error: any) {
      const isNetworkError = !error?.response;

      if (isNetworkError) {
        // Sem conexão de verdade (ou servidor fora do ar): para por aqui e
        // tenta de novo na próxima vez que a conexão voltar, preservando a ordem.
        break;
      }

      // O servidor respondeu com erro (ex: dado inválido). Não adianta insistir
      // pra sempre — conta a tentativa e, depois de algumas, desiste dessa operação
      // pra não travar a fila inteira.
      incrementAttempts(op.id);
      if (op.attempts + 1 >= MAX_ATTEMPTS) {
        console.warn("[sync] descartando operação após falhas repetidas:", op.endpoint, error?.response?.data);
        removeOperation(op.id);
      }
    }
  }
}

/**
 * Busca uma lista da API e já normaliza os dois formatos possíveis de resposta:
 * um array vazio quando não há nada, OU um 404 (a API responde assim quando a
 * lista está vazia, ex: "Nenhuma Fazenda Encontrada Para Esse Usuario") — nos
 * dois casos o resultado pra gente é o mesmo: lista vazia, não é erro de verdade.
 */
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
    throw error; // erro de verdade (sem rede, 401, 500...) sobe pra quem chamou tratar
  }
}

/**
 * Baixa o estado atual do servidor e atualiza o espelho local. As três chamadas
 * são independentes (Promise.allSettled): se uma falhar (ex: sem internet no meio
 * do download), as outras duas que deram certo ainda atualizam o cache local.
 */
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

/** Ponto único de sincronização: primeiro envia o que está pendente, depois atualiza o cache local. */
export async function runSync() {
  if (syncing) return;
  syncing = true;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    await drainOutbox();
    await pullFromServer();
  } finally {
    syncing = false;
  }
}

/** Chamar uma vez no boot do app. Sincroniza sempre que a conexão for restabelecida. */
export function startSyncListener() {
  if (listenerStarted) return;
  listenerStarted = true;

  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      runSync();
    }
  });
}
