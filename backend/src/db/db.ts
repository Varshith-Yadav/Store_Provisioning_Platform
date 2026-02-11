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
    ready_at TEXT
  )
`);

const requiredColumns: Record<string, string> = {
  store_url: "TEXT",
  admin_url: "TEXT",
  error_reason: "TEXT",
  created_at: "TEXT",
  updated_at: "TEXT",
  ready_at: "TEXT"
};

const existingColumns = new Set(
  db.prepare(`PRAGMA table_info(stores)`).all().map((col: any) => col.name)
);

for (const [column, type] of Object.entries(requiredColumns)) {
  if (!existingColumns.has(column)) {
    db.exec(`ALTER TABLE stores ADD COLUMN ${column} ${type}`);
  }
}
