import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { html } from "hono/html";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { Layout } from "../templates/layout";

// Shared error class for typed errors across all routes
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: ContentfulStatusCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function generateErrorId(): string {
  return `ERR-${crypto.randomUUID().slice(0, 8)}`;
}

export function logAndRespond(
  c: Context,
  error: unknown,
  userMessage: string,
  status: ContentfulStatusCode = 500,
): Response {
  const eid = generateErrorId();
  console.error(`[${eid}] ${userMessage}:`, error);
  return c.text(`${userMessage} (${eid})`, status);
}

/**
 * Renders a user-friendly HTML error alert for form mutations.
 * Shows the error message in a styled alert box with retry instructions.
 */
function renderFormError(message: string, errorId?: string): string {
  return `<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
    <div class="flex items-center gap-2">
      <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm font-medium text-red-800">${message}</p>
    </div>
    ${errorId ? `<p class="mt-1 text-xs text-red-600">Fehler-ID: ${errorId}</p>` : ""}
    <p class="mt-2 text-xs text-red-700">Bitte korrigiere die Eingabe und versuche es erneut.</p>
  </div>`;
}

/**
 * Shared error handler for form mutation routes (POST create/update).
 * Catches ZodError (422), AppError (re-throw), and unknown errors (500).
 * Returns HTML error alerts for user-friendly display.
 */
export function handleMutationError(c: Context, err: unknown, fallbackMsg: string): Response {
  if (err instanceof AppError) throw err;
  if (err instanceof ZodError) {
    const eid = generateErrorId();
    const msg = err.issues[0]?.message ?? "Ungültige Eingabe";
    console.error(`[${eid}] Validation error:`, err);
    return c.html(renderFormError(msg, eid), 422);
  }
  const eid = generateErrorId();
  console.error(`[${eid}] ${fallbackMsg}:`, err);
  return c.html(renderFormError(fallbackMsg, eid), 500);
}

export const globalErrorHandler: ErrorHandler = (err, c) => {
  const errorId = generateErrorId();
  const status = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : "Interner Serverfehler";

  console.error(`[${errorId}] ${err.message}`, status >= 500 ? err.stack : "");

  if (c.req.path.startsWith("/api")) {
    return c.json({ error: message, errorId }, status);
  }

  return c.html(errorPage(status, message, errorId), status);
};

export const globalNotFoundHandler: NotFoundHandler = (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.html(errorPage(404, "Seite nicht gefunden"), 404);
};

function errorPage(status: number, message: string, errorId?: string) {
  return Layout({
    title: "Fehler",
    overdueCount: 0,
    children: html`
      <div class="max-w-lg mx-auto mt-16 text-center">
        <h1 class="text-lg font-semibold mb-2">
          ${status >= 500 ? "Ein Fehler ist aufgetreten" : status === 404 ? "Seite nicht gefunden" : "Anfrage fehlgeschlagen"}
        </h1>
        <p class="text-sm text-gray-600 mb-4">${message}</p>
        ${errorId ? html`<p class="text-xs text-gray-400 mb-4">Fehler-ID: ${errorId}</p>` : ""}
        <a href="javascript:history.back()" class="text-blue-600 hover:underline">← Zurück</a>
      </div>
    `,
  });
}
