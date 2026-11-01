import { db } from "./db";
import { generateLocalId } from "./repository";

export type OutboxOperation = {
  id: string;
  entity: "fazenda" | "animal" | "medicao";
  local_id: string;
  method: "post" | "put" | "delete";
  endpoint: string;
  payload_json: string;
  local_image_uri: string | null;
  image_field: string | null;
  attempts: number;
  created_at: string;
};

type EnqueueParams = {
  entity: OutboxOperation["entity"];
  localId: string;
  method: OutboxOperation["method"];
  endpoint: string;
  payload: Record<string, any>;
  localImageUri?: string | null;
  imageField?: string | null;
};


export function enqueueOperation({
  entity,
  localId,
  method,
  endpoint,
  payload,
  localImageUri = null,
  imageField = null,
}: EnqueueParams) {
  const id = generateLocalId("op");
  db.runSync(
    `INSERT INTO outbox (id, entity, local_id, method, endpoint, payload_json, local_image_uri, image_field, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, entity, localId, method, endpoint, JSON.stringify(payload), localImageUri, imageField, new Date().toISOString()]
  );
  return id;
}

export function getPendingOperations(): OutboxOperation[] {
  return db.getAllSync<OutboxOperation>(`SELECT * FROM outbox ORDER BY created_at ASC`);
}

export function removeOperation(id: string) {
  db.runSync(`DELETE FROM outbox WHERE id = ?`, [id]);
}

export function incrementAttempts(id: string) {
  db.runSync(`UPDATE outbox SET attempts = attempts + 1 WHERE id = ?`, [id]);
}


export function removeOperationsByLocalId(localId: string) {
  db.runSync(`DELETE FROM outbox WHERE local_id = ?`, [localId]);
}


export function findPendingCreateOperation(localId: string): OutboxOperation | null {
  return (
    db.getFirstSync<OutboxOperation>(
      `SELECT * FROM outbox WHERE local_id = ? AND method = 'post' ORDER BY created_at ASC LIMIT 1`,
      [localId]
    ) ?? null
  );
}


export function updatePendingCreatePayload(
  localId: string,
  patch: Record<string, any>,
  localImageUri?: string | null,
  imageField?: string | null
): boolean {
  const op = findPendingCreateOperation(localId);
  if (!op) return false;

  const merged = { ...JSON.parse(op.payload_json), ...patch };
  const nextImageUri = localImageUri !== undefined ? localImageUri : op.local_image_uri;
  const nextImageField = localImageUri !== undefined ? (imageField ?? op.image_field ?? "imagem") : op.image_field;

  db.runSync(`UPDATE outbox SET payload_json = ?, local_image_uri = ?, image_field = ? WHERE id = ?`, [
    JSON.stringify(merged),
    nextImageUri,
    nextImageField,
    op.id,
  ]);
  return true;
}

export function countPending(): number {
  const row = db.getFirstSync<{ total: number }>(`SELECT COUNT(*) as total FROM outbox`);
  return row?.total ?? 0;
}
