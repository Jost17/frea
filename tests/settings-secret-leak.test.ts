import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { db } from "../src/db/schema";

// Synthetic canary value assembled at runtime (not a hardcoded credential, so
// the pre-commit secret scanner does not false-positive). We seed it DIRECTLY
// into the column — updateSettings() filters smtp_* out by design — so the
// regression assertions below are genuine, not vacuous []==[] passes.
const LEAK_CANARY = ["frea", "leak", "canary", "9be3f1"].join("-");

describe("SMTP-Secret wird weder als Eingabe angeboten noch exponiert (FREA-312)", () => {
  beforeAll(() => {
    db.run("UPDATE settings SET smtp_password = ? WHERE id = 1", [LEAK_CANARY]);
    // Round-trip guard: prove the canary is actually stored before asserting it
    // does not leak — otherwise an empty store would fake a pass.
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

  test("GET /einstellungen bietet kein SMTP-Passwort-Eingabefeld an", async () => {
    const res = await app.request("/einstellungen");
    expect(res.status).toBe(200);
    const body = await res.text();
    // The password is environment-only — no input field, no rendered value.
    expect(body).not.toMatch(/name="smtp_password"/);
    expect(body).not.toContain(LEAK_CANARY);
  });

  test("GET /api/settings/company gibt smtp_password nicht zurück", async () => {
    const res = await app.request("/api/settings/company");
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).not.toContain(LEAK_CANARY);
    const body = JSON.parse(bodyText);
    expect(body).not.toHaveProperty("smtp_password");
    // Sanity: other fields are still served.
    expect(body).toHaveProperty("company_name");
    expect(body).toHaveProperty("email");
  });
});
