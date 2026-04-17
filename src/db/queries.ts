import type { AuditLog, Client, Project, Settings, TimeEntry } from "../validation/schemas";
import { db } from "./schema";

// ─── Column Allowlists (SQL injection prevention) ─────────────────────────────

const SETTINGS_COLUMNS = new Set([
  "company_name",
  "address",
  "postal_code",
  "city",
  "country",
  "email",
  "phone",
  "mobile",
  "bank_name",
  "iban",
  "bic",
  "tax_number",
  "ust_id",
  "vat_rate",
  "payment_days",
  "invoice_prefix",
  "next_invoice_number",
  "kleinunternehmer",
  "invoice_layout_config",
]);

const CLIENT_COLUMNS = new Set([
  "name",
  "address",
  "postal_code",
  "city",
  "country",
  "email",
  "phone",
  "contact_person",
  "vat_id",
  "buyer_reference",
  "notes",
]);

const PROJECT_COLUMNS = new Set([
  "client_id",
  "code",
  "name",
  "daily_rate",
  "start_date",
  "end_date",
  "budget_days",
  "service_description",
  "contract_number",
  "contract_date",
  "notes",
]);

const TIME_ENTRY_COLUMNS = new Set(["project_id", "date", "duration", "description", "billable"]);

// ─── Generic Safe Update Helper (P1-2 + P3-12) ──────────────────────────────

type SQLValue = string | number | bigint | boolean | null | Uint8Array;

function safeUpdate(
  table: string,
  allowedColumns: ReadonlySet<string>,
  data: Record<string, unknown>,
  id: number,
): void {
  const entries = Object.entries(data).filter(([k, v]) => v !== undefined && allowedColumns.has(k));
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as SQLValue);
  db.query(`UPDATE ${table} SET ${fields} WHERE id = ?`).run(...values, id);
}

// ─── Audit Log (P2-6: GoBD compliance) ───────────────────────────────────────

export function appendAuditLog(
  entityType: AuditLog["entity_type"],
  entityId: number,
  action: AuditLog["action"],
  changes: Record<string, unknown> | null,
  source: AuditLog["source"] = "web",
): void {
  db.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, changes, source)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(entityType, entityId, action, changes ? JSON.stringify(changes) : null, source);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function isFirstTimeUser(): boolean {
  const result = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM clients").get();
  return (result?.count ?? 0) === 0;
}

export function getSettings() {
  return db
    .query<Settings, []>(
      `SELECT
        id, company_name, address, postal_code, city, country,
        email, phone, mobile, bank_name, iban, bic, tax_number,
        ust_id, vat_rate, payment_days, invoice_prefix,
        next_invoice_number, kleinunternehmer, invoice_layout_config
       FROM settings WHERE id = 1`,
    )
    .get();
}

export function updateSettings(data: Partial<Settings>): void {
  safeUpdate("settings", SETTINGS_COLUMNS, data as Record<string, unknown>, 1);
}

export function isOnboardingComplete(): boolean {
  const row = db
    .query<{ onboarding_complete: number }, []>(
      "SELECT onboarding_complete FROM settings WHERE id = 1",
    )
    .get();
  if (!row) {
    throw new Error("Settings row (id=1) not found — database may be corrupted");
  }
  return row.onboarding_complete === 1;
}

export function completeOnboarding(): void {
  const result = db.query("UPDATE settings SET onboarding_complete = 1 WHERE id = 1").run();
  if (result.changes === 0) {
    throw new Error("Failed to mark onboarding as complete: settings row not found");
  }
}

// ─── Invoices (overdue count) — re-exported from dashboard-queries ───────────
export { getOverdueInvoiceCount } from "./dashboard-queries";

// ─── Clients ─────────────────────────────────────────────────────────────────

export function getAllActiveClients() {
  return db
    .query<Omit<Client, "created_at" | "archived">, []>(
      `SELECT id, name, address, postal_code, city, country, email, phone, contact_person, vat_id, buyer_reference, notes
       FROM clients WHERE archived = 0 ORDER BY name`,
    )
    .all();
}

export function getClient(id: number) {
  return db
    .query<Client, [number]>(
      `SELECT
        id, name, address, postal_code, city, country,
        email, phone, contact_person, vat_id, buyer_reference,
        notes, created_at, archived
       FROM clients WHERE id = ?`,
    )
    .get(id);
}

export function createClient(
  data: Omit<Client, "id" | "created_at" | "archived">,
): number | undefined {
  const stmt = db.query(
    `INSERT INTO clients
     (name, address, postal_code, city, country, email, phone, contact_person, vat_id, buyer_reference, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  );

  const result = stmt.get(
    data.name,
    data.address ?? "",
    data.postal_code ?? "",
    data.city ?? "",
    data.country ?? "Deutschland",
    data.email ?? "",
    data.phone ?? "",
    data.contact_person ?? "",
    data.vat_id ?? "",
    data.buyer_reference ?? "",
    data.notes ?? "",
  ) as { id: number } | undefined;

  if (result?.id) {
    appendAuditLog("client", result.id, "create", data);
  }

  return result?.id;
}

export function updateClient(
  id: number,
  data: Partial<Omit<Client, "id" | "created_at" | "archived">>,
) {
  safeUpdate("clients", CLIENT_COLUMNS, data as Record<string, unknown>, id);
  appendAuditLog("client", id, "update", data);
}

export function deleteClient(id: number) {
  db.query("UPDATE clients SET archived = 1 WHERE id = ?").run(id);
  appendAuditLog("client", id, "delete", null);
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function getProject(id: number) {
  return db
    .query<Project, [number]>(
      `SELECT
        id, client_id, code, name, daily_rate, start_date, end_date, budget_days,
        service_description, contract_number, contract_date, notes, created_at, archived
       FROM projects WHERE id = ?`,
    )
    .get(id);
}

export function getActiveProjectsForClient(clientId: number) {
  return db
    .query<Omit<Project, "created_at" | "archived">, [number]>(
      `SELECT id, client_id, code, name, daily_rate, start_date, end_date, budget_days,
              service_description, contract_number, contract_date, notes
       FROM projects
       WHERE client_id = ? AND archived = 0
       ORDER BY code`,
    )
    .all(clientId);
}

// JOIN query to avoid N+1 (P2-7)
export interface ProjectWithClient {
  id: number;
  client_id: number;
  client_name: string;
  code: string;
  name: string;
  daily_rate: number;
}

export function getAllActiveProjectsWithClient() {
  return db
    .query<ProjectWithClient, []>(
      `SELECT p.id, p.client_id, c.name as client_name,
              p.code, p.name, p.daily_rate
       FROM projects p
       JOIN clients c ON p.client_id = c.id AND c.archived = 0
       WHERE p.archived = 0
       ORDER BY c.name, p.code`,
    )
    .all();
}

export function createProject(
  data: Omit<Project, "id" | "created_at" | "archived">,
): number | undefined {
  const stmt = db.query(
    `INSERT INTO projects
     (client_id, code, name, daily_rate, start_date, end_date, budget_days, service_description, contract_number, contract_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
  );

  const result = stmt.get(
    data.client_id,
    data.code,
    data.name,
    data.daily_rate,
    data.start_date ?? "",
    data.end_date ?? "",
    data.budget_days ?? 0,
    data.service_description ?? "",
    data.contract_number ?? "",
    data.contract_date ?? "",
    data.notes ?? "",
  ) as { id: number } | undefined;

  if (result?.id) {
    appendAuditLog("project", result.id, "create", data);
  }

  return result?.id;
}

export function updateProject(
  id: number,
  data: Partial<Omit<Project, "id" | "created_at" | "archived">>,
) {
  safeUpdate("projects", PROJECT_COLUMNS, data as Record<string, unknown>, id);
  appendAuditLog("project", id, "update", data);
}

export function deleteProject(id: number) {
  db.query("UPDATE projects SET archived = 1 WHERE id = ?").run(id);
  appendAuditLog("project", id, "delete", null);
}

// ─── Time Entries ────────────────────────────────────────────────────────────

export function getTimeEntry(id: number) {
  return db
    .query<TimeEntry, [number]>(
      `SELECT id, project_id, date, duration, description, billable, invoice_id, created_at
       FROM time_entries WHERE id = ?`,
    )
    .get(id);
}

export function getTimeEntriesForProject(projectId: number) {
  return db
    .query<Omit<TimeEntry, "created_at">, [number]>(
      `SELECT id, project_id, date, duration, description, billable, invoice_id
       FROM time_entries WHERE project_id = ? AND invoice_id IS NULL
       ORDER BY date DESC`,
    )
    .all(projectId);
}

// JOIN query to avoid N+1 (P2-7)
export interface TimeEntryWithContext {
  id: number;
  project_id: number;
  project_name: string;
  client_id: number;
  client_name: string;
  date: string;
  duration: number;
  description: string | null;
  billable: number;
}

export function getAllUnbilledTimeEntries() {
  return db
    .query<TimeEntryWithContext, []>(
      `SELECT
        t.id, t.project_id, p.name as project_name,
        c.id as client_id, c.name as client_name,
        t.date, t.duration, t.description, t.billable
       FROM time_entries t
       JOIN projects p ON t.project_id = p.id AND p.archived = 0
       JOIN clients c ON p.client_id = c.id AND c.archived = 0
       WHERE t.invoice_id IS NULL
       ORDER BY c.name, p.name, t.date DESC`,
    )
    .all();
}

export function createTimeEntry(
  data: Omit<TimeEntry, "id" | "created_at" | "invoice_id">,
): number | undefined {
  const stmt = db.query(
    `INSERT INTO time_entries (project_id, date, duration, description, billable)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id`,
  );

  const result = stmt.get(
    data.project_id,
    data.date,
    data.duration,
    data.description ?? "",
    data.billable ?? 1,
  ) as { id: number } | undefined;

  if (result?.id) {
    appendAuditLog("time_entry", result.id, "create", data);
  }

  return result?.id;
}

export function updateTimeEntry(
  id: number,
  data: Partial<Omit<TimeEntry, "id" | "created_at" | "invoice_id">>,
) {
  safeUpdate("time_entries", TIME_ENTRY_COLUMNS, data as Record<string, unknown>, id);
  appendAuditLog("time_entry", id, "update", data);
}

export function deleteTimeEntry(id: number) {
  db.query("DELETE FROM time_entries WHERE id = ? AND invoice_id IS NULL").run(id);
  appendAuditLog("time_entry", id, "delete", null);
}

// ─── Invoices — re-exported from invoice-queries ────────────────────────────
export {
  createInvoice,
  getAllInvoices,
  getInvoice,
  getInvoiceItems,
  updateInvoiceStatus,
} from "./invoice-queries";
