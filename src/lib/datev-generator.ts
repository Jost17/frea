/**
 * DATEV EXTF Buchungsstapel Format 510, Version 7
 *
 * Generates the standard DATEV CSV that German tax advisors import
 * into DATEV Kanzlei-Rechnungswesen / DATEV Unternehmen online.
 *
 * SKR03 revenue accounts used by default:
 *   8400 → Erlöse 19 % USt
 *   8300 → Erlöse  7 % USt
 *   8200 → Steuerfreie Erlöse (Kleinunternehmer / 0 %)
 * Receivable account: 1400 (Forderungen aus L+L)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DATEVInvoiceRow {
  invoice_number: string;
  invoice_date: string; // ISO YYYY-MM-DD
  net_amount: number;
  vat_amount: number;
  client_name: string;
  effective_vat_rate: number; // e.g. 0.19, 0.07, 0
}

export interface DATEVExportParams {
  rows: DATEVInvoiceRow[];
  year: number;
  beraternr?: string;
  mandantnr?: string;
}

// ─── SKR03 Account Mapping ────────────────────────────────────────────────────

const RECEIVABLE_ACCOUNT = "1400";

function revenueAccount(vatRate: number): string {
  if (vatRate >= 0.185) return "8400"; // 19 %
  if (vatRate >= 0.065) return "8300"; //  7 %
  return "8200"; //  0 % / Kleinunternehmer
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** Converts ISO date (YYYY-MM-DD) → DATEV date (DDMM, 4 chars) */
function toDATEVDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}${month}`;
}

/** German decimal format: 1234.56 → "1234,56" */
function toGermanDecimal(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** Sanitize text for DATEV: strip semicolons and quote chars, cap length */
function sanitize(text: string, maxLen: number): string {
  return text.replace(/[";]/g, " ").substring(0, maxLen).trim();
}

// ─── CP1252 Encoding ──────────────────────────────────────────────────────────

const UNICODE_TO_CP1252: Record<number, number> = {
  8364: 0x80, // €
  8218: 0x82, // ‚
  402: 0x83, // ƒ
  8222: 0x84, // „
  8230: 0x85, // …
  8224: 0x86, // †
  8225: 0x87, // ‡
  710: 0x88, // ˆ
  8240: 0x89, // ‰
  352: 0x8a, // Š
  8249: 0x8b, // ‹
  338: 0x8c, // Œ
  381: 0x8e, // Ž
  8216: 0x91, // '
  8217: 0x92, // '
  8220: 0x93, // "
  8221: 0x94, // "
  8226: 0x95, // •
  8211: 0x96, // –
  8212: 0x97, // —
  732: 0x98, // ˜
  8482: 0x99, // ™
  353: 0x9a, // š
  8250: 0x9b, // ›
  339: 0x9c, // œ
  382: 0x9e, // ž
  376: 0x9f, // Ÿ
};

export function encodeCP1252(str: string): Uint8Array {
  const buf = new Uint8Array(str.length * 2);
  let pos = 0;
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i) ?? 0x3f;
    if (cp < 0x80) {
      buf[pos++] = cp;
    } else if (cp >= 0xa0 && cp <= 0xff) {
      // Latin-1 Supplement: same byte value in CP1252 (covers ä ö ü ß etc.)
      buf[pos++] = cp;
    } else {
      const mapped = UNICODE_TO_CP1252[cp];
      buf[pos++] = mapped ?? 0x3f; // '?' for unknown
      // Skip second code unit of surrogate pair
      if (cp > 0xffff) i++;
    }
  }
  return buf.subarray(0, pos);
}

// ─── DATEV File Structure ─────────────────────────────────────────────────────

const COLUMN_HEADERS = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  "Beleginfo - Art 1",
  "Beleginfo - Inhalt 1",
  "Beleginfo - Art 2",
  "Beleginfo - Inhalt 2",
  "Beleginfo - Art 3",
  "Beleginfo - Inhalt 3",
  "Beleginfo - Art 4",
  "Beleginfo - Inhalt 4",
  "Beleginfo - Art 5",
  "Beleginfo - Inhalt 5",
  "Beleginfo - Art 6",
  "Beleginfo - Inhalt 6",
  "Beleginfo - Art 7",
  "Beleginfo - Inhalt 7",
  "Beleginfo - Art 8",
  "Beleginfo - Inhalt 8",
  "KOST1 - Kostenstelle",
  "KOST2 - Kostenstelle",
  "Kost-Menge",
  "EU-Land u. UStID",
  "EU-Steuersatz",
  "Abw. Versteuerungsart",
  "L+L-Identifikation",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (direkt)",
  "L+L-Datum",
  "Berichtigung der Vorsteuer",
  "Berichtigung des Umsatzsteuerbetrages",
  "Fälligkeit",
  "Generalumkehr (GU)",
  "Steuersatz",
  "Land",
  "Abrechnungsreferenz",
  "BVV-Position (Bilanzvorbereitungsverzeichnis)",
  "EU-Mitgliedstaat Steuernummer",
  "EU-Mitgliedstaat Steuernummer (Freitext)",
].join(";");

const EMPTY_TRAILING = ";".repeat(47); // columns 15–61 are empty for our data

function buildHeaderLine(params: DATEVExportParams): string {
  const { year, beraternr = "1011", mandantnr = "1" } = params;
  const ts = formatTimestamp();
  const wjBeginn = `${year}0101`;
  const von = `${year}0101`;
  const bis = `${year}1231`;
  return `"EXTF";700;21;"Buchungsstapel";7;${ts};;${beraternr};;${mandantnr};;${wjBeginn};4;${von};${bis};"FREA Export";;0;0;"EUR";;;0;;0`;
}

function buildDataRow(row: DATEVInvoiceRow): string {
  const umsatz = toGermanDecimal(row.net_amount);
  const sh = "S"; // Soll (debit receivable)
  const wkz = "EUR";
  const konto = RECEIVABLE_ACCOUNT;
  const gegenkonto = revenueAccount(row.effective_vat_rate);
  const buKey = ""; // account-based tax encoding
  const belegdatum = toDATEVDate(row.invoice_date);
  const belegfeld1 = sanitize(row.invoice_number, 36);
  const belegfeld2 = "";
  const skonto = "";
  const buchungstext = sanitize(row.client_name, 60);

  return (
    [
      umsatz,
      sh,
      wkz,
      "",
      "",
      "",
      konto,
      gegenkonto,
      buKey,
      belegdatum,
      belegfeld1,
      belegfeld2,
      skonto,
      buchungstext,
    ].join(";") + EMPTY_TRAILING
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a DATEV EXTF Buchungsstapel CSV encoded as CP1252 bytes.
 * Returns null when there are no invoices to export.
 */
export function generateDATEVExport(params: DATEVExportParams): Uint8Array | null {
  if (params.rows.length === 0) return null;

  const lines: string[] = [
    buildHeaderLine(params),
    COLUMN_HEADERS,
    ...params.rows.map(buildDataRow),
  ];

  const csv = lines.join("\r\n");
  return encodeCP1252(csv);
}
