import { Database } from 'bun:sqlite';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data/frea.db');

export const db = new Database(DB_PATH);

// WAL mode + foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema — all 7 tables
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    address     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    hourly_rate REAL NOT NULL DEFAULT 0,
    budget      REAL NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    date        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    client_id       TEXT NOT NULL REFERENCES clients(id),
    invoice_number  TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'draft',
    issue_date      TEXT NOT NULL,
    due_date        TEXT NOT NULL,
    total_net       REAL NOT NULL DEFAULT 0,
    total_vat       REAL NOT NULL DEFAULT 0,
    total_gross     REAL NOT NULL DEFAULT 0,
    vat_rate        TEXT NOT NULL DEFAULT '19',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id          TEXT PRIMARY KEY,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity    REAL NOT NULL DEFAULT 1,
    unit_price  REAL NOT NULL DEFAULT 0,
    vat_rate    TEXT NOT NULL DEFAULT '19',
    net         REAL NOT NULL DEFAULT 0,
    vat         REAL NOT NULL DEFAULT 0,
    gross       REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dunning_letters (
    id          TEXT PRIMARY KEY,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id),
    level       INTEGER NOT NULL DEFAULT 1,
    status      TEXT NOT NULL DEFAULT 'draft',
    letter_date TEXT NOT NULL,
    due_date    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    action      TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_settings (
    id                TEXT PRIMARY KEY,
    prefix            TEXT NOT NULL DEFAULT 'RE',
    start_number      INTEGER NOT NULL DEFAULT 1,
    default_due_days  INTEGER NOT NULL DEFAULT 14,
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate: add paid_at column if not exists (backward compat)
try {
  db.exec("ALTER TABLE invoices ADD COLUMN paid_at TEXT");
} catch (e: any) {
  // column already exists — ignore
}

// Migrate: ensure invoice_settings has exactly one row
const settingsExists = db.prepare("SELECT COUNT(*) as cnt FROM invoice_settings").get() as any;
if (!settingsExists?.cnt) {
  db.prepare("INSERT INTO invoice_settings (id, prefix, start_number, default_due_days) VALUES (?, ?, ?, ?)").run(
    newId(), 'RE', 1, 14
  );
}

// Audit log helper — append-only
export function auditLog(entityType: string, entityId: string, action: string, payload: unknown) {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO audit_log (id, entity_type, entity_id, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, entityType, entityId, action, JSON.stringify(payload));
}

export function newId(): string {
  return crypto.randomUUID();
}
