export interface BankTransaction {
  date: string;
  amount: number; // positive = credit (Gutschrift), negative = debit
  currency: string;
  purpose: string;
  counterparty: string;
}

/**
 * Extract text content of an XML element by tag name (first occurrence within a block).
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

/**
 * Split XML into top-level <Ntry> blocks.
 */
function extractEntries(xml: string): string[] {
  const entries: string[] = [];
  let pos = 0;
  while (true) {
    const start = xml.indexOf("<Ntry>", pos);
    if (start === -1) break;
    const end = xml.indexOf("</Ntry>", start);
    if (end === -1) break;
    entries.push(xml.slice(start, end + "</Ntry>".length));
    pos = end + 1;
  }
  return entries;
}

/**
 * Collect all <Ustrd> values (unstructured remittance info) within a block.
 */
function extractUstrd(block: string): string {
  const parts: string[] = [];
  let pos = 0;
  while (true) {
    const start = block.indexOf("<Ustrd>", pos);
    if (start === -1) break;
    const end = block.indexOf("</Ustrd>", start);
    if (end === -1) break;
    parts.push(block.slice(start + 7, end).trim());
    pos = end + 1;
  }
  return parts.join(" ").trim();
}

/**
 * Extract counterparty name from <Dbtr> or <Cdtr> block.
 */
function extractCounterparty(block: string): string {
  const dbtrMatch = block.match(/<Dbtr>[\s\S]*?<Nm>([^<]+)<\/Nm>/);
  if (dbtrMatch) return dbtrMatch[1].trim();
  const cdtrMatch = block.match(/<Cdtr>[\s\S]*?<Nm>([^<]+)<\/Nm>/);
  if (cdtrMatch) return cdtrMatch[1].trim();
  return "";
}

/**
 * Parse a CAMT.053 XML string into bank transactions.
 * Only returns CRDT (credit) entries — money received.
 */
export function parseCamt053(xml: string): BankTransaction[] {
  const entries = extractEntries(xml);
  const transactions: BankTransaction[] = [];

  for (const entry of entries) {
    const cdtDbt = extractTag(entry, "CdtDbtInd");
    if (cdtDbt !== "CRDT") continue; // only incoming payments

    const amtMatch = entry.match(/<Amt\s+Ccy="([^"]+)">([\d.]+)<\/Amt>/);
    if (!amtMatch) continue;

    const currency = amtMatch[1];
    const amount = parseFloat(amtMatch[2]);
    if (Number.isNaN(amount) || amount <= 0) continue;

    // Booking date — prefer ValDt, fall back to BookgDt
    let date = "";
    const valDtMatch = entry.match(/<ValDt>[\s\S]*?<Dt>([^<]+)<\/Dt>/);
    if (valDtMatch) {
      date = valDtMatch[1].trim();
    } else {
      const bookDtMatch = entry.match(/<BookgDt>[\s\S]*?<Dt>([^<]+)<\/Dt>/);
      if (bookDtMatch) date = bookDtMatch[1].trim();
    }

    const purpose = extractUstrd(entry);
    const counterparty = extractCounterparty(entry);

    transactions.push({ date, amount, currency, purpose, counterparty });
  }

  return transactions;
}
