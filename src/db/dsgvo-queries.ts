import { db } from "./schema";

export interface ExportData {
  settings: Record<string, unknown>;
  clients: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  invoice_items: Record<string, unknown>[];
  time_entries: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
}

export function exportAllData(): ExportData {
  const settings = db.query("SELECT * FROM settings WHERE id = 1").get();
  const clients = db.query("SELECT * FROM clients").all();
  const projects = db.query("SELECT * FROM projects").all();
  const invoices = db.query("SELECT * FROM invoices").all();
  const invoice_items = db.query("SELECT * FROM invoice_items").all();
  const time_entries = db.query("SELECT * FROM time_entries").all();
  const expenses = db.query("SELECT * FROM expenses").all();

  return {
    settings: (settings as Record<string, unknown>) || {},
    clients: (clients as Record<string, unknown>[]) || [],
    projects: (projects as Record<string, unknown>[]) || [],
    invoices: (invoices as Record<string, unknown>[]) || [],
    invoice_items: (invoice_items as Record<string, unknown>[]) || [],
    time_entries: (time_entries as Record<string, unknown>[]) || [],
    expenses: (expenses as Record<string, unknown>[]) || [],
  };
}

export function deleteAllBusinessData(): void {
  // Delete in correct order due to foreign keys
  db.prepare("DELETE FROM payments").run();
  db.prepare("DELETE FROM invoice_items").run();
  db.prepare("DELETE FROM time_entries").run();
  db.prepare("DELETE FROM invoices").run();
  db.prepare("DELETE FROM active_timers").run();
  db.prepare("DELETE FROM projects").run();
  db.prepare("DELETE FROM clients").run();
  db.prepare("DELETE FROM expenses").run();
}

export function anonymizePersonalData(): void {
  db.prepare(
    "UPDATE audit_log SET changes = 'anonymisiert' WHERE entity_type IN ('client', 'user')",
  ).run();
}

export function deactivateUser(userId: number): void {
  db.prepare("UPDATE users SET active = 0, last_login = NULL WHERE id = ?").run(userId);
}
