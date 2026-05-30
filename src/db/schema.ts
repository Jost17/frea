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

  // Ausgaben (Expense Tracking — FREA-262)
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      vat_rate REAL NOT NULL DEFAULT 0.19,
      vat_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Büro','Software','Hardware','Fahrt','Kommunikation','Marketing','Sonstiges')),
      description TEXT NOT NULL,
      vendor TEXT NOT NULL DEFAULT '',
      receipt_path TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)");

  // SEO pages (FREA-93) — programmatic SEO landing pages
  db.run(`
    CREATE TABLE IF NOT EXISTS seo_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      content_html TEXT NOT NULL,
      keyword TEXT NOT NULL DEFAULT '',
      page_type TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'P2',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_seo_pages_slug ON seo_pages(slug)");

  // Live-Timer (FREA-264) — transient sessions, not GoBD-relevant (no audit log)
  db.run(`
    CREATE TABLE IF NOT EXISTS active_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      description TEXT NOT NULL DEFAULT ''
    )
  `);

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

  // ViDA-Readiness Scaffold (FREA-246) — Future-Proofing 2030/2035
  // All columns are nullable/additive; no user-facing functionality today.
  // EN 16931 field references included for future implementors.
  try {
    const settingsCols2 = db.query<{ name: string }, []>("PRAGMA table_info(settings)").all();
    const settingsNames = settingsCols2.map((c) => c.name);
    // BT-34 / BT-35: Seller electronic address + scheme (Peppol routing)
    if (!settingsNames.includes("peppol_id")) {
      db.run("ALTER TABLE settings ADD COLUMN peppol_id TEXT");
    }
    if (!settingsNames.includes("electronic_address_scheme")) {
      db.run("ALTER TABLE settings ADD COLUMN electronic_address_scheme TEXT");
    }
    console.log("[migration] ViDA: settings columns ensured");
  } catch (err) {
    console.error("[migration] ViDA: Failed to add settings columns:", err);
    throw new Error("Database migration failed: ViDA settings columns", { cause: err });
  }

  try {
    const clientCols = db.query<{ name: string }, []>("PRAGMA table_info(clients)").all();
    const clientNames = clientCols.map((c) => c.name);
    // BT-49 / BT-50: Buyer electronic address + scheme (Peppol routing)
    if (!clientNames.includes("peppol_id")) {
      db.run("ALTER TABLE clients ADD COLUMN peppol_id TEXT");
    }
    if (!clientNames.includes("electronic_address_scheme")) {
      db.run("ALTER TABLE clients ADD COLUMN electronic_address_scheme TEXT");
    }
    console.log("[migration] ViDA: clients columns ensured");
  } catch (err) {
    console.error("[migration] ViDA: Failed to add clients columns:", err);
    throw new Error("Database migration failed: ViDA clients columns", { cause: err });
  }

  try {
    const invoiceCols = db.query<{ name: string }, []>("PRAGMA table_info(invoices)").all();
    const invoiceNames = invoiceCols.map((c) => c.name);
    // BT-3: Invoice type code (380=Commercial Invoice, 381=Credit Note, 384=Corrected Invoice)
    if (!invoiceNames.includes("document_type_code")) {
      db.run("ALTER TABLE invoices ADD COLUMN document_type_code TEXT DEFAULT '380'");
    }
    // BT-25 / BT-26: Preceding invoice reference (for credit notes / corrections)
    if (!invoiceNames.includes("preceding_invoice_ref")) {
      db.run("ALTER TABLE invoices ADD COLUMN preceding_invoice_ref TEXT");
    }
    if (!invoiceNames.includes("preceding_invoice_date")) {
      db.run("ALTER TABLE invoices ADD COLUMN preceding_invoice_date TEXT");
    }
    // BG-13: Delivery information
    if (!invoiceNames.includes("delivery_name")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_name TEXT");
    }
    if (!invoiceNames.includes("delivery_address")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_address TEXT");
    }
    if (!invoiceNames.includes("delivery_postal_code")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_postal_code TEXT");
    }
    if (!invoiceNames.includes("delivery_city")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_city TEXT");
    }
    if (!invoiceNames.includes("delivery_country")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_country TEXT");
    }
    // BT-72: Actual delivery date
    if (!invoiceNames.includes("delivery_date")) {
      db.run("ALTER TABLE invoices ADD COLUMN delivery_date TEXT");
    }
    // BT-7: Tax point date (Leistungsdatum if different from invoice date)
    if (!invoiceNames.includes("tax_point_date")) {
      db.run("ALTER TABLE invoices ADD COLUMN tax_point_date TEXT");
    }
    console.log("[migration] ViDA: invoices columns ensured");
  } catch (err) {
    console.error("[migration] ViDA: Failed to add invoices columns:", err);
    throw new Error("Database migration failed: ViDA invoices columns", { cause: err });
  }

  try {
    const itemCols = db.query<{ name: string }, []>("PRAGMA table_info(invoice_items)").all();
    const itemNames = itemCols.map((c) => c.name);
    // BT-130: Invoiced quantity unit of measure (UN/ECE rec 20: DAY, HUR, C62=piece, MTK=m²)
    if (!itemNames.includes("unit_code")) {
      db.run("ALTER TABLE invoice_items ADD COLUMN unit_code TEXT DEFAULT 'DAY'");
    }
    // BT-151: Item VAT category code (S=Standard, Z=Zero-rated, E=Exempt, K=Reverse charge)
    if (!itemNames.includes("tax_category_code")) {
      db.run("ALTER TABLE invoice_items ADD COLUMN tax_category_code TEXT DEFAULT 'S'");
    }
    // BT-120 / BT-121: Tax exemption reason text + VATEX code (required when not S)
    if (!itemNames.includes("tax_exemption_reason")) {
      db.run("ALTER TABLE invoice_items ADD COLUMN tax_exemption_reason TEXT");
    }
    if (!itemNames.includes("tax_exemption_reason_code")) {
      db.run("ALTER TABLE invoice_items ADD COLUMN tax_exemption_reason_code TEXT");
    }
    console.log("[migration] ViDA: invoice_items columns ensured");
  } catch (err) {
    console.error("[migration] ViDA: Failed to add invoice_items columns:", err);
    throw new Error("Database migration failed: ViDA invoice_items columns", { cause: err });
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
