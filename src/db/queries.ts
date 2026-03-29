import { db } from "./schema";

// ─── Prepared statements ──────────────────────────────────────────────────────

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
    .query<{ id: number; name: string }, []>(
      "SELECT id, name FROM clients WHERE archived = 0 ORDER BY name",
    )
    .all();
}

// Projects

export function getActiveProjectsForClient(clientId: number) {
  return db
    .query<{ id: number; code: string; name: string }, [number]>(
      `SELECT id, code, name FROM projects
       WHERE client_id = ? AND archived = 0
       ORDER BY code`,
    )
    .all(clientId);
}
