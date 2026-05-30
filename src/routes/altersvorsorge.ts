import { Hono } from "hono";
import type { AppEnv } from "../env";
import { logAndRespond } from "../middleware/error-handler";
import {
  renderAltersvorsorgeIndex,
  renderBetrieblicheAv,
  renderGesetzlicheRv,
  renderPrivateVorsorge,
  renderRuerup,
} from "../templates/altersvorsorge";
import { Layout } from "../templates/layout";

export const altersvorsorgeRoutes = new Hono<AppEnv>();

// ─── GET /altersvorsorge — Übersicht ───────────────────────────────────────

altersvorsorgeRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Altersvorsorge",
        activeNav: "altersvorsorge",
        overdueCount,
        children: renderAltersvorsorgeIndex(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Altersvorsorge-Übersicht konnte nicht geladen werden", 500);
  }
});

// ─── GET /altersvorsorge/gesetzliche-rv ────────────────────────────────────

altersvorsorgeRoutes.get("/gesetzliche-rv", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Gesetzliche Rentenversicherung",
        activeNav: "altersvorsorge",
        overdueCount,
        children: renderGesetzlicheRv(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Seite konnte nicht geladen werden", 500);
  }
});

// ─── GET /altersvorsorge/ruerup ────────────────────────────────────────────

altersvorsorgeRoutes.get("/ruerup", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Rürup-Versicherung",
        activeNav: "altersvorsorge",
        overdueCount,
        children: renderRuerup(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Seite konnte nicht geladen werden", 500);
  }
});

// ─── GET /altersvorsorge/private-vorsorge ──────────────────────────────────

altersvorsorgeRoutes.get("/private-vorsorge", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Private Altersvorsorge",
        activeNav: "altersvorsorge",
        overdueCount,
        children: renderPrivateVorsorge(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Seite konnte nicht geladen werden", 500);
  }
});

// ─── GET /altersvorsorge/betriebliche-av ───────────────────────────────────

altersvorsorgeRoutes.get("/betriebliche-av", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Betriebliche Altersvorsorge",
        activeNav: "altersvorsorge",
        overdueCount,
        children: renderBetrieblicheAv(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Seite konnte nicht geladen werden", 500);
  }
});
