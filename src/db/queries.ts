import { db } from "./schema";
import type { Settings, Client, Project, TimeEntry, InvoiceCreate } from "../validation/schemas";

// ─── Prepared statements ──────────────────────────────────────────────────────

// Settings

export function getSettings() {
  return db
    .query<Settings, []>(
      `SELECT
        company_name, address, postal_code, city, country,
        email, phone, mobile, bank_name, iban, bic, tax_number,
        ust_id, vat_rate, payment_days, invoice_prefix, kleinunternehmer
       FROM settings WHERE id = 1`,
    )
    .get();
}

export function updateSettings(data: Partial<Settings>): void {
  const fields = Object.keys(data)
    .filter((k) => data[k as keyof Settings] !== undefined)
    .map((k) => `${k} = ?`)
    .join(", ");

  const values = Object.values(data).filter((v) => v !== undefined);

  if (fields.length === 0) return;

  db.query(`UPDATE settings SET ${fields} WHERE id = 1`).run(...values);
}

// Invoices

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

// Clients

export function getAllActiveClients() {
  return db
    .query<Omit<Client, "created_at" | "archived">, []>(
      `SELECT id, name, address, postal_code, city, country, email, phone, contact_person, vat_id, buyer_reference, notes
       FROM clients WHERE archived = 0 ORDER BY name`,
    )
    .all();
}

// Clients - full operations
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

export function createClient(data: Omit<Client, "id" | "created_at" | "archived">) {
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

  return result?.id;
}

export function updateClient(id: number, data: Partial<Omit<Client, "id" | "created_at" | "archived">>) {
  const fields = Object.keys(data)
    .filter((k) => data[k as keyof typeof data] !== undefined)
    .map((k) => `${k} = ?`)
    .join(", ");

  const values = Object.values(data).filter((v) => v !== undefined);

  if (fields.length === 0) return;

  db.query(`UPDATE clients SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteClient(id: number) {
  db.query("UPDATE clients SET archived = 1 WHERE id = ?").run(id);
}

// Projects

// Projects - full operations
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

export function createProject(data: Omit<Project, "id" | "created_at" | "archived">) {
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

  return result?.id;
}

export function updateProject(id: number, data: Partial<Omit<Project, "id" | "created_at" | "archived">>) {
  const fields = Object.keys(data)
    .filter((k) => data[k as keyof typeof data] !== undefined)
    .map((k) => `${k} = ?`)
    .join(", ");

  const values = Object.values(data).filter((v) => v !== undefined);

  if (fields.length === 0) return;

  db.query(`UPDATE projects SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteProject(id: number) {
  db.query("UPDATE projects SET archived = 1 WHERE id = ?").run(id);
}

// Time Entries
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

export function createTimeEntry(data: Omit<TimeEntry, "id" | "created_at" | "invoice_id">) {
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

  return result?.id;
}

export function updateTimeEntry(id: number, data: Partial<Omit<TimeEntry, "id" | "created_at" | "invoice_id">>) {
  const fields = Object.keys(data)
    .filter((k) => data[k as keyof typeof data] !== undefined)
    .map((k) => `${k} = ?`)
    .join(", ");

  const values = Object.values(data).filter((v) => v !== undefined);

  if (fields.length === 0) return;

  db.query(`UPDATE time_entries SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteTimeEntry(id: number) {
  db.query("DELETE FROM time_entries WHERE id = ? AND invoice_id IS NULL").run(id);
}

// Invoices
// ─── Kaufmännische Rundung: immer auf 2 Dezimalstellen ───
function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface InvoiceRow {
  id?: number;
  invoice_number: string;
  client_id: number;
  project_id: number;
  invoice_date: string;
  due_date: string;
  period_month: number;
  period_year: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  status: string;
  pdf_path: string | null;
  po_number: string | null;
  service_period_from: string | null;
  service_period_to: string | null;
  paid_date: string | null;
  reminder_level: number;
  created_at: string;
}

export function createInvoice(data: InvoiceCreate, timeEntries: TimeEntry[], settings: Settings): number {
  // Calculate totals PER LINE ITEM with proper MwSt
  let totalNet = 0;
  let totalVat = 0;

  const vatRate = settings.vat_rate;
  const invoiceItems = timeEntries.map((entry) => {
    const project = getProject(entry.project_id);
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
  const stmt = db.query(
    `INSERT INTO invoices
     (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
     RETURNING id`,
  );

  const invoiceRecord = stmt.get(
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
      `${item.project.name}: ${item.entry.description || "Tätigkeit"}`,
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
  db.query("UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1").run();

  return invoiceId;
}

export function getInvoice(id: number) {
  return db
    .query<InvoiceRow & { id: number }, [number]>(
      `SELECT * FROM invoices WHERE id = ?`,
    )
    .get(id);
}

export function getInvoiceItems(invoiceId: number) {
  return db
    .query<any, [number]>(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY period_start`,
    )
    .all(invoiceId);
}
