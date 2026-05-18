import { appendAuditLog } from "./queries";
import { db } from "./schema";

// ─── GDPR DSR: Vollständiger Daten-Export für einen Kunden ───────────────────

export interface ClientDsrExport {
  exported_at: string;
  legal_basis: string;
  client: Record<string, unknown>;
  projects: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  invoice_items: Record<string, unknown>[];
  time_entries: Record<string, unknown>[];
  audit_log_note: string;
}

export function getClientDsrData(clientId: number): ClientDsrExport | null {
  const client = db
    .query<Record<string, unknown>, [number]>(
      `SELECT id, name, address, postal_code, city, country, email, phone,
              contact_person, vat_id, buyer_reference, notes, created_at
       FROM clients WHERE id = ?`,
    )
    .get(clientId);

  if (!client) return null;

  const projects = db
    .query<Record<string, unknown>, [number]>(
      `SELECT id, code, name, daily_rate, start_date, end_date, budget_days,
              service_description, contract_number, contract_date, notes, created_at
       FROM projects WHERE client_id = ?`,
    )
    .all(clientId);

  const invoices = db
    .query<Record<string, unknown>, [number]>(
      `SELECT id, invoice_number, invoice_date, due_date, period_month, period_year,
              net_amount, vat_amount, gross_amount, status, po_number,
              service_period_from, service_period_to, paid_date, created_at
       FROM invoices WHERE client_id = ?`,
    )
    .all(clientId);

  const invoiceIds = invoices.map((inv) => (inv as { id: number }).id);
  const items =
    invoiceIds.length > 0
      ? db
          .query<Record<string, unknown>, [string]>(
            `SELECT id, invoice_id, description, period_start, period_end,
                    days, daily_rate, net_amount, vat_rate, vat_amount, gross_amount
             FROM invoice_items WHERE invoice_id IN (SELECT value FROM json_each(?))`,
          )
          .all(JSON.stringify(invoiceIds))
      : [];

  const projectIds = projects.map((p) => (p as { id: number }).id);
  const timeEntries =
    projectIds.length > 0
      ? db
          .query<Record<string, unknown>, [string]>(
            `SELECT id, project_id, date, duration, description, billable, created_at
             FROM time_entries WHERE project_id IN (SELECT value FROM json_each(?))`,
          )
          .all(JSON.stringify(projectIds))
      : [];

  return {
    exported_at: new Date().toISOString(),
    legal_basis: "Art. 15 DSGVO — Auskunftsrecht",
    client,
    projects,
    invoices,
    invoice_items: items,
    time_entries: timeEntries,
    audit_log_note:
      "Audit-Log-Einträge zu diesem Kunden sind aus GoBD-Gründen (§147 AO, 10-Jahres-Aufbewahrungspflicht) nicht im Export enthalten, aber nachweislich vorhanden. Rechtsgrundlage für Retention: Art. 17 Abs. 3 lit. b DSGVO.",
  };
}

// ─── GDPR DSR: Pseudonymisierung (Art. 17 DSGVO, GoBD-konform) ───────────────

const DELETED_MARKER = "[GELÖSCHT]";

export function pseudonymizeClient(clientId: number): { success: boolean; reason?: string } {
  const client = db
    .query<{ id: number; name: string }, [number]>("SELECT id, name FROM clients WHERE id = ?")
    .get(clientId);

  if (!client) return { success: false, reason: "Kunde nicht gefunden" };

  // Check for open (non-paid, non-cancelled) invoices — block if any exist
  const openInvoice = db
    .query<{ count: number }, [number]>(
      "SELECT COUNT(*) as count FROM invoices WHERE client_id = ? AND status NOT IN ('paid', 'cancelled')",
    )
    .get(clientId);

  if ((openInvoice?.count ?? 0) > 0) {
    return {
      success: false,
      reason:
        "Kunde hat offene Rechnungen. Bitte erst alle Rechnungen abschließen oder stornieren.",
    };
  }

  db.transaction(() => {
    // Pseudonymize client personal data; keep id/country for FK integrity
    db.query(
      `UPDATE clients SET
         name = ?, address = ?, postal_code = ?, city = ?,
         email = ?, phone = ?, contact_person = ?, vat_id = ?,
         buyer_reference = ?, notes = ?, archived = 1
       WHERE id = ?`,
    ).run(
      DELETED_MARKER,
      DELETED_MARKER,
      DELETED_MARKER,
      DELETED_MARKER,
      DELETED_MARKER,
      DELETED_MARKER,
      DELETED_MARKER,
      "",
      "",
      DELETED_MARKER,
      clientId,
    );

    // Pseudonymize project names (keep financial data, codes intact for invoice refs)
    db.query(
      `UPDATE projects SET
         name = ?, notes = ?, service_description = ?,
         contract_number = ?, archived = 1
       WHERE client_id = ?`,
    ).run(DELETED_MARKER, DELETED_MARKER, DELETED_MARKER, DELETED_MARKER, clientId);

    // Audit log entry — documents the DSGVO action
    // Note: existing audit_log entries cannot be modified (GoBD triggers)
    appendAuditLog(
      "client",
      clientId,
      "delete",
      {
        action: "gdpr_pseudonymization",
        original_name: client.name,
        legal_basis: "Art. 17 DSGVO",
        gobd_note: "Rechnungen und vorhandene Audit-Log-Einträge nach §147 AO aufbewahrt",
      },
      "web",
    );
  })();

  return { success: true };
}

// ─── DB-Konsistenzcheck (für Backup und Restore) ──────────────────────────────

export function checkDbIntegrity(): "ok" | string {
  const result = db.query<{ integrity_check: string }, []>("PRAGMA integrity_check").get();
  return result?.integrity_check ?? "unknown";
}

export function walCheckpoint(): void {
  db.run("PRAGMA wal_checkpoint(FULL)");
}
