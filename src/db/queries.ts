import type {
  AuditLog,
  Client,
  Invoice,
  InvoiceCreate,
  InvoiceItem,
  Project,
  Settings,
  TimeEntry,
} from "../validation/schemas";
import { AppError } from "../middleware/error-handler";
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

export function getSettings() {
  return db
    .query<Settings, []>(
      `SELECT
        id, company_name, address, postal_code, city, country,
        email, phone, mobile, bank_name, iban, bic, tax_number,
        ust_id, vat_rate, payment_days, invoice_prefix,
        next_invoice_number, kleinunternehmer
       FROM settings WHERE id = 1`,
    )
    .get();
}

export function updateSettings(data: Partial<Settings>): void {
  safeUpdate("settings", SETTINGS_COLUMNS, data as Record<string, unknown>, 1);
}

// ─── Invoices (overdue count) ────────────────────────────────────────────────

export function getOverdueInvoiceCount(): number {
  const result = db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM invoices
       WHERE status IN ('draft', 'sent')
       AND due_date < date('now')`,
    )
    .get();
  return result?.count ?? 0;
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────

export interface DashboardStats {
  open_invoices_count: number;
  open_invoices_sum: number;
  revenue_current_month: number;
  active_clients_count: number;
  active_projects_count: number;
  overdue_invoices_count: number;
}

export function getDashboardStats(): DashboardStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const result = db.query<{
    open_invoices_count: number;
    open_invoices_sum: number;
    revenue_current_month: number;
    active_clients_count: number;
    active_projects_count: number;
    overdue_invoices_count: number;
  }, []>(
    `WITH open_invoices AS (
       SELECT COUNT(*) as count, COALESCE(SUM(gross_amount), 0) as sum
       FROM invoices WHERE status IN ('draft', 'sent')
     ),
     overdue_invoices AS (
       SELECT COUNT(*) as count
       FROM invoices
       WHERE status IN ('draft', 'sent')
       AND due_date < date('now')
     ),
     revenue_month AS (
       SELECT COALESCE(SUM(gross_amount), 0) as sum
       FROM invoices
       WHERE status IN ('sent', 'paid')
       AND strftime('%Y', invoice_date) = ?
       AND CAST(strftime('%m', invoice_date) AS INTEGER) = ?
     ),
     active_clients AS (
       SELECT COUNT(*) as count FROM clients WHERE archived = 0
     ),
     active_projects AS (
       SELECT COUNT(*) as count FROM projects WHERE archived = 0
     )
     SELECT
       (SELECT count FROM open_invoices) as open_invoices_count,
       (SELECT sum FROM open_invoices) as open_invoices_sum,
       (SELECT sum FROM revenue_month) as revenue_current_month,
       (SELECT count FROM active_clients) as active_clients_count,
       (SELECT count FROM active_projects) as active_projects_count,
       (SELECT count FROM overdue_invoices) as overdue_invoices_count`,
  ).get(currentYear.toString(), currentMonth);

  if (!result) {
    return {
      open_invoices_count: 0,
      open_invoices_sum: 0,
      revenue_current_month: 0,
      active_clients_count: 0,
      active_projects_count: 0,
      overdue_invoices_count: 0,
    };
  }

  return {
    open_invoices_count: result.open_invoices_count ?? 0,
    open_invoices_sum: result.open_invoices_sum ?? 0,
    revenue_current_month: result.revenue_current_month ?? 0,
    active_clients_count: result.active_clients_count ?? 0,
    active_projects_count: result.active_projects_count ?? 0,
    overdue_invoices_count: result.overdue_invoices_count ?? 0,
  };
}

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

// ─── Invoices ────────────────────────────────────────────────────────────────

function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createInvoice(
  data: InvoiceCreate,
  timeEntries: TimeEntry[],
  settings: Settings,
): number {
  // Wrapped in transaction for atomicity (P1-1)
  return db.transaction(() => {
    // Batch-fetch projects to avoid N+1 (P2-7)
    const uniqueProjectIds = [...new Set(timeEntries.map((e) => e.project_id))];
    const placeholders = uniqueProjectIds.map(() => "?").join(",");
    const projects = db
      .query<Project, number[]>(
        `SELECT id, client_id, code, name, daily_rate, start_date, end_date, budget_days,
                service_description, contract_number, contract_date, notes, created_at, archived
         FROM projects WHERE id IN (${placeholders})`,
      )
      .all(...uniqueProjectIds);
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Calculate totals PER LINE ITEM with proper MwSt
    let totalNet = 0;
    let totalVat = 0;

    const vatRate = settings.vat_rate;
    const invoiceItems = timeEntries.map((entry) => {
      const project = projectMap.get(entry.project_id);
      if (!project) throw new Error(`Projekt ${entry.project_id} nicht gefunden`);

      const netAmount = roundToEuro(entry.duration * project.daily_rate);
      const vatAmount = roundToEuro(netAmount * vatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);

      totalNet += netAmount;
      totalVat += vatAmount;

      return { entry, project, netAmount, vatAmount, grossAmount };
    });

    // Round totals (safety)
    totalNet = roundToEuro(totalNet);
    totalVat = roundToEuro(totalVat);
    const totalGross = roundToEuro(totalNet + totalVat);

    // Generate invoice number
    const nextNum = (settings.next_invoice_number || 1).toString().padStart(4, "0");
    const invoiceNumber = `${settings.invoice_prefix}-${data.period_year}-${nextNum}`;

    // Calculate due date
    const invoiceDateObj = new Date(data.invoice_date);
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + (settings.payment_days || 28));
    const dueDate = dueDateObj.toISOString().split("T")[0];

    // Create invoice record
    const invoiceRecord = db
      .query(
        `INSERT INTO invoices
         (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
         RETURNING id`,
      )
      .get(
        invoiceNumber,
        data.client_id,
        data.project_id,
        data.invoice_date,
        dueDate,
        data.period_month,
        data.period_year,
        totalNet,
        totalVat,
        totalGross,
      ) as { id: number } | undefined;

    if (!invoiceRecord) throw new Error("Rechnung konnte nicht erstellt werden");

    const invoiceId = invoiceRecord.id;

    // Create line items
    const insertItem = db.query(
      `INSERT INTO invoice_items
       (invoice_id, description, period_start, period_end, days, daily_rate, net_amount, vat_rate, vat_amount, gross_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of invoiceItems) {
      insertItem.run(
        invoiceId,
        `${item.project.name}: ${item.entry.description || "Taetigkeit"}`,
        data.service_period_from || item.entry.date,
        data.service_period_to || item.entry.date,
        item.entry.duration,
        item.project.daily_rate,
        item.netAmount,
        vatRate,
        item.vatAmount,
        item.grossAmount,
      );
    }

    // Link time entries to invoice
    const linkStmt = db.query("UPDATE time_entries SET invoice_id = ? WHERE id = ?");
    for (const entry of timeEntries) {
      linkStmt.run(invoiceId, entry.id);
    }

    // Update next invoice number
    db.query(
      "UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1",
    ).run();

    // Audit log
    appendAuditLog("invoice", invoiceId, "create", {
      invoice_number: invoiceNumber,
      net_amount: totalNet,
      gross_amount: totalGross,
      time_entry_count: timeEntries.length,
    });

    return invoiceId;
  })();
}

export function getInvoice(id: number) {
  return db.query<Invoice, [number]>(`SELECT * FROM invoices WHERE id = ?`).get(id);
}

export function getInvoiceItems(invoiceId: number) {
  return db
    .query<InvoiceItem, [number]>(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY period_start`,
    )
    .all(invoiceId);
}

// ─── Invoice List + Status ────────────────────────────────────────────────────

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  gross_amount: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  paid_date: string | null;
}

export function getAllInvoices(status?: string): InvoiceListItem[] {
  const base = `
    SELECT i.id, i.invoice_number, c.name as client_name,
           i.invoice_date, i.due_date, i.gross_amount, i.status, i.paid_date
    FROM invoices i
    JOIN clients c ON i.client_id = c.id`;

  if (status === "open") {
    return db
      .query<InvoiceListItem, []>(
        `${base} WHERE i.status IN ('draft', 'sent') ORDER BY i.invoice_date DESC`,
      )
      .all();
  }
  if (status === "overdue") {
    return db
      .query<InvoiceListItem, []>(
        `${base} WHERE i.due_date < date('now') AND i.status IN ('draft', 'sent') ORDER BY i.invoice_date DESC`,
      )
      .all();
  }
  if (status) {
    return db
      .query<InvoiceListItem, [string]>(
        `${base} WHERE i.status = ? ORDER BY i.invoice_date DESC`,
      )
      .all(status);
  }
  return db
    .query<InvoiceListItem, []>(
      `${base} ORDER BY i.invoice_date DESC`,
    )
    .all();
}

type InvoiceStatus = Invoice["status"];

const VALID_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function updateInvoiceStatus(id: number, newStatus: "sent" | "paid" | "cancelled", source: AuditLog["source"] = "web"): void {
  const row = db
    .query<Pick<Invoice, "status">, [number]>("SELECT status FROM invoices WHERE id = ?")
    .get(id);

  if (!row) {
    throw new AppError("Rechnung nicht gefunden", 404);
  }

  const currentStatus = row.status as InvoiceStatus;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      `Statuswechsel von '${currentStatus}' zu '${newStatus}' nicht erlaubt`,
      422,
    );
  }

  if (newStatus === "paid") {
    db.query("UPDATE invoices SET status = ?, paid_date = date('now') WHERE id = ?").run(newStatus, id);
  } else {
    db.query("UPDATE invoices SET status = ? WHERE id = ?").run(newStatus, id);
  }

  appendAuditLog("invoice", id, "status_change", { from: currentStatus, to: newStatus }, source);
}
