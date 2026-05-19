import { describe, expect, test, beforeAll } from "bun:test";
import { app } from "../src/app";
import { db } from "../src/db/schema";
import {
  createExpense,
  getExpenseById,
  getAllExpenses,
  updateExpense,
  deleteExpense,
} from "../src/db/expense-queries";

beforeAll(() => {
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

describe("Ausgaben CRUD", () => {
  test("Neue Ausgabe erstellen", () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Papier und Stifte",
      vendor: "Staples",
    });

    expect(expenseId).toBeGreaterThan(0);

    const expense = getExpenseById(expenseId);
    expect(expense).toBeTruthy();
    expect(expense?.amount).toBe(100.0);
    expect(expense?.vat_rate).toBe(0.19);
    expect(expense?.vat_amount).toBe(19.0);
    expect(expense?.gross_amount).toBe(119.0);
    expect(expense?.category).toBe("Büro");
    expect(expense?.description).toBe("Papier und Stifte");
  });

  test("MwSt wird kaufmännisch gerundet", () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 123.45,
      vat_rate: 0.19,
      category: "Software",
      description: "Lizenz",
      vendor: "",
    });

    const expense = getExpenseById(expenseId);
    expect(expense?.vat_amount).toBe(23.46);
    expect(expense?.gross_amount).toBe(146.91);
  });

  test("Unterschiedliche MwSt-Sätze funktionieren", () => {
    const expenseId7 = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.07,
      category: "Fahrt",
      description: "Tankstelle",
      vendor: "",
    });

    const expense7 = getExpenseById(expenseId7);
    expect(expense7?.vat_amount).toBe(7.0);
    expect(expense7?.gross_amount).toBe(107.0);
  });

  test("Alle Kategorien sind gültig", () => {
    const categories = ["Büro", "Software", "Hardware", "Fahrt", "Kommunikation", "Marketing", "Sonstiges"] as const;

    categories.forEach((category, index) => {
      const expenseId = createExpense({
        date: "2026-05-19",
        amount: 100.0 + index,
        vat_rate: 0.19,
        category,
        description: `Test ${category}`,
        vendor: "",
      });

      const expense = getExpenseById(expenseId);
      expect(expense?.category).toBe(category);
    });
  });

  test("Ausgabe bearbeiten", () => {
    const expenseId = createExpense({
      date: "2026-05-18",
      amount: 50.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Alt",
      vendor: "Alter Verkäufer",
    });

    updateExpense(expenseId, {
      date: "2026-05-19",
      amount: 75.0,
      vat_rate: 0.19,
      category: "Hardware",
      description: "Neu",
      vendor: "Neuer Verkäufer",
    });

    const expense = getExpenseById(expenseId);
    expect(expense?.amount).toBe(75.0);
    expect(expense?.date).toBe("2026-05-19");
    expect(expense?.category).toBe("Hardware");
    expect(expense?.description).toBe("Neu");
    expect(expense?.vendor).toBe("Neuer Verkäufer");
    expect(expense?.vat_amount).toBe(14.25);
    expect(expense?.gross_amount).toBe(89.25);
  });

  test("Ausgabe löschen", () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Zu löschen",
      vendor: "",
    });

    deleteExpense(expenseId);

    const expense = getExpenseById(expenseId);
    expect(expense).toBeNull();
  });

  test("Alle Ausgaben abrufen (Sortierung)", () => {
    const id1 = createExpense({
      date: "2026-05-17",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Sortiertest Erste",
      vendor: "",
    });

    const id2 = createExpense({
      date: "2026-05-18",
      amount: 200.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Sortiertest Zweite",
      vendor: "",
    });

    const id3 = createExpense({
      date: "2026-05-19",
      amount: 300.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Sortiertest Dritte",
      vendor: "",
    });

    const expenses = getAllExpenses();
    // neueste zuerst → id3 sollte zuerst sein
    const sortierTestItems = expenses.filter((e) => e.description.includes("Sortiertest"));
    expect(sortierTestItems.length).toBe(3);
    expect(sortierTestItems[0]?.id).toBe(id3);
    expect(sortierTestItems[1]?.id).toBe(id2);
    expect(sortierTestItems[2]?.id).toBe(id1);
  });

  test("Beleg-Pfad wird gespeichert", () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Mit Beleg",
      vendor: "",
      receipt_path: "uploads/receipts/test.pdf",
    });

    const expense = getExpenseById(expenseId);
    expect(expense?.receipt_path).toBe("uploads/receipts/test.pdf");
  });

  test("Audit Log wird geschrieben", () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Audit Test",
      vendor: "",
    });

    const stmt = db.prepare<{ action: string; entity_type: string; entity_id: number }, [number]>(
      `SELECT action, entity_type, entity_id FROM audit_log WHERE entity_type = 'expense' AND entity_id = ? ORDER BY id DESC`,
    );
    const logs = stmt.all(expenseId);

    expect(logs.length).toBeGreaterThan(0);
    const createLog = logs.find((l) => l.action === "create");
    expect(createLog).toBeTruthy();
    expect(createLog?.entity_type).toBe("expense");
  });
});

describe("Ausgaben API Routes", () => {
  test("GET /ausgaben zeigt Liste", async () => {
    const res = await app.request("/ausgaben");
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Ausgaben");
    expect(html).toContain("Neue Ausgabe");
  });

  test("GET /ausgaben/create zeigt Formular", async () => {
    const res = await app.request("/ausgaben/create");
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Neue Ausgabe");
    expect(html).toContain("Kategorie");
    expect(html).toContain("Beschreibung");
  });

  test("POST /ausgaben/create speichert Ausgabe", async () => {
    const res = await app.request("/ausgaben/create", {
      method: "POST",
      body: new URLSearchParams({
        date: "2026-05-19",
        amount: "99.99",
        vat_rate: "0.19",
        category: "Hardware",
        description: "Monitor",
        vendor: "MediaMarkt",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("/ausgaben");
    expect(location).toContain("created=");
  });

  test("POST /ausgaben/create validiert Eingaben", async () => {
    const res = await app.request("/ausgaben/create", {
      method: "POST",
      body: new URLSearchParams({
        date: "2026-05-19",
        amount: "-50",
        vat_rate: "0.19",
        category: "Hardware",
        description: "Invalid",
        vendor: "",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect([400, 422]).toContain(res.status);
  });

  test("GET /ausgaben/:id/edit zeigt Bearbeitungsformular", async () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Edit Test",
      vendor: "",
    });

    const res = await app.request(`/ausgaben/${expenseId}/edit`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Edit Test");
    expect(html).toContain("100");
  });

  test("POST /ausgaben/:id/edit aktualisiert Ausgabe", async () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Alter Text",
      vendor: "",
    });

    const res = await app.request(`/ausgaben/${expenseId}/edit`, {
      method: "POST",
      body: new URLSearchParams({
        date: "2026-05-19",
        amount: "150.0",
        vat_rate: "0.19",
        category: "Hardware",
        description: "Neuer Text",
        vendor: "Vendor",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(res.status).toBe(302);

    const updated = getExpenseById(expenseId);
    expect(updated?.amount).toBe(150.0);
    expect(updated?.description).toBe("Neuer Text");
    expect(updated?.category).toBe("Hardware");
  });

  test("POST /ausgaben/:id/delete löscht Ausgabe", async () => {
    const expenseId = createExpense({
      date: "2026-05-19",
      amount: 100.0,
      vat_rate: 0.19,
      category: "Büro",
      description: "Zu löschen",
      vendor: "",
    });

    const res = await app.request(`/ausgaben/${expenseId}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    expect(res.status).toBe(302);

    const deleted = getExpenseById(expenseId);
    expect(deleted).toBeNull();
  });
});
