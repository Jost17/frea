import type { Context } from "hono";

const TOAST_QUERY_KEY = "toast";

export function getToastMessage(c: Context): string | undefined {
  const message = c.req.query(TOAST_QUERY_KEY)?.trim();
  if (!message) return undefined;
  return message.slice(0, 180);
}

export function withToastQuery(path: string, message: string): string {
  const baseUrl = "http://localhost";
  const url = new URL(path, baseUrl);
  url.searchParams.set(TOAST_QUERY_KEY, message);
  return `${url.pathname}${url.search}`;
}
