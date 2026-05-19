import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { getSession, getUserCount } from "../db/auth-queries";
import type { AppEnv } from "../env";

const SESSION_COOKIE = "FREA_SESSION";

const PUBLIC_PATHS = ["/auth/login", "/auth/logout", "/static/", "/mcp"];

export const authGuard = createMiddleware<AppEnv>(async (c, next) => {
  const path = c.req.path;

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }

  // First-run mode: no users registered yet, skip auth
  if (getUserCount() === 0) {
    return next();
  }

  const sessionId = getCookie(c, SESSION_COOKIE);
  if (!sessionId) {
    return c.redirect("/auth/login");
  }

  const session = getSession(sessionId);
  if (!session) {
    return c.redirect("/auth/login");
  }

  c.set("userId", session.user_id);
  return next();
});
