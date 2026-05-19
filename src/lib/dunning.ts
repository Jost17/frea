import type { Invoice } from "../validation/schemas";

// ECB base rate for 2026 (Basiszinssatz nach §247 BGB)
// This should be updated quarterly. For production, fetch from ECB API.
const ECB_BASE_RATE = 2.5; // percent per annum

export type DunningLevel = 0 | 1 | 2 | 3;

export interface DunningState {
  level: DunningLevel;
  label: string;
  description: string;
  showVerzugszinsen: boolean;
}

export interface VerzugszinsenInfo {
  baseRate: number;
  compoundRate: number;
  businessDays: number;
  dailyAmount: number;
  totalAmount: number;
}

/**
 * Get the current dunning level (0-3) for an invoice.
 * 0 = fresh (no reminders sent)
 * 1 = Zahlungserinnerung sent
 * 2 = 1. Mahnung sent
 * 3 = 2. Mahnung sent (includes Verzugszinsen)
 */
export function getDunningLevel(invoice: Invoice): DunningLevel {
  const level = (invoice.reminder_level ?? 0) as DunningLevel;
  if (level > 3) return 3;
  if (level < 0) return 0;
  return level;
}

/**
 * Get human-readable label and description for a dunning level.
 */
export function getDunningState(level: DunningLevel): DunningState {
  switch (level) {
    case 0:
      return {
        level: 0,
        label: "Unbezahlt",
        description: "Keine Erinnerung gesendet",
        showVerzugszinsen: false,
      };
    case 1:
      return {
        level: 1,
        label: "Zahlungserinnerung",
        description: "Freundliche Zahlungserinnerung gesendet",
        showVerzugszinsen: false,
      };
    case 2:
      return {
        level: 2,
        label: "1. Mahnung",
        description: "Formelle 1. Mahnung gesendet",
        showVerzugszinsen: false,
      };
    case 3:
      return {
        level: 3,
        label: "2. Mahnung",
        description: "Endgültige 2. Mahnung mit Verzugszinsen",
        showVerzugszinsen: true,
      };
  }
}

/**
 * Get the next dunning action (level + description) for an invoice.
 * Returns null if invoice is already at level 3.
 */
export function getNextDunningAction(invoice: Invoice): {
  nextLevel: DunningLevel;
  label: string;
  daysUntilNext: number;
} | null {
  const currentLevel = getDunningLevel(invoice);
  if (currentLevel === 3) return null;

  const nextLevel = (currentLevel + 1) as DunningLevel;
  const nextState = getDunningState(nextLevel);

  // Dunning escalation timeline (§286/288 BGB):
  // Level 0→1: after payment_days + 7 days
  // Level 1→2: + 14 days
  // Level 2→3: + 14 days
  const daysUntilNext = currentLevel === 0 ? 7 : 14;

  return {
    nextLevel,
    label: nextState.label,
    daysUntilNext,
  };
}

/**
 * Calculate Verzugszinsen (late payment interest) per §288 BGB.
 * For B2B: 9 percentage points above ECB base rate
 * For consumers: 5 percentage points above ECB base rate
 *
 * isB2B is assumed true (most common for freelancer invoices).
 */
export function calculateVerzugszinsen(invoice: Invoice, isB2B = true): VerzugszinsenInfo {
  const baseRate = ECB_BASE_RATE;
  const compound = isB2B ? 9 : 5; // percentage points
  const compoundRate = baseRate + compound;

  // Days between due_date and today
  const dueDateObj = new Date(invoice.due_date);
  dueDateObj.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const businessDays = Math.max(
    0,
    Math.ceil((today.getTime() - dueDateObj.getTime()) / (24 * 60 * 60 * 1000)),
  );

  // Daily interest = (gross_amount × compoundRate%) / 365
  const dailyAmount = (invoice.gross_amount * (compoundRate / 100)) / 365;
  const totalAmount = dailyAmount * businessDays;

  return {
    baseRate,
    compoundRate,
    businessDays,
    dailyAmount: Math.round(dailyAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Check if an invoice is overdue (past due_date).
 */
export function isInvoiceOverdue(invoice: Invoice): boolean {
  const today = new Date().toISOString().split("T")[0];
  return invoice.due_date < today && (invoice.status === "sent" || invoice.status === "draft");
}

/**
 * Get days overdue for an invoice.
 */
export function getDaysOverdue(invoice: Invoice): number {
  if (!isInvoiceOverdue(invoice)) return 0;
  const dueDateObj = new Date(invoice.due_date);
  dueDateObj.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - dueDateObj.getTime()) / (24 * 60 * 60 * 1000));
}
