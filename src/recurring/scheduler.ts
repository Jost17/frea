import { getDueTemplates } from "./repository";
import { generateDraftFromTemplate } from "./service";

/**
 * Finds all active templates where next_due <= today and generates a draft
 * invoice for each. Called on server start — no silent failures.
 */
export function checkAndGenerateDue(): void {
  const today = new Date().toISOString().split("T")[0];
  const due = getDueTemplates(today);

  if (due.length === 0) return;

  console.log(`[recurring] ${due.length} fällige Vorlage(n) gefunden`);

  for (const template of due) {
    try {
      const invoiceId = generateDraftFromTemplate(template.id);
      console.log(
        `[recurring] Entwurf #${invoiceId} aus Vorlage #${template.id} "${template.title}" erstellt`,
      );
    } catch (err) {
      console.error(`[recurring] Fehler bei Vorlage #${template.id} "${template.title}":`, err);
    }
  }
}
