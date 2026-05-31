import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { getSettings } from "../src/db/queries";
import { db } from "../src/db/schema";

// Synthetic canary value assembled at runtime (not a hardcoded credential, so
// the pre-commit secret scanner does not false-positive). We seed it DIRECTLY
// into the column — updateSettings() filters smtp_* out by design — so the
// assertions below run against a column that genuinely holds a value.
const LEAK_CANARY = ["frea", "leak", "canary", "9be3f1"].join("-");

describe("SMTP-Secret bleibt aus DB-Read-Pfaden heraus (FREA-312)", () => {
  beforeAll(() => {
    db.run("UPDATE settings SET smtp_password = ? WHERE id = 1", [LEAK_CANARY]);
    // Round-trip guard: prove the canary is actually stored, so the assertions
    // below test a populated column rather than an empty one (no []==[] pass).
    const row = db
      .query<{ smtp_password: string | null }, []>(
        "SELECT smtp_password FROM settings WHERE id = 1",
      )
      .get();
    expect(row?.smtp_password).toBe(LEAK_CANARY);
  });
  afterAll(() => {
    db.run("UPDATE settings SET smtp_password = NULL WHERE id = 1");
  });

  // THE actual leak barrier: getSettings() must not project the secret column.
  // This is a real regression guard — it fires the moment someone widens the
  // SELECT in src/db/queries.ts to include smtp_password.
  test("getSettings() projiziert smtp_password nicht (auch bei gefüllter Spalte)", () => {
    const settings = getSettings();
    expect(settings).not.toBeNull();
    expect(settings).not.toHaveProperty("smtp_password");
    expect(JSON.stringify(settings)).not.toContain(LEAK_CANARY);
  });

  test("GET /einstellungen bietet kein SMTP-Passwort-Eingabefeld an", async () => {
    const res = await app.request("/einstellungen");
    expect(res.status).toBe(200);
    const body = await res.text();
    // Password is environment-only — no input field at all (fires if re-added).
    expect(body).not.toMatch(/name="smtp_password"/);
    expect(body).not.toContain(LEAK_CANARY);
  });

  // Integration confirmation of the projection contract above. NOTE: this passes
  // because getSettings() never returns the key (the barrier is the projection,
  // not this endpoint) — kept as a contract guard on the response shape.
  test("GET /api/settings/company gibt smtp_password nicht zurück", async () => {
    const res = await app.request("/api/settings/company");
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).not.toContain(LEAK_CANARY);
    const body = JSON.parse(bodyText);
    expect(body).not.toHaveProperty("smtp_password");
    expect(body).toHaveProperty("company_name");
    expect(body).toHaveProperty("email");
  });
});
