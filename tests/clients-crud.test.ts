import { beforeAll, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { db } from "../src/db/schema";

// Mark onboarding complete so UI routes are reachable
beforeAll(() => {
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

// Helper: POST form data to a route
function postForm(path: string, fields: Record<string, string>) {
  return app.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Same-origin origin satisfies hono/csrf in production.
        // In NODE_ENV=test csrf is skipped entirely (see src/app.ts).
      },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

describe("API health (requireLocalhost guard)", () => {
  test("GET /api/health returns 200 and db ok", async () => {
    const res = await app.fetch(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; db: string };
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
  });
});

describe("Client CRUD via HTML routes", () => {
  test("GET /kunden lists clients (empty state)", async () => {
    const res = await app.fetch(new Request("http://localhost/kunden"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Kunden");
  });

  test("GET /kunden/new returns form", async () => {
    const res = await app.fetch(new Request("http://localhost/kunden/new"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Neuer Kunde");
  });

  test("POST /kunden creates a client and redirects", async () => {
    const res = await postForm("/kunden", {
      name: "Musterfirma GmbH",
      address: "Musterstraße 1",
      postal_code: "12345",
      city: "Berlin",
      email: "info@musterfirma.de",
      phone: "",
      contact_person: "",
      vat_id: "",
      buyer_reference: "",
      notes: "",
    });
    // Successful create redirects to /kunden/:id
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^\/kunden\/\d+$/);
  });

  test("GET /kunden/:id shows client detail", async () => {
    // Create a client first, then follow the redirect
    const createRes = await postForm("/kunden", {
      name: "Detail-Test GmbH",
      address: "",
      postal_code: "",
      city: "",
      email: "",
      phone: "",
      contact_person: "",
      vat_id: "",
      buyer_reference: "",
      notes: "",
    });
    const location = createRes.headers.get("location") ?? "";
    expect(location).toMatch(/^\/kunden\/\d+$/);

    const getRes = await app.fetch(new Request(`http://localhost${location}`));
    expect(getRes.status).toBe(200);
    const text = await getRes.text();
    expect(text).toContain("Detail-Test GmbH");
  });

  test("POST /kunden/:id updates a client", async () => {
    // Create
    const createRes = await postForm("/kunden", {
      name: "Update-Test GmbH",
      address: "",
      postal_code: "",
      city: "",
      email: "",
      phone: "",
      contact_person: "",
      vat_id: "",
      buyer_reference: "",
      notes: "",
    });
    const location = createRes.headers.get("location") ?? "";

    // Update
    const updateRes = await postForm(location, {
      name: "Update-Test GmbH (aktualisiert)",
      address: "Neue Straße 5",
      postal_code: "10115",
      city: "Berlin",
      email: "neu@example.de",
      phone: "",
      contact_person: "",
      vat_id: "",
      buyer_reference: "",
      notes: "",
    });
    expect(updateRes.status).toBe(302);

    // Verify updated name appears
    const getRes = await app.fetch(new Request(`http://localhost${location}`));
    const text = await getRes.text();
    expect(text).toContain("aktualisiert");
  });

  test("POST /kunden/:id/delete removes a client", async () => {
    // Create a client to delete
    const createRes = await postForm("/kunden", {
      name: "Lösch-Test GmbH",
      address: "",
      postal_code: "",
      city: "",
      email: "",
      phone: "",
      contact_person: "",
      vat_id: "",
      buyer_reference: "",
      notes: "",
    });
    const location = createRes.headers.get("location") ?? "";
    const id = location.split("/").pop();

    const deleteRes = await postForm(`/kunden/${id}/delete`, {});
    expect(deleteRes.status).toBe(302);

    // Soft-delete: client is archived, no longer listed
    const listRes = await app.fetch(new Request("http://localhost/kunden"));
    const listText = await listRes.text();
    expect(listText).not.toContain("Lösch-Test GmbH");
  });
});
