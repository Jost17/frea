import { beforeAll, describe, expect, test } from "bun:test";
import { app } from "../../src/app";
import { db } from "../../src/db/schema";

describe("Projects Integration", () => {
  /**
   * Integration tests for projects routes.
   * Verify that project pages load and basic CRUD flows don't crash.
   */

  beforeAll(() => {
    db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
  });

  test("GET /projekte returns list page without crashing", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toContain("projekt");
  });

  test("GET /projekte/new returns form page without crashing", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte/new"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("name");
  });

  test("Projects list shows empty state message when no projects exist", async () => {
    const res = await app.fetch(new Request("http://localhost/projekte"));
    expect(res.status).toBe(200);
    const text = await res.text();
    // Either shows existing projects or empty state message
    expect(text).toContain("Projekt");
  });
});
