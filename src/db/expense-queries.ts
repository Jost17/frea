import { roundToEuro } from "./invoice-queries";
import { appendAuditLog } from "./queries";
import { db } from "./schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "Büro",
  "Software",
  "Hardware",
  "Fahrt",
  "Kommunikation",
  "Marketing",
  "Sonstiges",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: number;
  date: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  gross_amount: number;
  category: ExpenseCategory;
  description: string;
  vendor: string;
  receipt_path: string | null;
  created_at: string;
}

export interface ExpenseCreate {
  date: string;
  amount: number;
  vat_rate: number;
  category: ExpenseCategory;
  description: string;
  vendor: string;
  receipt_path?: string | null;
}

// ─── VAT Math ─────────────────────────────────────────────────────────────────

/** Berechnet MwSt und Brutto aus Netto + Steuersatz (kaufmännisch gerundet). */
export function computeExpenseVat(
  netAmount: number,
  vatRate: number,
): { vat_amount: number; gross_amount: number } {
  const vat_amount = roundToEuro(netAmount * vatRate);
  const gross_amount = roundToEuro(netAmount + vat_amount);
  return { vat_amount, gross_amount };
}

// ─── Lazy-loaded Prepared Statements ──────────────────────────────────────────

let stmtGetAll: ReturnType<typeof db.prepare<Expense, []>>;
let stmtGetById: ReturnType<typeof db.prepare<Expense, [number]>>;
let stmtInsert: ReturnType<typeof db.prepare<{ id: number }, [string, number, number, number, number, string, string, string, string | null]>>;
let stmtUpdate: ReturnType<typeof db.prepare<void, [string, number, number, number, number, string, string, string, string | null, number]>>;
let stmtDelete: ReturnType<typeof db.prepare<void, [number]>>;

function ensureStmts() {
  if (!stmtGetAll) {
    stmtGetAll = db.prepare<Expense, []>(`
      SELECT id, date, amount, vat_rate, vat_amount, gross_amount,
             category, description, vendor, receipt_path, created_at
      FROM expenses
      ORDER BY date DESC, id DESC
    `);

    stmtGetById = db.prepare<Expense, [number]>(`
      SELECT id, date, amount, vat_rate, vat_amount, gross_amount,
             category, description, vendor, receipt_path, created_at
      FROM expenses
      WHERE id = ?
    `);

    stmtInsert = db.prepare<
      { id: number },
      [string, number, number, number, number, string, string, string, string | null]
    >(`
      INSERT INTO expenses (date, amount, vat_rate, vat_amount, gross_amount, category, description, vendor, receipt_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    stmtUpdate = db.prepare<
      void,
      [string, number, number, number, number, string, string, string, string | null, number]
    >(`
      UPDATE expenses
      SET date = ?, amount = ?, vat_rate = ?, vat_amount = ?, gross_amount = ?,
          category = ?, description = ?, vendor = ?, receipt_path = ?
      WHERE id = ?
    `);

    stmtDelete = db.prepare<void, [number]>(`
      DELETE FROM expenses WHERE id = ?
    `);
  }
}

// ─── Query Functions ──────────────────────────────────────────────────────────

export function getAllExpenses(): Expense[] {
  ensureStmts();
  return stmtGetAll.all();
}

export function getExpenseById(id: number): Expense | null {
  ensureStmts();
  return stmtGetById.get(id) ?? null;
}

export function createExpense(data: ExpenseCreate): number {
  ensureStmts();
  const { vat_amount, gross_amount } = computeExpenseVat(data.amount, data.vat_rate);

  const row = stmtInsert.get(
    data.date,
    data.amount,
    data.vat_rate,
    vat_amount,
    gross_amount,
    data.category,
    data.description,
    data.vendor,
    data.receipt_path ?? null,
  );

  if (!row) {
    throw new Error("Expense insert did not return id");
  }

  appendAuditLog("expense", row.id, "create", { ...data, vat_amount, gross_amount });

  return row.id;
}

export function updateExpense(id: number, data: ExpenseCreate): void {
  ensureStmts();
  const { vat_amount, gross_amount } = computeExpenseVat(data.amount, data.vat_rate);

  stmtUpdate.run(
    data.date,
    data.amount,
    data.vat_rate,
    vat_amount,
    gross_amount,
    data.category,
    data.description,
    data.vendor,
    data.receipt_path ?? null,
    id,
  );

  appendAuditLog("expense", id, "update", { ...data, vat_amount, gross_amount });
}

export function deleteExpense(id: number): void {
  ensureStmts();
  stmtDelete.run(id);
  appendAuditLog("expense", id, "delete", null);
}
