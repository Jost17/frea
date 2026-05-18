import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { computeHash } from "../lib/crypto";
import type { Invoice, InvoiceItem } from "../validation/schemas";
import { db } from "./schema";

const ARCHIVE_DIR = join(import.meta.dir, "../../data/archiv");

async function ensureArchiveDir(): Promise<void> {
  await mkdir(ARCHIVE_DIR, { recursive: true });
}

export function getLastAuditHash(): string {
  const row = db
    .query<{ content_hash: string | null }, []>(
      "SELECT content_hash FROM audit_log ORDER BY id DESC LIMIT 1",
    )
    .get();
  return row?.content_hash ?? "genesis";
}

export function computeAuditEntryHash(
  prevHash: string,
  timestamp: string,
  entityType: string,
  entityId: number,
  action: string,
  changes: string | null,
): string {
  const payload = [prevHash, timestamp, entityType, String(entityId), action, changes ?? ""].join(
    "|",
  );
  return computeHash(payload);
}

interface ArchiveRow {
  chain_hash: string;
}

export async function archiveInvoice(
  invoice: Invoice,
  items: InvoiceItem[],
): Promise<{ archiveId: number; chainHash: string }> {
  await ensureArchiveDir();

  const snapshot = JSON.stringify({ invoice, items });
  const snapshotHash = computeHash(snapshot);

  let pdfHash: string | null = null;
  let pdfArchivePath: string | null = null;

  if (invoice.pdf_path) {
    try {
      const pdfBytes = await Bun.file(invoice.pdf_path).bytes();
      pdfHash = computeHash(Buffer.from(pdfBytes).toString("binary"));

      const archiveFileName = `${invoice.invoice_number.replace(/[^A-Za-z0-9-_]/g, "_")}_${Date.now()}.pdf`;
      pdfArchivePath = join(ARCHIVE_DIR, archiveFileName);
      await copyFile(invoice.pdf_path, pdfArchivePath);
    } catch (err) {
      console.warn(
        `[archive] PDF nicht gefunden oder nicht kopierbar für ${invoice.invoice_number}:`,
        err,
      );
    }
  }

  const prevRow = db
    .query<ArchiveRow, []>("SELECT chain_hash FROM invoice_archive ORDER BY id DESC LIMIT 1")
    .get();
  const prevChainHash = prevRow?.chain_hash ?? "genesis";

  const archivedAt = new Date().toISOString().replace("T", " ").split(".")[0];
  const invoiceDateObj = new Date(invoice.invoice_date);
  invoiceDateObj.setFullYear(invoiceDateObj.getFullYear() + 10);
  const retainUntil = invoiceDateObj.toISOString().split("T")[0];

  const chainPayload = [
    prevChainHash,
    invoice.invoice_number,
    archivedAt,
    snapshotHash,
    pdfHash ?? "",
  ].join("|");
  const chainHash = computeHash(chainPayload);

  const row = db
    .query<
      { id: number },
      [number, string, string, string, string, string | null, string | null, string]
    >(
      `INSERT INTO invoice_archive
       (invoice_id, invoice_number, archived_at, retain_until, invoice_snapshot, pdf_hash, pdf_archive_path, chain_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
    )
    .get(
      invoice.id,
      invoice.invoice_number,
      archivedAt,
      retainUntil,
      snapshot,
      pdfHash,
      pdfArchivePath,
      chainHash,
    );

  if (!row) throw new Error(`Archivierung fehlgeschlagen für Rechnung ${invoice.invoice_number}`);

  return { archiveId: row.id, chainHash };
}

export interface ArchiveIntegrityResult {
  valid: boolean;
  totalChecked: number;
  firstFaultyId?: number;
  message: string;
}

export function verifyAuditChain(): ArchiveIntegrityResult {
  const rows = db
    .query<{ id: number; content_hash: string | null }, []>(
      "SELECT id, content_hash FROM audit_log WHERE content_hash IS NOT NULL ORDER BY id ASC",
    )
    .all();

  if (rows.length === 0) {
    return { valid: true, totalChecked: 0, message: "Keine Hash-Eintraege vorhanden" };
  }

  const allRows = db
    .query<
      {
        id: number;
        timestamp: string;
        entity_type: string;
        entity_id: number;
        action: string;
        changes: string | null;
        content_hash: string | null;
      },
      []
    >(
      "SELECT id, timestamp, entity_type, entity_id, action, changes, content_hash FROM audit_log ORDER BY id ASC",
    )
    .all();

  let prevHash = "genesis";
  for (const row of allRows) {
    if (!row.content_hash) {
      prevHash = "genesis";
      continue;
    }
    const expected = computeAuditEntryHash(
      prevHash,
      row.timestamp,
      row.entity_type,
      row.entity_id,
      row.action,
      row.changes,
    );
    if (row.content_hash !== expected) {
      return {
        valid: false,
        totalChecked: allRows.length,
        firstFaultyId: row.id,
        message: `Hash-Kette unterbrochen bei Eintrag ${row.id}`,
      };
    }
    prevHash = row.content_hash;
  }

  return {
    valid: true,
    totalChecked: allRows.filter((r) => r.content_hash).length,
    message: "Hash-Kette intakt",
  };
}

export interface InvoiceArchiveRow {
  id: number;
  invoice_id: number;
  invoice_number: string;
  archived_at: string;
  retain_until: string;
  pdf_hash: string | null;
  pdf_archive_path: string | null;
  chain_hash: string;
}

export function getInvoiceArchive(invoiceId: number): InvoiceArchiveRow | null {
  return db
    .query<InvoiceArchiveRow, [number]>(
      `SELECT id, invoice_id, invoice_number, archived_at, retain_until,
              pdf_hash, pdf_archive_path, chain_hash
       FROM invoice_archive WHERE invoice_id = ?`,
    )
    .get(invoiceId);
}

export interface AuditLogRow {
  id: number;
  timestamp: string;
  entity_type: string;
  entity_id: number;
  action: string;
  changes: string | null;
  source: string;
  content_hash: string | null;
}

export function getAuditLogEntries(
  entityType?: string,
  entityId?: number,
  limit = 100,
): AuditLogRow[] {
  if (entityType && entityId !== undefined) {
    return db
      .query<AuditLogRow, [string, number, number]>(
        `SELECT id, timestamp, entity_type, entity_id, action, changes, source, content_hash
         FROM audit_log WHERE entity_type = ? AND entity_id = ?
         ORDER BY id DESC LIMIT ?`,
      )
      .all(entityType, entityId, limit);
  }
  if (entityType) {
    return db
      .query<AuditLogRow, [string, number]>(
        `SELECT id, timestamp, entity_type, entity_id, action, changes, source, content_hash
         FROM audit_log WHERE entity_type = ?
         ORDER BY id DESC LIMIT ?`,
      )
      .all(entityType, limit);
  }
  return db
    .query<AuditLogRow, [number]>(
      `SELECT id, timestamp, entity_type, entity_id, action, changes, source, content_hash
       FROM audit_log ORDER BY id DESC LIMIT ?`,
    )
    .all(limit);
}
