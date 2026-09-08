import { db } from "./db";
import { removeOperationsByLocalId } from "./outbox";

/**
 * Gera um id local temporário pra registros criados offline, antes de
 * saber o id definitivo que o servidor vai dar quando sincronizar.
 * Formato reconhecível (prefixo "local_") pra nunca confundir com um id
 * numérico vindo da API.
 */
export function generateLocalId(prefix: string) {
  return `local_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const nowIso = () => new Date().toISOString();

// ---------- Fazendas ----------

export function upsertFazendas(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_fazenda ?? item.id);
    db.runSync(
      `INSERT INTO fazendas (id_fazenda, dados_json, synced, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(id_fazenda) DO UPDATE SET dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, JSON.stringify(item), now]
    );
  }
}

export function getFazendas(): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas ORDER BY updated_at DESC`);
  return rows.map((r) => JSON.parse(r.dados_json));
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

/**
 * Atualiza os dados de uma fazenda já salva local (edição). Funciona tanto
 * pra fazenda sincronizada (id numérico) quanto pra uma criada offline
 * (id "local_...") — quem decide o que fazer com o outbox é a tela.
 */
export function updateFazendaLocally(id: string, patch: Record<string, any>) {
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas WHERE id_fazenda = ?`, [id]);
  if (!row) return null;
  const merged = { ...JSON.parse(row.dados_json), ...patch, id_fazenda: id };
  db.runSync(`UPDATE fazendas SET dados_json = ?, synced = 0, updated_at = ? WHERE id_fazenda = ?`, [
    JSON.stringify(merged),
    nowIso(),
    id,
  ]);
  return merged;
}

/**
 * Remove uma fazenda local, em cascata: todos os seus animais (e, dentro de
 * cada um, as medições/notificações — via deleteAnimalLocally) e qualquer
 * operação pendente no outbox referente a ela (uma criação ou edição que
 * ainda não tinha sincronizado deixa de fazer sentido).
 */
export function deleteFazendaLocally(id: string) {
  const animais = getAnimaisByFazenda(id);
  for (const animal of animais) {
    const animalId = String(animal.id_animal ?? animal.id ?? "");
    if (animalId) deleteAnimalLocally(animalId);
  }
  db.runSync(`DELETE FROM fazendas WHERE id_fazenda = ?`, [id]);
  removeOperationsByLocalId(id);
}

// ---------- Animais ----------

export function upsertAnimais(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_animal ?? item.id);
    const idFazenda = item.id_fazenda != null ? String(item.id_fazenda) : null;
    db.runSync(
      `INSERT INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(id_animal) DO UPDATE SET id_fazenda = excluded.id_fazenda, dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, idFazenda, JSON.stringify(item), now]
    );
  }
}

export function getAnimaisByFazenda(idFazenda: string): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(
    `SELECT dados_json FROM animais WHERE id_fazenda = ? ORDER BY updated_at DESC`,
    [idFazenda]
  );
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function getAllAnimais(): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(`SELECT dados_json FROM animais ORDER BY updated_at DESC`);
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function getAnimalById(id: string): any | null {
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM animais WHERE id_animal = ?`, [id]);
  return row ? JSON.parse(row.dados_json) : null;
}

export function saveAnimalLocally(animal: any, localId: string, idFazenda: string) {
  const now = nowIso();
  db.runSync(
    `INSERT INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(id_animal) DO UPDATE SET id_fazenda = excluded.id_fazenda, dados_json = excluded.dados_json, updated_at = excluded.updated_at`,
    [localId, idFazenda, JSON.stringify({ ...animal, id_animal: localId, id_fazenda: idFazenda }), now]
  );
}

/** Atualiza os dados de um animal já salvo local (edição). Mesma ideia de updateFazendaLocally. */
export function updateAnimalLocally(id: string, patch: Record<string, any>) {
  const row = db.getFirstSync<{ dados_json: string; id_fazenda: string }>(
    `SELECT dados_json, id_fazenda FROM animais WHERE id_animal = ?`,
    [id]
  );
  if (!row) return null;
  const merged = { ...JSON.parse(row.dados_json), ...patch, id_animal: id };
  db.runSync(`UPDATE animais SET dados_json = ?, synced = 0, updated_at = ? WHERE id_animal = ?`, [
    JSON.stringify(merged),
    nowIso(),
    id,
  ]);
  return merged;
}

/**
 * Remove um animal local em cascata: suas medições e notificações, e
 * qualquer operação pendente no outbox referente a ele ou a elas (cancela
 * criações/edições que ainda não tinham sincronizado).
 */
export function deleteAnimalLocally(id: string) {
  const medicoes = getMedicoesByAnimal(id);
  for (const medicao of medicoes) {
    const medicaoId = String(medicao.id_medicao ?? medicao.id ?? "");
    if (medicaoId) removeOperationsByLocalId(medicaoId);
  }
  db.runSync(`DELETE FROM medicoes WHERE id_animal = ?`, [id]);
  db.runSync(`DELETE FROM notificacoes WHERE id_animal = ?`, [id]);
  db.runSync(`DELETE FROM animais WHERE id_animal = ?`, [id]);
  removeOperationsByLocalId(id);
}

/** Troca um id local (temporário) pelo id definitivo do servidor, em todas as tabelas relacionadas. */
export function replaceLocalAnimalId(localId: string, serverId: string) {
  const row = db.getFirstSync<{ dados_json: string; id_fazenda: string }>(
    `SELECT dados_json, id_fazenda FROM animais WHERE id_animal = ?`,
    [localId]
  );
  if (!row) return;
  const dados = { ...JSON.parse(row.dados_json), id_animal: serverId };
  db.execSync("BEGIN TRANSACTION");
  try {
    db.runSync(`DELETE FROM animais WHERE id_animal = ?`, [localId]);
    db.runSync(
      `INSERT INTO animais (id_animal, id_fazenda, dados_json, synced, updated_at) VALUES (?, ?, ?, 1, ?)`,
      [serverId, row.id_fazenda, JSON.stringify(dados), nowIso()]
    );
    db.runSync(`UPDATE medicoes SET id_animal = ? WHERE id_animal = ?`, [serverId, localId]);
    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

/**
 * Mesma ideia do replaceLocalAnimalId, mas para fazendas. É essencial pro caso
 * "criei a fazenda e um animal dela offline, no mesmo dia": o animal fica na fila
 * apontando pro id local da fazenda, e essa função propaga o id definitivo pra
 * ele assim que a fazenda sincroniza (a fila processa em ordem, então a fazenda
 * sempre sincroniza primeiro).
 */
export function replaceLocalFazendaId(localId: string, serverId: string) {
  const row = db.getFirstSync<{ dados_json: string }>(`SELECT dados_json FROM fazendas WHERE id_fazenda = ?`, [
    localId,
  ]);
  if (!row) return;
  const dados = { ...JSON.parse(row.dados_json), id_fazenda: serverId };
  db.execSync("BEGIN TRANSACTION");
  try {
    db.runSync(`DELETE FROM fazendas WHERE id_fazenda = ?`, [localId]);
    db.runSync(`INSERT INTO fazendas (id_fazenda, dados_json, synced, updated_at) VALUES (?, ?, 1, ?)`, [
      serverId,
      JSON.stringify(dados),
      nowIso(),
    ]);
    db.runSync(`UPDATE animais SET id_fazenda = ? WHERE id_fazenda = ?`, [serverId, localId]);
    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

// ---------- Medições ----------

export function upsertMedicoes(list: any[]) {
  const now = nowIso();
  for (const item of list) {
    const id = String(item.id_medicao ?? item.id);
    const idAnimal = item.id_animal != null ? String(item.id_animal) : null;
    db.runSync(
      `INSERT INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id_medicao) DO UPDATE SET dados_json = excluded.dados_json, updated_at = excluded.updated_at, synced = 1`,
      [id, idAnimal, item.temp ?? item.temperatura ?? null, item.datahora ?? null, JSON.stringify(item), now]
    );
    maybeCreateNotification({ ...item, id_medicao: id, id_animal: idAnimal });
  }
}

export function getMedicoesByAnimal(idAnimal: string): any[] {
  const rows = db.getAllSync<{ dados_json: string }>(
    `SELECT dados_json FROM medicoes WHERE id_animal = ? ORDER BY datahora DESC`,
    [idAnimal]
  );
  return rows.map((r) => JSON.parse(r.dados_json));
}

export function saveMedicaoLocally(medicao: any, localId: string) {
  const now = nowIso();
  db.runSync(
    `INSERT INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [
      localId,
      String(medicao.id_animal),
      medicao.temp ?? null,
      medicao.datahora ?? now,
      JSON.stringify({ ...medicao, id_medicao: localId }),
      now,
    ]
  );
  maybeCreateNotification({ ...medicao, id_medicao: localId, id_animal: String(medicao.id_animal) });
}

/**
 * Troca um id local (temporário) de medição pelo id definitivo do servidor.
 * Sem isso, uma medição criada offline ficava com dois registros na tabela
 * `medicoes` depois de sincronizar: o local (id_medicao = "local_...") nunca
 * era removido, e o `pullFromServer` seguinte inseria de novo com o id real
 * vindo da API — linha duplicada.
 *
 * Também atualiza a notificação gerada a partir dela (o id da notificação é
 * derivado do id_medicao, ver maybeCreateNotification), pra não deixar uma
 * notificação órfã apontando pra um id_medicao que não existe mais.
 */
export function replaceLocalMedicaoId(localId: string, serverId: string) {
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
      `INSERT INTO medicoes (id_medicao, id_animal, temp, datahora, dados_json, synced, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [serverId, row.id_animal, dados.temp ?? null, dados.datahora ?? null, JSON.stringify(dados), nowIso()]
    );
    db.runSync(
      `UPDATE notificacoes SET id = ?, id_medicao = ? WHERE id_medicao = ?`,
      [`notif_${serverId}`, serverId, localId]
    );
    db.runSync(`UPDATE outbox SET payload_json = REPLACE(payload_json, ?, ?) WHERE payload_json LIKE ?`, [
      localId,
      serverId,
      `%${localId}%`,
    ]);
    db.execSync("COMMIT");
  } catch (e) {
    db.execSync("ROLLBACK");
    throw e;
  }
}

// ---------- Notificações ----------

// Mesmos limites que o servidor usa (medicoesController.js: perigo = temp <= 34 || temp >= 38.7),
// pra manter a notificação local idêntica à que o servidor geraria.
const TEMP_LIMITE_BAIXO = 34;
const TEMP_LIMITE_ALTO = 38.7;

/**
 * Cria uma notificação local se a temperatura da medição estiver fora da
 * faixa normal. Chamada tanto quando uma medição é salva no aparelho
 * (offline ou online) quanto quando uma medição é baixada do servidor
 * (upsertMedicoes) — assim a lista de notificações fica completa nos dois
 * casos, sem depender do endpoint /notificacoes.
 */
export function maybeCreateNotification(medicao: any) {
  const temp = Number(medicao.temp ?? medicao.temperatura);
  if (Number.isNaN(temp)) return;
  if (temp > TEMP_LIMITE_BAIXO && temp < TEMP_LIMITE_ALTO) return;

  const idMedicao = String(medicao.id_medicao ?? medicao.id ?? "");
  if (!idMedicao) return;

  const idAnimal = medicao.id_animal != null ? String(medicao.id_animal) : "";
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
