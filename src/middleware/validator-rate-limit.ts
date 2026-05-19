import type { MiddlewareHandler } from "hono";
import { AppError } from "./error-handler";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const requestLog = new Map<string, number[]>();

function getClientIp(c: Parameters<MiddlewareHandler>[0]): string {
  return (
    c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export const validatorRateLimit: MiddlewareHandler = async (c, next) => {
  if (process.env.NODE_ENV === "test") return next();

  const ip = getClientIp(c);
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    throw new AppError(
      `Zu viele Prüfanfragen. Bitte warten Sie eine Minute (max. ${MAX_REQUESTS} Validierungen/Minute).`,
      429,
    );
  }

  recent.push(now);
  requestLog.set(ip, recent);

  return next();
};
