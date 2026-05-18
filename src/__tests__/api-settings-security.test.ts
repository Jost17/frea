import { describe, expect, test } from "bun:test";

// Must set env before importing app modules that read it at module load
process.env.FREA_DB_PATH = ":memory:";
process.env.NODE_ENV = "test";

import { app } from "../app";
import { db } from "../db/schema";

// Set smtp_password on the default-seeded settings row
db.run(`UPDATE settings SET smtp_password = 'secret123' WHERE id = 1`);

describe("GET /api/settings/company", () => {
  test("smtp_password ist nicht im Response enthalten", async () => {
    const res = await app.request("/api/settings/company");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).not.toHaveProperty("smtp_password");
  });

  test("andere Settings-Felder sind vorhanden", async () => {
    const res = await app.request("/api/settings/company");
    const body = await res.json();
    expect(body).toHaveProperty("company_name");
    expect(body).toHaveProperty("email");
  });
});
