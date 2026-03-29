import { Database } from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = Bun.env.FREA_DB_PATH || join(import.meta.dir, "../../data/frea.db");

export const db = new Database(DB_PATH, { create: true });

// SQLite performance & safety pragmas
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA busy_timeout = 5000");
db.run("PRAGMA foreign_keys = ON");

export function initializeSchema() {
  // Stammdaten (nur 1 Zeile)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      country TEXT DEFAULT 'Deutschland',
      email TEXT NOT NULL,
      phone TEXT,
      mobile TEXT,
      bank_name TEXT NOT NULL DEFAULT '',
      iban TEXT NOT NULL,
      bic TEXT NOT NULL,
      tax_number TEXT NOT NULL,
      ust_id TEXT,
      vat_rate REAL DEFAULT 0.19,
      payment_days INTEGER DEFAULT 28,
      invoice_prefix TEXT DEFAULT 'RE',
      next_invoice_number INTEGER DEFAULT 1,
      kleinunternehmer INTEGER DEFAULT 0,
      CHECK (id = 1)
    )
  `);

  // Kunden
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      postal_code TEXT,
      city TEXT,
      country TEXT DEFAULT 'Deutschland',
      email TEXT,
      phone TEXT,
      contact_person TEXT,
      vat_id TEXT,
      buyer_reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      archived INTEGER DEFAULT 0
    )
  `);

  // Projekte
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      start_date TEXT,
      end_date TEXT,
      budget_days REAL,
      service_description TEXT,
      contract_number TEXT,
      contract_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      archived INTEGER DEFAULT 0
    )
  `);

  // Zeiteintraege
  db.run(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      date TEXT NOT NULL,
      duration REAL NOT NULL CHECK (duration > 0 AND duration <= 24),
      description TEXT,
      billable INTEGER DEFAULT 1,
      invoice_id INTEGER REFERENCES invoices(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Rechnungen
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      project_id INTEGER NOT NULL REFERENCES projects(id),
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      net_amount REAL NOT NULL,
      vat_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
      pdf_path TEXT,
      po_number TEXT,
      service_period_from TEXT,
      service_period_to TEXT,
      paid_date TEXT,
      reminder_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Rechnungspositionen (MwSt pro Position — nie auf Gesamtsumme berechnen)
  db.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      days REAL NOT NULL,
      daily_rate REAL NOT NULL,
      net_amount REAL NOT NULL,
      vat_rate REAL NOT NULL DEFAULT 0.19,
      vat_amount REAL NOT NULL,
      gross_amount REAL NOT NULL
    )
  `);

  // GoBD Audit Log (append-only, trigger-geschuetzt)
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change')),
      changes TEXT,
      source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'api'))
    )
  `);

  // Performance-Indizes
  db.run("CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_time_entries_invoice ON time_entries(invoice_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)");

  // GoBD: Audit Log ist append-only (keine Aenderungen/Loeschungen erlaubt)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS audit_log_no_update
    BEFORE UPDATE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'GoBD: audit_log records cannot be modified');
    END
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
    BEFORE DELETE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'GoBD: audit_log records cannot be deleted');
    END
  `);

  // Initialize default settings if not present
  const existing = db.query("SELECT id FROM settings WHERE id = 1").get();
  if (!existing) {
    const companyName = Bun.env.COMPANY_NAME || "Mein Unternehmen";
    const email = Bun.env.EMAIL || "info@example.de";
    const iban = Bun.env.IBAN || "DE00000000000000000000";
    const bic = Bun.env.BIC || "TESTDEXX";
    const taxNumber = Bun.env.TAX_NUMBER || "000000000";

    db.run(
      `INSERT INTO settings
       (company_name, email, iban, bic, tax_number, vat_rate, invoice_prefix, payment_days)
       VALUES (?, ?, ?, ?, ?, 0.19, 'RE', 28)`,
      [companyName, email, iban, bic, taxNumber],
    );
  }
}
