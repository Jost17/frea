import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { html } from "hono/html";
import type { ContentfulStatusCode } from "hono/utils/http-status";
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
