import { createMiddleware } from "hono/factory";
import { getOverdueInvoiceCount } from "../db/queries";
import type { AppEnv } from "../env";

export const navContextMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("overdueCount", getOverdueInvoiceCount());
  await next();
});
