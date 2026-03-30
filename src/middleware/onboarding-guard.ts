import type { MiddlewareHandler } from "hono";
import { isOnboardingComplete } from "../db/queries";

const SKIP_PREFIXES = ["/onboarding", "/api/", "/static/"];

export const onboardingGuard: MiddlewareHandler = async (c, next) => {
  const path = new URL(c.req.url).pathname;

  if (SKIP_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  if (!isOnboardingComplete()) {
    return c.redirect("/onboarding");
  }

  return next();
};
