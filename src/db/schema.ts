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
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_user TEXT,
      smtp_password TEXT,
      smtp_from TEXT,
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

  // Wiederkehrende Rechnungsvorlagen
  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      title TEXT NOT NULL,
      interval TEXT NOT NULL CHECK(interval IN ('monthly', 'quarterly', 'yearly')),
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES recurring_templates(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      vat_rate REAL NOT NULL DEFAULT 19
    )
  `);

  db.run(
    "CREATE INDEX IF NOT EXISTS idx_recurring_templates_client ON recurring_templates(client_id)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_recurring_templates_active_due ON recurring_templates(active, next_due)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_recurring_items_template ON recurring_template_items(template_id)",
  );

  // Migration: make project_id nullable on invoices for template-generated invoices
  // SQLite does not support DROP CONSTRAINT — we check existing rows and skip if already nullable.
  // The simplest safe approach: rebuild the table. But that's a heavy operation.
  // Instead: we check the CREATE TABLE DDL; if project_id is NOT NULL we rebuild.
  // For new databases the schema already has the correct definition.
  try {
    const invoicesDdl = db
      .query<{ sql: string }, []>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'",
      )
      .get();
    if (invoicesDdl?.sql && /project_id\s+INTEGER\s+NOT\s+NULL/.test(invoicesDdl.sql)) {
      // Rebuild invoices table without NOT NULL on project_id (Expand/Contract)
      db.run("PRAGMA foreign_keys = OFF");
      db.run(`CREATE TABLE IF NOT EXISTS invoices_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        project_id INTEGER REFERENCES projects(id),
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
      )`);
      db.run(`INSERT INTO invoices_new SELECT * FROM invoices`);
      db.run("DROP TABLE invoices");
      db.run("ALTER TABLE invoices_new RENAME TO invoices");
      db.run("PRAGMA foreign_keys = ON");
      // Re-create indexes
      db.run("CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date)");
      console.log(
        "[migration] Made project_id nullable on invoices for template-generated invoices",
      );
    }
  } catch (err) {
    console.error("[migration] Failed to migrate invoices.project_id:", err);
    throw new Error("Database migration failed: invoices.project_id nullable", { cause: err });
  }

  // Migration: add onboarding_complete column if not present (safe for existing DBs)
  try {
    const settingsCols = db.query<{ name: string }, []>("PRAGMA table_info(settings)").all();
    if (!settingsCols.some((c) => c.name === "onboarding_complete")) {
      db.run("ALTER TABLE settings ADD COLUMN onboarding_complete INTEGER DEFAULT 0");
      console.log("[migration] Added onboarding_complete column to settings");
    }
    // Migration: add SMTP columns if not present
    if (!settingsCols.some((c) => c.name === "smtp_host")) {
      db.run("ALTER TABLE settings ADD COLUMN smtp_host TEXT");
      db.run("ALTER TABLE settings ADD COLUMN smtp_port INTEGER");
      db.run("ALTER TABLE settings ADD COLUMN smtp_user TEXT");
      db.run("ALTER TABLE settings ADD COLUMN smtp_password TEXT");
      db.run("ALTER TABLE settings ADD COLUMN smtp_from TEXT");
      console.log("[migration] Added SMTP columns to settings");
    }
  } catch (err) {
    console.error("[migration] Failed to add columns to settings:", err);
    throw new Error("Database migration failed: could not add columns to settings", { cause: err });
  }

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
