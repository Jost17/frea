import { createMiddleware } from "hono/factory";
import { html } from "hono/html";
import { isOnboardingComplete } from "../db/queries";
import type { AppEnv } from "../env";

// Cache: onboarding status changes exactly once (false → true), never reverts
let onboardingDone = false;

export const onboardingGuard = createMiddleware<AppEnv>(async (c, next) => {
  if (onboardingDone) return next();

  const path = c.req.path;
  const isSettingsPath = path.startsWith("/einstellungen");
  // /static and /api are excluded: static assets need no guard,
  // API routes (health, stats) must remain accessible during setup.
  // NOTE: Any future API endpoint that mutates data should check onboarding individually.
  const isExcludedPath = path.startsWith("/static") || path.startsWith("/api");

  if (isSettingsPath || isExcludedPath) return next();

  try {
    if (!isOnboardingComplete()) {
      return c.redirect("/einstellungen?onboarding=1");
    }
    onboardingDone = true;
  } catch (err) {
    // Fail CLOSED: returning 503 prevents access to an app that can't read its config.
    // Users see a clear error instead of cascading failures on every DB query.
    console.error("[onboarding-guard] DB check failed, returning 503:", err);
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

  return next();
});

/** Reset cache — call after completeOnboarding() to ensure next check reads DB */
export function invalidateOnboardingCache(): void {
  onboardingDone = false;
}
