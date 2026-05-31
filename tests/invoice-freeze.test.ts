import { beforeAll, describe, expect, test } from "bun:test";
import { createInvoice, getInvoice, getInvoiceItems } from "../src/db/invoice-queries";
import { getClient, getSettings } from "../src/db/queries";
import { db, initializeSchema } from "../src/db/schema";
import { buildInvoiceHtml } from "../src/lib/pdf/invoice-html";
import { buildZugferdXml } from "../src/lib/zugferd-generator";
import { renderInvoiceDetailPage } from "../src/templates/invoice-detail";
import type { Client, Invoice, Settings, TimeEntry } from "../src/validation/schemas";

beforeAll(() => {
  initializeSchema();
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

let _c = 0;
function seed(): { clientId: number; projectId: number; entry: TimeEntry } {
  const clientId = (
    db
      .query<{ id: number }, []>(
        `INSERT INTO clients (name, address, postal_code, city, email)
         VALUES ('Freeze AG','Str. 1','10115','Berlin','f@ag.de') RETURNING id`,
      )
      .get() as { id: number }
  ).id;
  const projectId = (
    db
      .query<{ id: number }, [number, string]>(
        `INSERT INTO projects (client_id, name, code, daily_rate, start_date)
         VALUES (?, 'P', ?, 800, '2026-01-01') RETURNING id`,
      )
      .get(clientId, `FP-${++_c}`) as { id: number }
  ).id;
  const entryId = (
    db
      .query<{ id: number }, [number]>(
        `INSERT INTO time_entries (project_id, date, duration, description, billable)
         VALUES (?, '2026-01-15', 1, 'Dev', 1) RETURNING id`,
      )
      .get(projectId) as { id: number }
  ).id;
  const entry = db
    .query<TimeEntry, [number]>("SELECT * FROM time_entries WHERE id = ?")
    .get(entryId) as TimeEntry;
  return { clientId, projectId, entry };
}

function makeInvoice(clientId: number, projectId: number, settings: Settings): number {
  return createInvoice(
    {
      client_id: clientId,
      project_id: projectId,
      time_entry_ids: [],
      invoice_date: "2026-01-31",
      period_month: 1,
      period_year: 2026,
      po_number: "",
      service_period_from: "",
      service_period_to: "",
    },
    [seedEntryFor(projectId)],
    settings,
  );
}

// helper: fetch the most recent time entry for a project as a TimeEntry row
function seedEntryFor(projectId: number): TimeEntry {
  return db
    .query<TimeEntry, [number]>(
      "SELECT * FROM time_entries WHERE project_id = ? ORDER BY id DESC LIMIT 1",
    )
    .get(projectId) as TimeEntry;
}

describe("FREA-116 — USt-Behandlung wird bei Erstellung eingefroren", () => {
  test("createInvoice schreibt kleinunternehmer + vat_rate als Snapshot auf die Rechnung", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const settings = getSettings() as Settings;

    const id = makeInvoice(clientId, projectId, settings);
    const inv = getInvoice(id) as Invoice;

    expect(inv.kleinunternehmer).toBe(0);
    expect(inv.vat_rate).toBe(0.19);
    expect(inv.vat_amount).toBeGreaterThan(0);
  });

  test("Settings-Änderung NACH Ausstellung ändert das gerenderte PDF NICHT", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const settingsAtIssue = getSettings() as Settings;

    const id = makeInvoice(clientId, projectId, settingsAtIssue);
    const inv = getInvoice(id) as Invoice;
    const items = getInvoiceItems(id);
    const client = getClient(clientId) as Client;

    // Settings nachträglich auf Kleinunternehmer kippen
    db.run("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1");
    const settingsNow = getSettings() as Settings;

    const html = buildInvoiceHtml({ invoice: inv, items, client, settings: settingsNow });

    // §19-Hinweis darf NICHT erscheinen — die Rechnung wurde mit USt ausgestellt
    expect(html).not.toContain("§19 UStG");
    expect(html).toContain("19%");
  });

  test("Alt-Rechnung ohne Snapshot (NULL) fällt auf settings.* zurück", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const settings = getSettings() as Settings;
    const id = makeInvoice(clientId, projectId, settings);

    // Migration-Zustand simulieren: Snapshot-Spalten auf NULL setzen
    db.run("UPDATE invoices SET kleinunternehmer = NULL, vat_rate = NULL WHERE id = ?", [id]);
    const inv = getInvoice(id) as Invoice;
    const items = getInvoiceItems(id);
    const client = getClient(clientId) as Client;

    db.run("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1");
    const settingsNow = getSettings() as Settings;

    const html = buildInvoiceHtml({ invoice: inv, items, client, settings: settingsNow });

    // Legacy-Fallback: jetzt zeigt das PDF den §19-Hinweis (settings-getrieben)
    expect(html).toContain("§19 UStG");
  });

  test("ZUGFeRD-XML nutzt die eingefrorene Behandlung, nicht live settings", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const settingsAtIssue = getSettings() as Settings;
    const id = makeInvoice(clientId, projectId, settingsAtIssue);
    const inv = getInvoice(id) as Invoice;
    const items = getInvoiceItems(id);
    const client = getClient(clientId) as Client;

    // Settings nachträglich auf Kleinunternehmer kippen
    db.run("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1");
    const settingsNow = getSettings() as Settings;

    // XML muss WEITERHIN erzeugt werden (Rechnung wurde mit USt ausgestellt) —
    // vor dem Fix gab buildZugferdXml hier undefined zurück (settings-getrieben).
    const xml = buildZugferdXml(inv, items, client, settingsNow);
    expect(xml).toBeDefined();
    expect(xml).toContain("19.00");
  });

  test("Alt-Rechnung (NULL-Snapshot) + Kleinunternehmer-Settings → ZUGFeRD unterdrückt (Fallback)", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const id = makeInvoice(clientId, projectId, getSettings() as Settings);
    db.run("UPDATE invoices SET kleinunternehmer = NULL, vat_rate = NULL WHERE id = ?", [id]);
    const inv = getInvoice(id) as Invoice;
    const items = getInvoiceItems(id);
    const client = getClient(clientId) as Client;

    db.run("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1");
    const xml = buildZugferdXml(inv, items, client, getSettings() as Settings);
    expect(xml).toBeUndefined();
  });

  test("Invoice-Detail-Ansicht zeigt eingefrorene Behandlung, nicht live settings", () => {
    const { clientId, projectId } = seed();
    db.run("UPDATE settings SET kleinunternehmer = 0, vat_rate = 0.19 WHERE id = 1");
    const id = makeInvoice(clientId, projectId, getSettings() as Settings);
    const inv = getInvoice(id) as Invoice;
    const items = getInvoiceItems(id);
    const client = getClient(clientId) as Client;

    db.run("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1");
    const settingsNow = getSettings() as Settings;

    const view = renderInvoiceDetailPage({
      invoice: inv,
      items,
      client,
      settings: settingsNow,
      isOverdue: false,
    }).toString();

    expect(view).not.toContain("§19 UStG");
  });
});
