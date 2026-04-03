import { expect, test, beforeEach } from "bun:test";
import { initializeSchema, db } from "../src/db/schema";
import { createClient } from "../src/db/queries";
import { createProject } from "../src/db/queries";
import { createTimeEntry } from "../src/db/queries";
import { createInvoice, getInvoice, getInvoiceItems } from "../src/db/invoice-queries";
import { getSettings } from "../src/db/queries";

beforeEach(() => {
  initializeSchema();
});

test(" Regression: Nur ausgewählte Zeiteinträge werden in Rechnung übernommen (FREA-134)", () => {
  const settings = getSettings()!;

  const clientId = createClient({
    name: "Test GmbH",
    address: "Teststraße 1",
    postal_code: "12345",
    city: "Berlin",
    country: "Deutschland",
    email: "test@gmbh.de",
    phone: "",
    contact_person: "",
    vat_id: "",
    buyer_reference: "",
    notes: "",
  })!;

  const projectId = createProject({
    client_id: clientId,
    code: "TEST-001",
    name: "Testprojekt",
    daily_rate: 800,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    budget_days: 10,
    service_description: "Beratungsleistungen",
    contract_number: "",
    contract_date: "",
    notes: "",
  })!;

  const entry1 = createTimeEntry({
    project_id: projectId,
    date: "2026-03-01",
    duration: 8,
    description: "Tag 1",
    billable: 1,
  })!;

  const entry2 = createTimeEntry({
    project_id: projectId,
    date: "2026-03-02",
    duration: 8,
    description: "Tag 2",
    billable: 1,
  })!;

  const entry3 = createTimeEntry({
    project_id: projectId,
    date: "2026-03-03",
    duration: 8,
    description: "Tag 3",
    billable: 1,
  })!;

  const entry4 = createTimeEntry({
    project_id: projectId,
    date: "2026-03-04",
    duration: 8,
    description: "Tag 4",
    billable: 1,
  })!;

  const entry5 = createTimeEntry({
    project_id: projectId,
    date: "2026-03-05",
    duration: 8,
    description: "Tag 5",
    billable: 1,
  })!;

  const invoiceId = createInvoice(
    {
      client_id: clientId,
      project_id: projectId,
      time_entry_ids: [entry1, entry3, entry5],
      invoice_date: "2026-03-31",
      period_month: 3,
      period_year: 2026,
      po_number: "",
      service_period_from: "2026-03-01",
      service_period_to: "2026-03-31",
      reverse_charge: false,
    },
    [
      { id: entry1, project_id: projectId, date: "2026-03-01", duration: 8, description: "Tag 1", billable: 1, invoice_id: null },
      { id: entry3, project_id: projectId, date: "2026-03-03", duration: 8, description: "Tag 3", billable: 1, invoice_id: null },
      { id: entry5, project_id: projectId, date: "2026-03-05", duration: 8, description: "Tag 5", billable: 1, invoice_id: null },
    ],
    settings,
    { reverseCharge: false },
  );

  const invoice = getInvoice(invoiceId);
  expect(invoice).toBeDefined();
  expect(invoice!.invoice_number).toBe("RE-2026-0001");

  const items = getInvoiceItems(invoiceId);
  expect(items).toHaveLength(3);
  expect(items.map((i) => i.description).sort()).toEqual([
    "Testprojekt: Tag 1",
    "Testprojekt: Tag 3",
    "Testprojekt: Tag 5",
  ]);

  const linkedEntryIds = items.map((item) => {
    const linkedEntry = db.query("SELECT id FROM time_entries WHERE invoice_id = ?").all(invoiceId);
    return linkedEntry;
  });
  const linkedCount = (db.query("SELECT COUNT(*) as c FROM time_entries WHERE invoice_id = ?").get(invoiceId) as { c: number }).c;
  expect(linkedCount).toBe(3);

  const unlinkedEntries = db.query("SELECT id, description FROM time_entries WHERE invoice_id IS NULL AND project_id = ?").all(projectId);
  expect(unlinkedEntries).toHaveLength(2);
  const unlinkedDescs = unlinkedEntries.map((e: any) => e.description).sort();
  expect(unlinkedDescs).toEqual(["Tag 2", "Tag 4"]);
});

test(" Regression: Nicht ausgewählte Zeiteinträge bleiben ohne invoice_id (FREA-134 Gegenprobe)", () => {
  const settings = getSettings()!;

  const clientId = createClient({
    name: "Test GmbH",
    address: "Teststraße 1",
    postal_code: "12345",
    city: "Berlin",
    country: "Deutschland",
    email: "test@gmbh.de",
    phone: "",
    contact_person: "",
    vat_id: "",
    buyer_reference: "",
    notes: "",
  })!;

  const projectId = createProject({
    client_id: clientId,
    code: "TEST-002",
    name: "Testprojekt 2",
    daily_rate: 1000,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    budget_days: 10,
    service_description: "Beratungsleistungen",
    contract_number: "",
    contract_date: "",
    notes: "",
  })!;

  const entryA = createTimeEntry({
    project_id: projectId,
    date: "2026-04-01",
    duration: 8,
    description: "Eintrag A",
    billable: 1,
  })!;

  const entryB = createTimeEntry({
    project_id: projectId,
    date: "2026-04-02",
    duration: 4,
    description: "Eintrag B",
    billable: 1,
  })!;

  createInvoice(
    {
      client_id: clientId,
      project_id: projectId,
      time_entry_ids: [entryA],
      invoice_date: "2026-04-30",
      period_month: 4,
      period_year: 2026,
      po_number: "",
      service_period_from: "2026-04-01",
      service_period_to: "2026-04-30",
      reverse_charge: false,
    },
    [
      { id: entryA, project_id: projectId, date: "2026-04-01", duration: 8, description: "Eintrag A", billable: 1, invoice_id: null },
    ],
    settings,
    { reverseCharge: false },
  );

  const unlinkedB = db.query("SELECT invoice_id FROM time_entries WHERE id = ?").get(entryB) as { invoice_id: number | null };
  expect(unlinkedB.invoice_id).toBeNull();

  const linkedA = db.query("SELECT invoice_id FROM time_entries WHERE id = ?").get(entryA) as { invoice_id: number | null };
  expect(linkedA.invoice_id).not.toBeNull();
});
