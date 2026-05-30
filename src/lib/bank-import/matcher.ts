import type { BankTransaction } from "./camt-parser";

export interface InvoiceForMatching {
  id: number;
  invoice_number: string;
  gross_amount: number;
  client_name: string;
  due_date: string;
}

export type MatchConfidence = "high" | "medium" | "low";

export interface MatchResult {
  transaction: BankTransaction;
  invoice: InvoiceForMatching;
  confidence: MatchConfidence;
  reason: string;
}

export interface UnmatchedTransaction {
  transaction: BankTransaction;
}

export interface MatchReport {
  matched: MatchResult[];
  unmatched: UnmatchedTransaction[];
}

const AMOUNT_TOLERANCE = 0.005; // half-cent tolerance for float comparison

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < AMOUNT_TOLERANCE;
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/]/g, "");
}

function invoiceNumberInPurpose(invoiceNumber: string, purpose: string): boolean {
  const normPurpose = normalizeText(purpose);
  const normNumber = normalizeText(invoiceNumber);
  // Direct substring match or match without prefix separator
  if (normPurpose.includes(normNumber)) return true;
  // Also try matching just the numeric part (e.g. "0042" from "RE-2026-0042")
  const numericPart = invoiceNumber.replace(/^[A-Z]+-\d+-/, "");
  if (numericPart.length >= 3 && normPurpose.includes(numericPart)) return true;
  return false;
}

/**
 * Match bank transactions against open invoices.
 * Each transaction can match at most one invoice; each invoice at most once.
 * Priority: high confidence first, then medium, then low.
 */
export function matchTransactions(
  transactions: BankTransaction[],
  invoices: InvoiceForMatching[],
): MatchReport {
  // Pre-build candidates: invoice → amounts, so we can find unique amount matches
  const amountIndex = new Map<number, InvoiceForMatching[]>();
  for (const inv of invoices) {
    const key = Math.round(inv.gross_amount * 100); // cents
    const existing = amountIndex.get(key) ?? [];
    amountIndex.set(key, [...existing, inv]);
  }

  const usedInvoiceIds = new Set<number>();
  const usedTransactionIdxs = new Set<number>();

  // Collect all candidate matches with confidence
  const candidates: Array<{ txIdx: number; result: MatchResult }> = [];

  for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
    const tx = transactions[txIdx];
    const txCents = Math.round(tx.amount * 100);
    const amountCandidates = amountIndex.get(txCents) ?? [];

    for (const inv of invoices) {
      const hasNumberMatch = invoiceNumberInPurpose(inv.invoice_number, tx.purpose);
      const hasAmountMatch = amountsMatch(tx.amount, inv.gross_amount);

      if (!hasNumberMatch && !hasAmountMatch) continue;

      let confidence: MatchConfidence;
      let reason: string;

      if (hasNumberMatch && hasAmountMatch) {
        confidence = "high";
        reason = `Rechnungsnummer (${inv.invoice_number}) und Betrag (${tx.amount.toFixed(2)} €) stimmen überein`;
      } else if (hasNumberMatch) {
        confidence = "medium";
        reason = `Rechnungsnummer (${inv.invoice_number}) im Verwendungszweck gefunden`;
      } else {
        // Amount-only match — only use if this amount is unique among open invoices
        if (amountCandidates.length !== 1) continue;
        confidence = "low";
        reason = `Betrag (${tx.amount.toFixed(2)} €) passt eindeutig zu Rechnung ${inv.invoice_number}`;
      }

      candidates.push({ txIdx, result: { transaction: tx, invoice: inv, confidence, reason } });
    }
  }

  // Sort: high > medium > low, then by invoice due_date ascending
  const confidenceOrder: Record<MatchConfidence, number> = { high: 0, medium: 1, low: 2 };
  candidates.sort((a, b) => {
    const co = confidenceOrder[a.result.confidence] - confidenceOrder[b.result.confidence];
    if (co !== 0) return co;
    return a.result.invoice.due_date.localeCompare(b.result.invoice.due_date);
  });

  // Greedy assignment: first-come-first-served after sorting
  const matched: MatchResult[] = [];
  for (const { txIdx, result } of candidates) {
    if (usedTransactionIdxs.has(txIdx)) continue;
    if (usedInvoiceIds.has(result.invoice.id)) continue;
    matched.push(result);
    usedTransactionIdxs.add(txIdx);
    usedInvoiceIds.add(result.invoice.id);
  }

  const unmatched: UnmatchedTransaction[] = transactions
    .filter((_, i) => !usedTransactionIdxs.has(i))
    .map((transaction) => ({ transaction }));

  return { matched, unmatched };
}
