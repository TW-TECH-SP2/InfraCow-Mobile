import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("infracow.db");

let initialized = false;

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
    -- a mesma medição nunca gera duas notificações.
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

    -- ===== NOVO =====
    -- Tradução permanente "id local temporário" -> "id definitivo do servidor".
    --
    -- Por que isso existe: quando você cadastra uma fazenda, o app salva ela
    -- na hora com um id tipo "local_fazenda_123" e navega pra tela dela. Se
    -- houver internet, segundos depois o servidor responde com o id real
    -- (ex: "57") — mas a tela de Fazenda / Rebanho / Cadastrar Animal já está
    -- aberta segurando o id ANTIGO nos parâmetros de navegação. Sem essa
    -- tabela, o animal era salvo apontando pra uma fazenda que não existe
    -- mais, sumia das listas e o POST /animais era recusado pelo servidor.
    --
    -- Com o mapa, qualquer id antigo continua valendo pra sempre: o
    -- repository traduz automaticamente antes de ler ou gravar.
    CREATE TABLE IF NOT EXISTS id_map (
      local_id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      entity TEXT,
      created_at TEXT NOT NULL
    );
  `);

  initialized = true;
}