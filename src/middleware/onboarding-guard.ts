import type { MiddlewareHandler } from "hono";
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
    // DB failure in guard — fail open so the app remains reachable for diagnostics.
    // The error is logged with context so it's distinguishable from route errors.
    console.error("[onboardingGuard] DB check failed, failing open:", err);
    return next();
  }

  if (!complete) {
    return c.redirect("/onboarding");
  }

  return next();
};
