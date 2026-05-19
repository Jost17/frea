import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { createSession, deleteSession, getUserByEmail, updateLastLogin } from "../db/auth-queries";
import { db } from "../db/schema";
import type { AppEnv } from "../env";
import { hashPassword, verifyPassword } from "../lib/auth";

export const authRoutes = new Hono<AppEnv>();

const SESSION_COOKIE = "FREA_SESSION";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 Stunden

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort erforderlich"),
});

function loginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FREA – Anmelden</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">FREA</h1>
      <p class="text-gray-500 text-sm mt-1">Kunden · Projekte · Rechnungen</p>
    </div>
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Anmelden</h2>
      ${error ? `<div class="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">${error}</div>` : ""}
      <form method="POST" action="/auth/login" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autocomplete="email"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Anmelden
        </button>
      </form>
    </div>
  </div>
</body>
</html>`;
}

authRoutes.get("/login", (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    // Redirect if already have a valid session (checked by auth middleware upstream)
    return c.redirect("/");
  }
  return c.html(loginPage());
});

authRoutes.post("/login", async (c) => {
  const formData = await c.req.formData();
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
    return c.html(loginPage(msg), 400);
  }

  const { email, password } = parsed.data;
  const user = getUserByEmail(email);

  if (!user) {
    logAudit("login_failed", email);
    return c.html(loginPage("Ungültige E-Mail oder Passwort"), 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    logAudit("login_failed", email);
    return c.html(loginPage("Ungültige E-Mail oder Passwort"), 401);
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  createSession(sessionId, user.id, expiresAt);
  updateLastLogin(user.id);
  logAudit("login_success", email);

  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV !== "test",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return c.redirect("/");
});

authRoutes.post("/logout", (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    deleteSession(sessionId);
    logAudit("logout", sessionId);
  }

  setCookie(c, SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV !== "test",
    path: "/",
    maxAge: 0,
  });

  return c.redirect("/auth/login");
});

function logAudit(action: string, identifier: string): void {
  try {
    db.prepare(
      `INSERT INTO audit_log (entity_type, entity_id, action, changes, source)
       VALUES ('user', 0, 'create', ?, 'web')`,
    ).run(JSON.stringify({ event: action, identifier }));
  } catch (err) {
    console.error("[auth] Audit-Log-Eintrag fehlgeschlagen:", err);
  }
}

export async function ensureDefaultUser(): Promise<void> {
  const existing = getUserByEmail("demo@frea.local");
  if (!existing) {
    const hash = await hashPassword("demo");
    try {
      const { createUser } = await import("../db/auth-queries");
      createUser("demo@frea.local", hash);
      console.log("[auth] Demo-Benutzer angelegt: demo@frea.local / demo");
    } catch (err) {
      console.error("[auth] Demo-Benutzer konnte nicht angelegt werden:", err);
    }
  }
}
