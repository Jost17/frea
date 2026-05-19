import { beforeAll, describe, expect, test } from "bun:test";
import { db } from "../src/db/schema";
import { deactivateUser } from "../src/db/dsgvo-queries";

// Cleanup and setup
beforeAll(() => {
  db.run("DELETE FROM users");
});

describe("deactivateUser()", () => {
  test("setzt active = 0 für bestehenden User", () => {
    // Setup: User anlegen
    const insertResult = db.run("INSERT INTO users (email, name, active) VALUES (?, ?, ?)", [
      "test@example.de",
      "Test User",
      1,
    ]);
    const userId = insertResult.lastInsertRowid;

    // Act: deactivateUser aufrufen
    deactivateUser(Number(userId));

    // Assert: active sollte 0 sein
    const user = db.query("SELECT active FROM users WHERE id = ?").get(userId) as { active: number };
    expect(user.active).toBe(0);
  });

  test("wirft Error bei nicht-existent User", () => {
    expect(() => deactivateUser(9999)).toThrow("User with ID 9999 not found");
  });
});
