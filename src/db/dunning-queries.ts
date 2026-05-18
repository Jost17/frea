import { AppError } from "../middleware/error-handler";
import type { DunnableInvoice, DunningLevel, DunningRun } from "../validation/schemas";
import { appendAuditLog } from "./queries";
import { db } from "./schema";

export function getDunningSettings(): DunningLevel[] {
  return db
    .query<DunningLevel, []>(
      "SELECT level, days_after_due, fee_amount, subject, body FROM dunning_settings ORDER BY level",
    )
    .all();
}

export function saveDunningLevels(
  levels: Array<{
    level: number;
    days_after_due: number;
    fee_amount: number;
    subject: string;
    body: string;
  }>,
): void {
  const stmt = db.query(
    "UPDATE dunning_settings SET days_after_due = ?, fee_amount = ?, subject = ?, body = ? WHERE level = ?",
  );
  db.transaction(() => {
    for (const l of levels) {
      stmt.run(l.days_after_due, l.fee_amount, l.subject, l.body, l.level);
    }
  })();
}

export function getDunnableInvoices(): DunnableInvoice[] {
  return db
    .query<DunnableInvoice, []>(
      `SELECT i.id, i.invoice_number, c.name as client_name, i.due_date,
              i.gross_amount, i.reminder_level,
              CAST(julianday('now') - julianday(i.due_date) AS INTEGER) as days_overdue,
              ds.days_after_due as next_days_threshold,
              ds.fee_amount as next_fee
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       LEFT JOIN dunning_settings ds ON ds.level = (i.reminder_level + 1)
       WHERE i.status = 'sent'
         AND i.due_date < date('now')
         AND i.reminder_level < 3
       ORDER BY i.due_date ASC`,
    )
    .all();
}

export function getDunningRunsForInvoice(invoiceId: number): DunningRun[] {
  return db
    .query<DunningRun, [number]>(
      `SELECT id, invoice_id, level, sent_at, fee_amount, notes
       FROM dunning_runs
       WHERE invoice_id = ?
       ORDER BY sent_at DESC`,
    )
    .all(invoiceId);
}

export function triggerDunning(invoiceId: number): void {
  db.transaction(() => {
    const invoice = db
      .query<{ status: string; reminder_level: number; due_date: string }, [number]>(
        "SELECT status, reminder_level, due_date FROM invoices WHERE id = ?",
      )
      .get(invoiceId);

    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);
    if (invoice.status !== "sent")
      throw new AppError("Nur versendete Rechnungen können gemahnt werden", 422);

    const today = new Date().toISOString().split("T")[0];
    if (invoice.due_date >= today) throw new AppError("Rechnung ist noch nicht überfällig", 422);

    if (invoice.reminder_level >= 3)
      throw new AppError("Maximale Mahnstufe (3) bereits erreicht", 422);

    const nextLevel = invoice.reminder_level + 1;
    const config = db
      .query<{ days_after_due: number; fee_amount: number }, [number]>(
        "SELECT days_after_due, fee_amount FROM dunning_settings WHERE level = ?",
      )
      .get(nextLevel);

    if (!config) throw new AppError("Mahnkonfiguration nicht gefunden", 500);

    db.query("INSERT INTO dunning_runs (invoice_id, level, fee_amount) VALUES (?, ?, ?)").run(
      invoiceId,
      nextLevel,
      config.fee_amount,
    );

    db.query("UPDATE invoices SET reminder_level = ? WHERE id = ?").run(nextLevel, invoiceId);

    appendAuditLog("invoice", invoiceId, "status_change", {
      dunning_level: nextLevel,
      fee_amount: config.fee_amount,
    });
  })();
}

export function getDunnableCount(): number {
  const row = db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM invoices
       WHERE status = 'sent' AND due_date < date('now') AND reminder_level < 3`,
    )
    .get();
  return row?.count ?? 0;
}
