import { beforeEach, expect, test } from "bun:test";
import app from "../src/index";
import { initializeSchema } from "../src/db/schema";

const BASE_URL = "http://localhost:3114";
const JSON_HEADERS = {
  "content-type": "application/json",
  origin: BASE_URL,
};

beforeEach(() => {
  initializeSchema();
});

test("API: Kunden-CRUD funktioniert Ende-zu-Ende", async () => {
  const createRes = await app.fetch(
    new Request(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: "Müller GmbH",
        address: "Musterstraße 1",
        postal_code: "10115",
        city: "Berlin",
        email: "kontakt@mueller.de",
        phone: "030123456",
        contact_person: "Anna Müller",
        vat_id: "DE123456789",
        buyer_reference: "BR-42",
        notes: "Wichtiger Kunde",
      }),
    }),
  );

  expect(createRes.status).toBe(201);
  const created = (await createRes.json()) as { id: number };
  expect(created.id).toBeGreaterThan(0);

  const listRes = await app.fetch(new Request(`${BASE_URL}/api/clients`));
  expect(listRes.status).toBe(200);
  const clients = (await listRes.json()) as Array<{ id: number; name: string }>;
  expect(clients.some((c) => c.id === created.id && c.name === "Müller GmbH")).toBeTrue();

  const getRes = await app.fetch(new Request(`${BASE_URL}/api/clients/${created.id}`));
  expect(getRes.status).toBe(200);
  const client = (await getRes.json()) as { id: number; name: string };
  expect(client.id).toBe(created.id);
  expect(client.name).toBe("Müller GmbH");

  const updateRes = await app.fetch(
    new Request(`${BASE_URL}/api/clients/${created.id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: "Müller & Partner GmbH",
        address: "Musterstraße 2",
        postal_code: "10115",
        city: "Berlin",
        email: "rechnung@mueller.de",
        phone: "030123456",
        contact_person: "Anna Müller",
        vat_id: "DE123456789",
        buyer_reference: "BR-99",
        notes: "Aktualisiert",
      }),
    }),
  );

  expect(updateRes.status).toBe(200);
  const updated = (await updateRes.json()) as { id: number; name: string; buyer_reference: string };
  expect(updated.id).toBe(created.id);
  expect(updated.name).toBe("Müller & Partner GmbH");
  expect(updated.buyer_reference).toBe("BR-99");

  const deleteRes = await app.fetch(
    new Request(`${BASE_URL}/api/clients/${created.id}`, {
      method: "DELETE",
      headers: { origin: BASE_URL },
    }),
  );
  expect(deleteRes.status).toBe(204);

  const getAfterDeleteRes = await app.fetch(new Request(`${BASE_URL}/api/clients/${created.id}`));
  expect(getAfterDeleteRes.status).toBe(404);
});

test("API: Validierungs- und ID-Fehler liefern verwertbare Statuscodes", async () => {
  const invalidIdRes = await app.fetch(new Request(`${BASE_URL}/api/clients/0`));
  expect(invalidIdRes.status).toBe(400);

  const invalidBodyRes = await app.fetch(
    new Request(`${BASE_URL}/api/clients`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: "",
        email: "keine-mail",
      }),
    }),
  );

  expect(invalidBodyRes.status).toBe(422);
});
