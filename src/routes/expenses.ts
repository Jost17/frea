import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { html } from "hono/html";
import {
  createExpense,
  deleteExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
} from "../db/expense-queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { renderExpenseForm } from "../templates/expense-form";
import { renderExpenseList } from "../templates/expense-list";
import { Layout } from "../templates/layout";
import { expenseCreateSchema } from "../validation/schemas";

const UPLOADS_DIR = join(process.cwd(), "uploads", "receipts");
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const expenseRoutes = new Hono<AppEnv>();

// ─── Helper: save uploaded receipt ───────────────────────────────────────────

async function saveReceipt(file: File): Promise<string> {
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new AppError("Beleg darf maximal 10 MB groß sein", 413);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new AppError("Nur PDF, JPG oder PNG erlaubt", 415);
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const dest = join(UPLOADS_DIR, filename);

  await mkdir(UPLOADS_DIR, { recursive: true });

  const buffer = await file.arrayBuffer();
  await Bun.write(dest, buffer);

  return `uploads/receipts/${filename}`;
}

// ─── GET /ausgaben — Liste ─────────────────────────────────────────────────

expenseRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const expenses = getAllExpenses();

    return c.html(
      Layout({
        title: "Ausgaben",
        activeNav: "ausgaben",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Ausgaben</h1>
            <a
              href="/ausgaben/create"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neue Ausgabe
            </a>
          </div>
          ${renderExpenseList(expenses)}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Ausgaben konnten nicht geladen werden", 500);
  }
});

// ─── GET /ausgaben/create — Formular ─────────────────────────────────────

expenseRoutes.get("/create", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Neue Ausgabe",
      activeNav: "ausgaben",
      overdueCount,
      children: renderExpenseForm({}),
    }),
  );
});

// ─── POST /ausgaben/create — Speichern ───────────────────────────────────

expenseRoutes.post("/create", async (c) => {
  try {
    const formData = await c.req.formData();

    const fields = {
      date: formData.get("date"),
      amount: formData.get("amount"),
      vat_rate: formData.get("vat_rate"),
      category: formData.get("category"),
      description: formData.get("description"),
      vendor: formData.get("vendor") ?? "",
    };

    const parsed = expenseCreateSchema.safeParse(fields);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    }

    const receiptFile = formData.get("receipt");
    let receipt_path: string | null = null;
    if (receiptFile instanceof File && receiptFile.size > 0) {
      receipt_path = await saveReceipt(receiptFile);
    }

    const id = createExpense({ ...parsed.data, receipt_path });
    return c.redirect(`/ausgaben?created=${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Ausgabe konnte nicht gespeichert werden");
  }
});

// ─── GET /ausgaben/:id/edit — Bearbeitungsformular ───────────────────────

expenseRoutes.get("/:id/edit", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Ausgaben-ID", 400);

    const expense = getExpenseById(id);
    if (!expense) throw new AppError("Ausgabe nicht gefunden", 404);

    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Ausgabe bearbeiten",
        activeNav: "ausgaben",
        overdueCount,
        children: renderExpenseForm({ expense }),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// ─── POST /ausgaben/:id/edit — Aktualisieren ─────────────────────────────

expenseRoutes.post("/:id/edit", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Ausgaben-ID", 400);

    const existing = getExpenseById(id);
    if (!existing) throw new AppError("Ausgabe nicht gefunden", 404);

    const formData = await c.req.formData();

    const fields = {
      date: formData.get("date"),
      amount: formData.get("amount"),
      vat_rate: formData.get("vat_rate"),
      category: formData.get("category"),
      description: formData.get("description"),
      vendor: formData.get("vendor") ?? "",
    };

    const parsed = expenseCreateSchema.safeParse(fields);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    }

    const receiptFile = formData.get("receipt");
    let receipt_path = existing.receipt_path;
    if (receiptFile instanceof File && receiptFile.size > 0) {
      receipt_path = await saveReceipt(receiptFile);
    }

    updateExpense(id, { ...parsed.data, receipt_path });
    return c.redirect("/ausgaben");
  } catch (err) {
    return handleMutationError(c, err, "Ausgabe konnte nicht aktualisiert werden");
  }
});

// ─── POST /ausgaben/:id/delete — Löschen ─────────────────────────────────

expenseRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Ausgaben-ID", 400);

    const existing = getExpenseById(id);
    if (!existing) throw new AppError("Ausgabe nicht gefunden", 404);

    deleteExpense(id);
    return c.redirect("/ausgaben");
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Ausgabe konnte nicht gelöscht werden", 500);
  }
});

// ─── GET /ausgaben/:id/beleg — Beleg-Download ────────────────────────────

expenseRoutes.get("/:id/beleg", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Ausgaben-ID", 400);

    const expense = getExpenseById(id);
    if (!expense) throw new AppError("Ausgabe nicht gefunden", 404);
    if (!expense.receipt_path) throw new AppError("Kein Beleg vorhanden", 404);

    const absolutePath = join(process.cwd(), expense.receipt_path);
    const file = Bun.file(absolutePath);
    const exists = await file.exists();
    if (!exists) throw new AppError("Beleg-Datei nicht gefunden", 404);

    const buffer = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";

    c.header("Content-Type", contentType);
    c.header("Content-Disposition", `inline; filename="beleg-${id}"`);
    return c.body(buffer);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Beleg konnte nicht geladen werden", 500);
  }
});
