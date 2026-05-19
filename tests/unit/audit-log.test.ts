import { beforeAll, describe, expect, test } from "bun:test";
import { appendAuditLog } from "../../src/db/queries";
import { db, initializeSchema } from "../../src/db/schema";

beforeAll(() => {
  initializeSchema();
});

describe("Audit-Log GoBD-Unveränderlichkeit", () => {
  test("appendAuditLog schreibt einen Eintrag", () => {
    appendAuditLog("client", 1, "create", { name: "Test GmbH" });
    const row = db.query("SELECT * FROM audit_log WHERE entity_type = 'client' LIMIT 1").get() as {
      id: number;
      entity_type: string;
    } | null;
    expect(row).not.toBeNull();
    expect(row?.entity_type).toBe("client");
  });

  test("UPDATE auf audit_log wirft GoBD-Fehler", () => {
    appendAuditLog("project", 99, "create", { name: "Testprojekt" });
    expect(() => {
      db.run("UPDATE audit_log SET entity_type = 'hacked' WHERE entity_type = 'project'");
    }).toThrow(/GoBD/);
  });

  test("DELETE auf audit_log wirft GoBD-Fehler", () => {
    appendAuditLog("invoice", 42, "status_change", {});
    expect(() => {
      db.run("DELETE FROM audit_log WHERE entity_type = 'invoice'");
    }).toThrow(/GoBD/);
  });

  test("Bestehende Einträge bleiben nach fehlgeschlagenem UPDATE erhalten", () => {
    appendAuditLog("client", 2, "update", { field: "email" });
    const before = (
      db.query("SELECT COUNT(*) as count FROM audit_log").get() as { count: number }
    ).count;

    try {
      db.run("UPDATE audit_log SET entity_id = 0");
    } catch {
      // Trigger-Abort erwartet
    }

    const after = (
      db.query("SELECT COUNT(*) as count FROM audit_log").get() as { count: number }
    ).count;
    expect(after).toBe(before);
  });
});
