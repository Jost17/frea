import { db } from "../db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecurringTemplate {
  id: number;
  client_id: number;
  title: string;
  interval: "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_due: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringTemplateItem {
  id: number;
  template_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface RecurringTemplateWithClient extends RecurringTemplate {
  client_name: string;
}

export interface RecurringTemplateCreate {
  client_id: number;
  title: string;
  interval: "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string | null;
  next_due: string;
}

export interface RecurringTemplateItemCreate {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getAllTemplates(): RecurringTemplateWithClient[] {
  return db
    .query<RecurringTemplateWithClient, []>(
      `SELECT rt.*, c.name AS client_name
       FROM recurring_templates rt
       JOIN clients c ON rt.client_id = c.id
       ORDER BY rt.active DESC, rt.next_due ASC`,
    )
    .all();
}

export function getTemplate(id: number): RecurringTemplate | undefined {
  return (
    db
      .query<RecurringTemplate, [number]>("SELECT * FROM recurring_templates WHERE id = ?")
      .get(id) ?? undefined
  );
}

export function getTemplateWithClient(id: number): RecurringTemplateWithClient | undefined {
  return (
    db
      .query<RecurringTemplateWithClient, [number]>(
        `SELECT rt.*, c.name AS client_name
         FROM recurring_templates rt
         JOIN clients c ON rt.client_id = c.id
         WHERE rt.id = ?`,
      )
      .get(id) ?? undefined
  );
}

export function getTemplateItems(templateId: number): RecurringTemplateItem[] {
  return db
    .query<RecurringTemplateItem, [number]>(
      "SELECT * FROM recurring_template_items WHERE template_id = ? ORDER BY id",
    )
    .all(templateId);
}

export function getDueTemplates(today: string): RecurringTemplateWithClient[] {
  return db
    .query<RecurringTemplateWithClient, [string]>(
      `SELECT rt.*, c.name AS client_name
       FROM recurring_templates rt
       JOIN clients c ON rt.client_id = c.id
       WHERE rt.active = 1 AND rt.next_due <= ?
       ORDER BY rt.next_due ASC`,
    )
    .all(today);
}

export function createTemplate(
  data: RecurringTemplateCreate,
  items: RecurringTemplateItemCreate[],
): number {
  return db.transaction(() => {
    const row = db
      .query<{ id: number }, [number, string, string, string, string | null, string]>(
        `INSERT INTO recurring_templates (client_id, title, interval, start_date, end_date, next_due)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        data.client_id,
        data.title,
        data.interval,
        data.start_date,
        data.end_date ?? null,
        data.next_due,
      );

    if (!row) throw new Error("Vorlage konnte nicht erstellt werden");

    const insertItem = db.query(
      `INSERT INTO recurring_template_items (template_id, description, quantity, unit_price, vat_rate)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (const item of items) {
      insertItem.run(row.id, item.description, item.quantity, item.unit_price, item.vat_rate);
    }

    return row.id;
  })();
}

export function updateTemplate(
  id: number,
  data: Partial<RecurringTemplateCreate>,
  items?: RecurringTemplateItemCreate[],
): void {
  db.transaction(() => {
    db.query(
      `UPDATE recurring_templates
       SET client_id = COALESCE(?, client_id),
           title = COALESCE(?, title),
           interval = COALESCE(?, interval),
           start_date = COALESCE(?, start_date),
           end_date = ?,
           next_due = COALESCE(?, next_due),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      data.client_id ?? null,
      data.title ?? null,
      data.interval ?? null,
      data.start_date ?? null,
      data.end_date !== undefined ? (data.end_date ?? null) : null,
      data.next_due ?? null,
      id,
    );

    if (items !== undefined) {
      db.query("DELETE FROM recurring_template_items WHERE template_id = ?").run(id);
      const insertItem = db.query(
        `INSERT INTO recurring_template_items (template_id, description, quantity, unit_price, vat_rate)
         VALUES (?, ?, ?, ?, ?)`,
      );
      for (const item of items) {
        insertItem.run(id, item.description, item.quantity, item.unit_price, item.vat_rate);
      }
    }
  })();
}

export function deactivateTemplate(id: number): void {
  db.query(
    "UPDATE recurring_templates SET active = 0, updated_at = datetime('now') WHERE id = ?",
  ).run(id);
}

export function advanceNextDue(id: number, newNextDue: string, deactivate: boolean): void {
  if (deactivate) {
    db.query(
      "UPDATE recurring_templates SET next_due = ?, active = 0, updated_at = datetime('now') WHERE id = ?",
    ).run(newNextDue, id);
  } else {
    db.query(
      "UPDATE recurring_templates SET next_due = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(newNextDue, id);
  }
}
