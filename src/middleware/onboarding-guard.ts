import type { MiddlewareHandler } from "hono";
import { html } from "hono/html";
import { isOnboardingComplete } from "../db/queries";

const SKIP_PREFIXES = ["/onboarding", "/api/", "/static/"];

export const onboardingGuard: MiddlewareHandler = async (c, next) => {
  const path = new URL(c.req.url).pathname;

  if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  let complete: boolean;
  try {
    complete = isOnboardingComplete();
  } catch (err) {
    // DB failure in guard — fail CLOSED. Returning 503 prevents access to an app
    // that can't read its own config. Users see a clear error instead of cascading
    // failures on every subsequent DB query.
    console.error("[onboardingGuard] DB check failed, returning 503:", err);
    return c.html(
      html`<!doctype html>
        <html lang="de">
          <head><title>FREA — Datenbankfehler</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:4rem">
            <h1>Datenbankfehler</h1>
            <p>Die Datenbank ist nicht erreichbar. Bitte starte die App neu.</p>
          </body>
        </html>`,
      503,
    );
  }

  if (!complete) {
    return c.redirect("/onboarding");
  }

  return next();
};
