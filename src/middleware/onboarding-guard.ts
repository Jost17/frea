import { createMiddleware } from "hono/factory";
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
    // Fail-open: don't block the entire app if the onboarding check fails
    console.error("[onboarding-guard] Failed to check onboarding status:", err);
  }

  return next();
});

/** Reset cache — call after completeOnboarding() to ensure next check reads DB */
export function invalidateOnboardingCache(): void {
  onboardingDone = false;
}
