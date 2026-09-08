import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("infracow.db");

let initialized = false;

/**
 * Cria as tabelas locais se ainda não existirem.
 * Chamado uma vez, no boot do App.tsx.
 *
 * Guardamos o objeto inteiro vindo da API em `dados_json` (ao invés de
 * criar uma coluna pra cada campo) pra não precisar migrar o schema toda
 * vez que um campo novo aparecer nos formulários. Só tiram-se pra colunas
 * de verdade os campos usados em WHERE/índice (id_fazenda, id_animal etc).
 */
export function initDb() {
  if (initialized) return;

  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS fazendas (
      id_fazenda TEXT PRIMARY KEY,
      dados_json TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS animais (
      id_animal TEXT PRIMARY KEY,
      id_fazenda TEXT,
      dados_json TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_animais_fazenda ON animais (id_fazenda);

    CREATE TABLE IF NOT EXISTS medicoes (
      id_medicao TEXT PRIMARY KEY,
      id_animal TEXT,
      temp REAL,
      datahora TEXT,
      dados_json TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_medicoes_animal ON medicoes (id_animal);

    -- Notificações geradas NO CELULAR, direto de cada medição salva local
    -- (offline ou online — não depende mais do endpoint /notificacoes do
    -- servidor). O id é derivado do id_medicao (INSERT OR IGNORE), então
    -- a mesma medição nunca gera duas notificações, mesmo se passar por
    -- aqui duas vezes (ex: salva local na hora E depois volta num pull do
    -- servidor).
    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      id_animal TEXT,
      id_medicao TEXT,
      nome_animal TEXT,
      imagem TEXT,
      temp REAL,
      tipo TEXT,
      mensagem TEXT,
      datahora TEXT,
      lida INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notificacoes_medicao ON notificacoes (id_medicao);

    -- Fila de operações que ainda precisam ser enviadas pro servidor.
    -- method/endpoint/payload_json descrevem exatamente a chamada de API
    -- que precisa ser refeita quando a internet voltar.
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,        -- 'fazenda' | 'animal' | 'medicao'
      local_id TEXT NOT NULL,      -- id local (temporário) do registro
      method TEXT NOT NULL,        -- 'post' | 'put' | 'delete'
      endpoint TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      local_image_uri TEXT,        -- caminho local da foto, se houver
      image_field TEXT,            -- nome do campo esperado no FormData (ex: 'imagem')
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  initialized = true;
}
