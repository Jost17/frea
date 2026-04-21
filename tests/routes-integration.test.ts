import { describe, test, expect, beforeAll } from "bun:test";
import { app } from "../src/app";
import { db } from "../src/db/schema";

beforeAll(() => {
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

function postForm(path: string, fields: Record<string, string>) {
  return app.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

describe("Projects routes (refactored template extraction)", () => {
  test("GET /projekte lists projects (empty state)", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Projekte");
  });

  test("GET /projekte/new returns new project form", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte/new"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Neues Projekt");
  });
});

describe("Settings routes (refactored template extraction)", () => {
  test("GET /einstellungen returns form", async () => {
    const res = await app.fetch(new Request("http://localhost/einstellungen"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Firmeneinstellungen");
    expect(text).toContain("Allgemeine Informationen");
  });

  test("POST /einstellungen updates settings", async () => {
    const res = await postForm("/einstellungen", {
      company_name: "Test GmbH",
      email: "test@example.de",
      phone: "+49123456",
      tax_number: "12/345/67890",
      ust_id: "DE123456789",
      vat_rate: "0.19",
      kleinunternehmer: "",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      bank_name: "Commerzbank",
      invoice_prefix: "RE",
      payment_days: "28",
      address: "Musterstr. 1",
      postal_code: "10115",
      city: "Berlin",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/einstellungen");
  });
});

describe("Times routes (refactored template extraction)", () => {
  test("GET /zeiten lists time entries (empty state)", async () => {
    const res = await app.fetch(new Request("http://localhost/zeiten"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Zeiteintraege");
  });

  test("GET /zeiten/new returns time entry form", async () => {
    const res = await app.fetch(new Request("http://localhost/zeiten/new"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Zeiteintrag");
  });
});

describe("Error handling across refactored routes", () => {
  test("GET /projekte/:id with invalid ID returns 400", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte/notanumber"));
    expect(res.status).toBe(400);
  });

  test("GET /projekte/:id with nonexistent ID returns 404", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte/99999"));
    expect(res.status).toBe(404);
  });

  test("GET /zeiten/:id with invalid ID returns 400", async () => {
    const res = await app.fetch(new Request("http://localhost/zeiten/invalid"));
    expect(res.status).toBe(400);
  });

  test("POST /kunden/:id with invalid ID returns 400", async () => {
    const res = await postForm("/kunden/notanumber", {
      name: "Test",
      email: "test@example.de",
    });
    expect(res.status).toBe(400);
  });
});
