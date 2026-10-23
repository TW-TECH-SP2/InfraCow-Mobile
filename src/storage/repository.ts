import { db } from "./db";
import { removeOperationsByLocalId } from "./outbox";

/**
 * Gera um id local temporário pra registros criados offline, antes de
 * saber o id definitivo que o servidor vai dar quando sincronizar.
 */
export function generateLocalId(prefix: string) {
  return `local_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const nowIso = () => new Date().toISOString();

const isLocalId = (id?: string | null) => typeof id === "string" && id.startsWith("local_");

// ---------------------------------------------------------------------------
// Mapa de ids: local_xxx  ->  id definitivo do servidor
// ---------------------------------------------------------------------------

/** Registra que um id local passou a ser um id definitivo do servidor. */
export function mapLocalId(localId: string, serverId: string, entity?: string) {
  if (!localId || !serverId || localId === serverId) return;
  db.runSync(
    `INSERT INTO id_map (local_id, server_id, entity, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(local_id) DO UPDATE SET server_id = excluded.server_id`,
    [String(localId), String(serverId), entity ?? null, nowIso()]
  );
}

/**
 * Traduz um id (que pode ser antigo/local) pro id válido de hoje.
 * Se não for local, ou se ainda não tiver sincronizado, devolve ele mesmo.
 * É seguro chamar em qualquer lugar — é o que faz telas abertas com um id
 * antigo continuarem funcionando depois que a sincronização acontece.
 */
export function resolveId(id?: string | number | null): string {
  if (id === null || id === undefined) return "";
  let current = String(id).trim();
  if (!current) return "";

  // Segue a cadeia (no máximo 5 saltos, só por segurança contra loop).
  for (let i = 0; i < 5 && isLocalId(current); i++) {
    const row = db.getFirstSync<{ server_id: string }>(`SELECT server_id FROM id_map WHERE local_id = ?`, [current]);
    if (!row?.server_id) break;
    current = String(row.server_id);
  }
  return current;
}

/** Troca todos os ids locais conhecidos dentro de um objeto de payload. */
export function resolveIdsInPayload(payload: Record<string, any>): Record<string, any> {
  const out = { ...payload };
  for (const key of ["id_fazenda", "id_animal", "id_medicao"]) {
    if (out[key] !== undefined && out[key] !== null && String(out[key]).trim() !== "") {
      out[key] = resolveId(out[key]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Imagens: nunca perder a foto escolhida pelo usuário
// ---------------------------------------------------------------------------

/**
 * Junta o registro que veio do servidor com o que já existia no celular,
 * preservando `localImageUri` (o arquivo de foto guardado no aparelho).
 *
 * Sem isso, assim que a fazenda/animal sincronizava, o pull do servidor
 * sobrescrevia o registro local e a foto sumia — o app voltava pra imagem
 * padrão sempre que o celular estivesse sem internet.
 */
function mergeKeepingLocalImage(incoming: any, existingJson?: string | null) {
  if (!existingJson) return incoming;
  try {
    const existing = JSON.parse(existingJson);
    const merged: any = { ...existing, ...incoming };
    if (existing.localImageUri) merged.localImageUri = existing.localImageUri;
    // Se o servidor não devolveu imagem, mantém o que já tínhamos.
    if (!merged.imagem && existing.imagem) merged.imagem = existing.imagem;
    return merged;
  } catch {
    return incoming;
  }
}

// ---------------------------------------------------------------------------
// Fazendas
// ---------------------------------------------------------------------------

export function upsertFazendas(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_fazenda ?? item.id);
    if (!id || id === "undefined") continue;
    const existing = db.getFirstSync<{ dados_json: string }>(
      `SELECT dados_json FROM fazendas WHERE id_fazenda = ?`,
      [id]
    );
    const dados = mergeKeepingLocalImage({ ...item, id_fazenda: id }, existing?.dados_json);
    db.runSync(
      `INSERT INTO fazendas (id_fazenda, dados_json, synced, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(id_fazenda) DO UPDATE SET dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, JSON.stringify(dados), now]
    );
  }
}

export function getFazendas(): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas ORDER BY updated_at DESC`);
  return rows.map((r) => JSON.parse(r.dados_json));
}

/** Busca uma fazenda pelo id — aceitando id antigo/local (resolve sozinho). */
export function getFazendaById(id?: string | number | null): any | null {
  const realId = resolveId(id);
  if (!realId) return null;
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas WHERE id_fazenda = ?`, [realId]);
  return row ? JSON.parse(row.dados_json) : null;
}

export function saveFazendaLocally(fazenda: any, localId: string) {
  const now = nowIso();
  db.runSync(
    `INSERT INTO fazendas (id_fazenda, dados_json, synced, updated_at)
     VALUES (?, ?, 0, ?)
     ON CONFLICT(id_fazenda) DO UPDATE SET dados_json = excluded.dados_json, updated_at = excluded.updated_at`,
    [localId, JSON.stringify({ ...fazenda, id_fazenda: localId }), now]
  );
}

export function updateFazendaLocally(id: string, patch: Record<string, any>) {
  const realId = resolveId(id);
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas WHERE id_fazenda = ?`, [realId]);
  if (!row) return null;
  const merged = { ...JSON.parse(row.dados_json), ...patch, id_fazenda: realId };
  db.runSync(`UPDATE fazendas SET dados_json = ?, synced = 0, updated_at = ? WHERE id_fazenda = ?`, [
    JSON.stringify(merged),
    nowIso(),
    realId,
  ]);
  return merged;
}

export function deleteFazendaLocally(id: string) {
  const realId = resolveId(id);
  const animais = getAnimaisByFazenda(realId);
  for (const animal of animais) {
    const animalId = String(animal.id_animal ?? animal.id ?? "");
    if (animalId) deleteAnimalLocally(animalId);
  }
  db.runSync(`DELETE FROM fazendas WHERE id_fazenda = ?`, [realId]);
  removeOperationsByLocalId(realId);
  removeOperationsByLocalId(String(id));
}

// ---------------------------------------------------------------------------
// Animais
// ---------------------------------------------------------------------------

export function upsertAnimais(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_animal ?? item.id);
    if (!id || id === "undefined") continue;

    const existingRow = db.getFirstSync<{ dados_json: string; id_fazenda: string | null }>(
      `SELECT dados_json, id_fazenda FROM animais WHERE id_animal = ?`,
      [id]
    );

    // Se o servidor não mandar id_fazenda nessa listagem, preserva o que já
    // estava salvo local — senão o animal "perde a fazenda" e some do rebanho
    // e da tela de medição.
    const incomingFarmId =
      item.id_fazenda ?? item.fazenda_id ?? item.fazenda?.id_fazenda ?? item.fazenda?.id ?? null;
    const idFazenda =
      incomingFarmId != null && String(incomingFarmId).trim() !== ""
        ? resolveId(incomingFarmId)
        : existingRow?.id_fazenda ?? null;

    const dados = mergeKeepingLocalImage(
      { ...item, id_animal: id, id_fazenda: idFazenda ?? item.id_fazenda ?? null },
      existingRow?.dados_json
    );

    db.runSync(
      `INSERT INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(id_animal) DO UPDATE SET id_fazenda = excluded.id_fazenda, dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, idFazenda, JSON.stringify(dados), now]
    );
  }
}

/** Animais de uma fazenda — aceita id antigo/local (resolve sozinho). */
export function getAnimaisByFazenda(idFazenda: string): any[] {
  const realId = resolveId(idFazenda);
  if (!realId) return [];

  // Aceita tanto o id atual quanto qualquer id local que já tenha virado ele.
  // Cobre registros gravados antes da tradução existir.
  const aliases = db
    .getAllSync<{ local_id: string }>(`SELECT local_id FROM id_map WHERE server_id = ?`, [realId])
    .map((r) => r.local_id);

  const ids = Array.from(new Set([realId, String(idFazenda), ...aliases])).filter(Boolean);
  const placeholders = ids.map(() => "?").join(",");

  const rows = db.getAllSync<{ dados_json: string }>(
    `SELECT dados_json FROM animais WHERE id_fazenda IN (${placeholders}) ORDER BY updated_at DESC`,
    ids
  );
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function getAllAnimais(): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(`SELECT dados_json FROM animais ORDER BY updated_at DESC`);
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function getAnimalById(id: string): any | null {
  const realId = resolveId(id);
  if (!realId) return null;
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM animais WHERE id_animal = ?`, [realId]);
  return row ? JSON.parse(row.dados_json) : null;
}

export function saveAnimalLocally(animal: any, localId: string, idFazenda: string) {
  const now = nowIso();
  // Traduz o id da fazenda: a tela pode ter sido aberta com um id local que
  // já virou id do servidor enquanto o usuário preenchia o formulário.
  const realFarmId = resolveId(idFazenda);
  db.runSync(
    `INSERT INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(id_animal) DO UPDATE SET id_fazenda = excluded.id_fazenda, dados_json = excluded.dados_json, updated_at = excluded.updated_at`,
    [localId, realFarmId, JSON.stringify({ ...animal, id_animal: localId, id_fazenda: realFarmId }), now]
  );
}

export function updateAnimalLocally(id: string, patch: Record<string, any>) {
  const realId = resolveId(id);
  const row = db.getFirstSync<{ dados_json: string; id_fazenda: string }>(
    `SELECT dados_json, id_fazenda FROM animais WHERE id_animal = ?`,
    [realId]
  );
  if (!row) return null;
  const merged = { ...JSON.parse(row.dados_json), ...patch, id_animal: realId };
  db.runSync(`UPDATE animais SET dados_json = ?, synced = 0, updated_at = ? WHERE id_animal = ?`, [
    JSON.stringify(merged),
    nowIso(),
    realId,
  ]);
  return merged;
}

export function deleteAnimalLocally(id: string) {
  const realId = resolveId(id);
  const medicoes = getMedicoesByAnimal(realId);
  for (const medicao of medicoes) {
    const medicaoId = String(medicao.id_medicao ?? medicao.id ?? "");
    if (medicaoId) removeOperationsByLocalId(medicaoId);
  }
  db.runSync(`DELETE FROM medicoes WHERE id_animal = ?`, [realId]);
  db.runSync(`DELETE FROM notificacoes WHERE id_animal = ?`, [realId]);
  db.runSync(`DELETE FROM animais WHERE id_animal = ?`, [realId]);
  removeOperationsByLocalId(realId);
  removeOperationsByLocalId(String(id));
}

/**
 * Troca um id local (temporário) pelo id definitivo do servidor, em todas as
 * tabelas relacionadas — e registra a tradução no id_map, pra que telas já
 * abertas segurando o id antigo continuem funcionando.
 */
export function replaceLocalAnimalId(localId: string, serverId: string) {
  if (!localId || !serverId || localId === serverId) return;
  const row = db.getFirstSync<{ dados_json: string; id_fazenda: string }>(
    `SELECT dados_json, id_fazenda FROM animais WHERE id_animal = ?`,
    [localId]
  );

  db.execSync("BEGIN TRANSACTION");
  try {
    if (row) {
      const dados = { ...JSON.parse(row.dados_json), id_animal: serverId };
      db.runSync(`DELETE FROM animais WHERE id_animal = ?`, [localId]);
      db.runSync(`INSERT OR REPLACE INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at) VALUES (?, ?, ?, 1, ?)`, [
        serverId,
        row.id_fazenda,
        JSON.stringify(dados),
        nowIso(),
      ]);
    }

    // Medições e notificações que apontavam pro id antigo.
    db.runSync(`UPDATE medicoes SET id_animal = ? WHERE id_animal = ?`, [serverId, localId]);
    db.runSync(
      `UPDATE medicoes SET dados_json = REPLACE(dados_json, ?, ?) WHERE id_animal = ? AND dados_json LIKE ?`,
      [localId, serverId, serverId, `%${localId}%`]
    );
    db.runSync(`UPDATE notificacoes SET id_animal = ? WHERE id_animal = ?`, [serverId, localId]);

    // Operações ainda na fila que carregam o id antigo no corpo/endpoint.
    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.runSync(`UPDATE outbox SET endpoint = REPLACE(endpoint, ?, ?) WHERE endpoint LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);

    db.runSync(
      `INSERT INTO id_map (local_id, server_id, entity, created_at) VALUES (?, ?, 'animal', ?)
       ON CONFLICT(local_id) DO UPDATE SET server_id = excluded.server_id`,
      [localId, serverId, nowIso()]
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

/**
 * Mesma ideia, para fazendas. Essencial pro caso "cadastrei a fazenda e logo
 * em seguida um animal dela": propaga o id definitivo pros animais (coluna E
 * dentro do dados_json — faltava o dados_json antes, e era por isso que o
 * animal sumia da lista da fazenda depois de sincronizar).
 */
export function replaceLocalFazendaId(localId: string, serverId: string) {
  if (!localId || !serverId || localId === serverId) return;
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas WHERE id_fazenda = ?`, [localId]);

  db.execSync("BEGIN TRANSACTION");
  try {
    if (row) {
      const dados = { ...JSON.parse(row.dados_json), id_fazenda: serverId };
      db.runSync(`DELETE FROM fazendas WHERE id_fazenda = ?`, [localId]);
      db.runSync(`INSERT OR REPLACE INTO fazendas (id_fazenda, dados_json, synced, updated_at) VALUES (?, ?, 1, ?)`, [
        serverId,
        JSON.stringify(dados),
        nowIso(),
      ]);
    }

    db.runSync(`UPDATE animais SET id_fazenda = ? WHERE id_fazenda = ?`, [serverId, localId]);
    db.runSync(
      `UPDATE animais SET dados_json = REPLACE(dados_json, ?, ?) WHERE id_fazenda = ? AND dados_json LIKE ?`,
      [localId, serverId, serverId, `%${localId}%`]
    );

    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.runSync(`UPDATE outbox SET endpoint = REPLACE(endpoint, ?, ?) WHERE endpoint LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);

    db.runSync(
      `INSERT INTO id_map (local_id, server_id, entity, created_at) VALUES (?, ?, 'fazenda', ?)
       ON CONFLICT(local_id) DO UPDATE SET server_id = excluded.server_id`,
      [localId, serverId, nowIso()]
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Medições
// ---------------------------------------------------------------------------

export function upsertMedicoes(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_medicao ?? item.id);
    if (!id || id === "undefined") continue;
    const idAnimal = item.id_animal != null ? resolveId(item.id_animal) : null;
    db.runSync(
      `INSERT INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id_medicao) DO UPDATE SET id_animal = excluded.id_animal, dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, idAnimal, item.temp ?? item.temperatura ?? null, item.datahora ?? null, JSON.stringify(item), now]
    );
    maybeCreateNotification({ ...item, id_medicao: id, id_animal: idAnimal });
  }
}

export function getMedicoesByAnimal(idAnimal: string): any[] {
  const realId = resolveId(idAnimal);
  if (!realId) return [];
  const aliases = db
    .getAllSync<{ local_id: string }>(`SELECT local_id FROM id_map WHERE server_id = ?`, [realId])
    .map((r) => r.local_id);
  const ids = Array.from(new Set([realId, String(idAnimal), ...aliases])).filter(Boolean);
  const placeholders = ids.map(() => "?").join(",");

  const rows = db.getAllSync<{ dados_json: string }>(
    `SELECT dados_json FROM medicoes WHERE id_animal IN (${placeholders}) ORDER BY datahora DESC`,
    ids
  );
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function saveMedicaoLocally(medicao: any, localId: string) {
  const now = nowIso();
  const idAnimal = resolveId(medicao.id_animal);
  db.runSync(
    `INSERT INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      localId,
      idAnimal,
      medicao.temp ?? null,
      medicao.datahora ?? now,
      JSON.stringify({ ...medicao, id_medicao: localId, id_animal: idAnimal }),
      now,
    ]
  );
  maybeCreateNotification({ ...medicao, id_medicao: localId, id_animal: idAnimal });
}

export function replaceLocalMedicaoId(localId: string, serverId: string) {
  if (!localId || !serverId || localId === serverId) return;
  const row = db.getFirstSync<{ dados_json: string; id_animal: string }>(
    `SELECT dados_json, id_animal FROM medicoes WHERE id_medicao = ?`,
    [localId]
  );
  if (!row) return;
  const dados = { ...JSON.parse(row.dados_json), id_medicao: serverId };
  db.execSync("BEGIN TRANSACTION");
  try {
    db.runSync(`DELETE FROM medicoes WHERE id_medicao = ?`, [localId]);
    db.runSync(
      `INSERT OR REPLACE INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [serverId, row.id_animal, dados.temp ?? null, dados.datahora ?? null, JSON.stringify(dados), nowIso()]
    );
    db.runSync(`UPDATE OR IGNORE notificacoes SET id = ?, id_medicao = ? WHERE id_medicao = ?`, [
      `notif_${serverId}`,
      serverId,
      localId,
    ]);
    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.runSync(
      `INSERT INTO id_map (local_id, server_id, entity, created_at) VALUES (?, ?, 'medicao', ?)
       ON CONFLICT(local_id) DO UPDATE SET server_id = excluded.server_id`,
      [localId, serverId, nowIso()]
    );
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

const TEMP_LIMITE_BAIXO = 34;
const TEMP_LIMITE_ALTO = 38.7;

export function maybeCreateNotification(medicao: any) {
  const temp = Number(medicao.temp ?? medicao.temperatura);
  if (Number.isNaN(temp)) return;
  if (temp > TEMP_LIMITE_BAIXO && temp < TEMP_LIMITE_ALTO) return;

  const idMedicao = String(medicao.id_medicao ?? medicao.id ?? "");
  if (!idMedicao) return;

  const idAnimal = medicao.id_animal != null ? resolveId(medicao.id_animal) : "";
  const animal = idAnimal ? getAnimalById(idAnimal) : null;
  const tipo = temp <= TEMP_LIMITE_BAIXO ? "low" : "high";
  const mensagem =
    tipo === "low"
      ? "Apresentou HIPOTERMIA em sua última medição! Procure um veterinário!"
      : "Apresentou hipertermia (febre) em sua última medição! Procure um veterinário!";

  db.runSync(
    `INSERT OR IGNORE INTO notificacoes (id, id_animal, id_medicao, nome_animal, imagem, temp, tipo, mensagem, datahora, lida, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      `notif_${idMedicao}`,
      idAnimal,
      idMedicao,
      animal?.nome_animal ?? animal?.nome ?? "Animal",
      animal?.localImageUri ?? animal?.imagem ?? null,
      temp,
      tipo,
      mensagem,
      medicao.datahora ?? nowIso(),
      nowIso(),
    ]
  );
}

export function getNotifications(): any[] {
  return db.getAllSync<any>(`SELECT * FROM notificacoes ORDER BY datahora DESC`);
}

export function deleteNotification(id: string) {
  db.runSync(`DELETE FROM notificacoes WHERE id = ?`, [id]);
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Apaga TUDO que está salvo no aparelho. Só é chamado quando o usuário clica
 * em "Sair" de propósito (auth.signOut) — nunca por perda de conexão, nunca
 * por erro do servidor, nunca ao fechar o app. Existe pra que o próximo
 * usuário que logar nesse celular não veja o rebanho do anterior.
 */
export function clearLocalData() {
  db.execSync(`
    DELETE FROM outbox;
    DELETE FROM notificacoes;
    DELETE FROM medicoes;
    DELETE FROM animais;
    DELETE FROM fazendas;
    DELETE FROM id_map;
  `);
}