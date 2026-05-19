import { Hono } from "hono";
import { z } from "zod";
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserCount,
  insertAuthLog,
  updateUserEmail,
  updateUserPassword,
} from "../db/auth-queries";
import {
  anonymizePersonalData,
  deactivateUser,
  deleteAllBusinessData,
  exportAllData,
} from "../db/dsgvo-queries";
import type { AppEnv } from "../env";
import { hashPassword, verifyPassword } from "../lib/auth";
import {
  renderAccountPage,
  renderAccountSetupPage,
  renderEmailForm,
  renderPasswordForm,
} from "../templates/account-page";
import { Layout } from "../templates/layout";

export const accountRoutes = new Hono<AppEnv>();

const passwordChangeSchema = z.object({
  current_password: z.string().min(1, "Aktuelles Passwort erforderlich"),
  new_password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  new_password_confirm: z.string().min(1, "Passwort-Bestätigung erforderlich"),
});

const emailChangeSchema = z.object({
  new_email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  password: z.string().min(1, "Passwort zur Bestätigung erforderlich"),
});

const setupSchema = z.object({
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  password_confirm: z.string().min(1, "Passwort-Bestätigung erforderlich"),
});

const dsgvoDeleteSchema = z.object({
  password: z.string().min(1, "Passwort zur Bestätigung erforderlich"),
});

accountRoutes.get("/konto", (c) => {
  const overdueCount = c.get("overdueCount");
  const userId = c.get("userId") as number | undefined;

  if (!userId && getUserCount() === 0) {
    return c.html(
      Layout({
        title: "Konto einrichten",
        activeNav: "einstellungen",
        overdueCount,
        children: renderAccountSetupPage({}),
      }),
    );
  }

  if (!userId) {
    return c.redirect("/auth/login");
  }

  const user = getUserById(userId);
  if (!user) {
    return c.redirect("/auth/login");
  }

  return c.html(
    Layout({
      title: "Konto",
      activeNav: "einstellungen",
      overdueCount,
      children: renderAccountPage({ email: user.email }),
    }),
  );
});

accountRoutes.post("/konto/einrichten", async (c) => {
  const overdueCount = c.get("overdueCount");

  if (getUserCount() > 0) {
    return c.html(renderAccountSetupPage({ error: "Ein Konto ist bereits eingerichtet." }), 400);
  }

  const body = await c.req.parseBody();
  const parsed = setupSchema.safeParse({
    email: body.email,
    password: body.password,
    password_confirm: body.password_confirm,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
    return c.html(
      Layout({
        title: "Konto einrichten",
        activeNav: "einstellungen",
        overdueCount,
        children: renderAccountSetupPage({ error: msg }),
      }),
      400,
    );
  }

  const { email, password, password_confirm } = parsed.data;

  if (password !== password_confirm) {
    return c.html(
      Layout({
        title: "Konto einrichten",
        activeNav: "einstellungen",
        overdueCount,
        children: renderAccountSetupPage({ error: "Passwörter stimmen nicht überein." }),
      }),
      400,
    );
  }

  if (getUserByEmail(email)) {
    return c.html(
      Layout({
        title: "Konto einrichten",
        activeNav: "einstellungen",
        overdueCount,
        children: renderAccountSetupPage({ error: "Diese E-Mail-Adresse ist bereits vergeben." }),
      }),
      400,
    );
  }

  try {
    const hash = await hashPassword(password);
    createUser(email, hash);
    return c.redirect("/auth/login");
  } catch (err) {
    console.error("[account] User creation failed:", err);
    return c.html(
      Layout({
        title: "Konto einrichten",
        activeNav: "einstellungen",
        overdueCount,
        children: renderAccountSetupPage({ error: "Konto konnte nicht angelegt werden." }),
      }),
      500,
    );
  }
});

accountRoutes.post("/konto/passwort", async (c) => {
  const userId = c.get("userId") as number | undefined;
  if (!userId) {
    return c.redirect("/auth/login");
  }

  const user = getUserById(userId);
  if (!user) {
    return c.redirect("/auth/login");
  }

  const body = await c.req.parseBody();
  const parsed = passwordChangeSchema.safeParse({
    current_password: body.current_password,
    new_password: body.new_password,
    new_password_confirm: body.new_password_confirm,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
    return c.html(renderPasswordForm(msg), 400);
  }

  const { current_password, new_password, new_password_confirm } = parsed.data;

  if (new_password !== new_password_confirm) {
    return c.html(renderPasswordForm("Neue Passwörter stimmen nicht überein."), 400);
  }

  const currentValid = await verifyPassword(current_password, user.password_hash);
  if (!currentValid) {
    insertAuthLog("password_changed", userId, undefined, "failed: wrong current password");
    return c.html(renderPasswordForm("Aktuelles Passwort ist falsch."), 401);
  }

  try {
    const newHash = await hashPassword(new_password);
    updateUserPassword(userId, newHash);
    insertAuthLog("password_changed", userId);
    return c.html(renderPasswordForm(undefined, true));
  } catch (err) {
    console.error("[account] Password change failed:", err);
    return c.html(renderPasswordForm("Passwort konnte nicht geändert werden."), 500);
  }
});

accountRoutes.post("/konto/email", async (c) => {
  const userId = c.get("userId") as number | undefined;
  if (!userId) {
    return c.redirect("/auth/login");
  }

  const user = getUserById(userId);
  if (!user) {
    return c.redirect("/auth/login");
  }

  const body = await c.req.parseBody();
  const parsed = emailChangeSchema.safeParse({
    new_email: body.new_email,
    password: body.password,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
    return c.html(renderEmailForm(user.email, msg), 400);
  }

  const { new_email, password } = parsed.data;

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    insertAuthLog("email_changed", userId, undefined, "failed: wrong password");
    return c.html(renderEmailForm(user.email, "Passwort ist falsch."), 401);
  }

  if (getUserByEmail(new_email)) {
    return c.html(renderEmailForm(user.email, "Diese E-Mail-Adresse ist bereits vergeben."), 400);
  }

  try {
    updateUserEmail(userId, new_email);
    insertAuthLog("email_changed", userId, undefined, `new_email=${new_email}`);
    return c.html(renderEmailForm(new_email, undefined, true));
  } catch (err) {
    console.error("[account] Email change failed:", err);
    return c.html(renderEmailForm(user.email, "E-Mail konnte nicht geändert werden."), 500);
  }
});

accountRoutes.post("/dsgvo/export", async (c) => {
  const userId = c.get("userId") as number | undefined;
  if (!userId) {
    return c.redirect("/auth/login");
  }

  try {
    const data = exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().split("T")[0];

    return c.text(jsonStr, 200, {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="dsgvo-export-${timestamp}.json"`,
    });
  } catch (err) {
    console.error("[dsgvo] Export failed:", err);
    const user = getUserById(userId);
    return c.html(
      Layout({
        title: "Konto",
        activeNav: "einstellungen",
        overdueCount: c.get("overdueCount"),
        children: renderAccountPage({
          email: user?.email || "",
          dsgvoError: "Datenexport fehlgeschlagen.",
        }),
      }),
      500,
    );
  }
});

accountRoutes.post("/dsgvo/loeschen", async (c) => {
  const userId = c.get("userId") as number | undefined;
  if (!userId) {
    return c.redirect("/auth/login");
  }

  const user = getUserById(userId);
  if (!user) {
    return c.redirect("/auth/login");
  }

  const body = await c.req.parseBody();
  const parsed = dsgvoDeleteSchema.safeParse({
    password: body.password,
  });

  if (!parsed.success) {
    return c.html(
      Layout({
        title: "Konto",
        activeNav: "einstellungen",
        overdueCount: c.get("overdueCount"),
        children: renderAccountPage({ email: user.email, dsgvoError: "Passwort erforderlich." }),
      }),
      400,
    );
  }

  const passwordValid = await verifyPassword(parsed.data.password, user.password_hash);
  if (!passwordValid) {
    insertAuthLog("account_deletion", userId, undefined, "failed: wrong password");
    return c.html(
      Layout({
        title: "Konto",
        activeNav: "einstellungen",
        overdueCount: c.get("overdueCount"),
        children: renderAccountPage({ email: user.email, dsgvoError: "Passwort ist falsch." }),
      }),
      401,
    );
  }

  try {
    deleteAllBusinessData();
    anonymizePersonalData();
    deactivateUser(userId);
    insertAuthLog("account_deletion", userId, undefined, "success");

    return c.redirect("/auth/logout");
  } catch (err) {
    console.error("[dsgvo] Deletion failed:", err);
    return c.html(
      Layout({
        title: "Konto",
        activeNav: "einstellungen",
        overdueCount: c.get("overdueCount"),
        children: renderAccountPage({
          email: user.email,
          dsgvoError: "Datenlöschung fehlgeschlagen.",
        }),
      }),
      500,
    );
  }
});
