import Database from 'better-sqlite3';
export const db: Database.Database = new Database('platform.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT,
    engine TEXT,
    namespace TEXT,
    status TEXT,
    store_url TEXT,
    admin_url TEXT,
    error_reason TEXT,
    created_at TEXT,
    updated_at TEXT,
    ready_at TIMESTAMP 
  )
`);