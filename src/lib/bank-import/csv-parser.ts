import type { BankTransaction } from "./camt-parser";

interface CsvProfile {
  name: string;
  delimiter: string;
  dateCol: number;
  amountCol: number;
  purposeCol: number;
  counterpartyCol: number;
  skipRows: number;
  detectPattern: RegExp;
  amountFormat: "de" | "en";
}

// Known German bank CSV export formats
const CSV_PROFILES: CsvProfile[] = [
  {
    // DKB (Deutsche Kreditbank)
    name: "DKB",
    delimiter: ";",
    dateCol: 0,
    amountCol: 7,
    purposeCol: 4,
    counterpartyCol: 3,
    skipRows: 5,
    detectPattern: /Buchungstag.*Wertstellung.*Buchungstext/i,
    amountFormat: "de",
  },
  {
    // Sparkasse
    name: "Sparkasse",
    delimiter: ";",
    dateCol: 0,
    amountCol: 13,
    purposeCol: 4,
    counterpartyCol: 2,
    skipRows: 1,
    detectPattern: /Auftragskonto.*Buchungstag.*Valutadatum.*Auftraggeber/i,
    amountFormat: "de",
  },
  {
    // ING
    name: "ING",
    delimiter: ";",
    dateCol: 0,
    amountCol: 6,
    purposeCol: 3,
    counterpartyCol: 2,
    skipRows: 1,
    detectPattern: /Buchung.*Valuta.*Auftraggeber.*Empfaenger/i,
    amountFormat: "de",
  },
  {
    // Comdirect
    name: "Comdirect",
    delimiter: ";",
    dateCol: 0,
    amountCol: 4,
    purposeCol: 3,
    counterpartyCol: 2,
    skipRows: 4,
    detectPattern: /Buchungstag.*Umsatztag.*Vorgang/i,
    amountFormat: "de",
  },
];

function parseGermanAmount(raw: string): number {
  const cleaned = raw.replace(/[""']/g, "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(cleaned);
}

function parseEnglishAmount(raw: string): number {
  return parseFloat(raw.replace(/[,"]/g, "").trim());
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === delimiter && !inQuote) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function detectProfile(header: string): CsvProfile | null {
  for (const profile of CSV_PROFILES) {
    if (profile.detectPattern.test(header)) return profile;
  }
  return null;
}

function parseDateDe(raw: string): string {
  // Converts DD.MM.YYYY to YYYY-MM-DD
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return raw.trim();
}

/**
 * Parse a German bank CSV export into BankTransactions.
 * Only returns rows where amount > 0 (Gutschrift / credit).
 */
export function parseBankCsv(content: string): { transactions: BankTransaction[]; format: string } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { transactions: [], format: "unknown" };

  // Try to detect profile from first lines
  const headerBlock = lines.slice(0, 6).join("\n");
  const profile = detectProfile(headerBlock);

  if (!profile) {
    return { transactions: [], format: "unknown" };
  }

  const dataLines = lines.slice(profile.skipRows);
  const transactions: BankTransaction[] = [];

  for (const line of dataLines) {
    const cols = splitCsvRow(line, profile.delimiter);
    if (cols.length <= Math.max(profile.amountCol, profile.purposeCol)) continue;

    const rawAmount = cols[profile.amountCol] ?? "";
    const amount =
      profile.amountFormat === "de" ? parseGermanAmount(rawAmount) : parseEnglishAmount(rawAmount);

    if (Number.isNaN(amount) || amount <= 0) continue; // only credits

    const date = parseDateDe(cols[profile.dateCol] ?? "");
    const purpose = (cols[profile.purposeCol] ?? "").replace(/"/g, "").trim();
    const counterparty = (cols[profile.counterpartyCol] ?? "").replace(/"/g, "").trim();

    transactions.push({ date, amount, currency: "EUR", purpose, counterparty });
  }

  return { transactions, format: profile.name };
}
