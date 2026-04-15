---
status: pending
priority: p2
issue_id: "023"
tags: [code-review, security, validation, eu-compliance]
dependencies: []
---

# 023 — `accent_color` unvalidiert → CSS-Injection ins Inline-`style` Attribut

## Problem Statement

`invoice_layout_config.accent_color` ist als `z.string().default("#2563eb")` typisiert, ohne Format-Refinement. Der Wert wird in `style="background-color: ${accent}"` interpoliert. Hono escaped `"` korrekt (kein Attribute-Breakout), aber ein User kann CSS injizieren wie `red; background-image: url(https://attacker.example/pixel.png)` — und damit die EU-Compliance-Regel ("no external CDN requests", ADR-001) umgehen. Die CSP blockiert das im Browser, aber Input-Validation gehört an den Boundary.

## Findings

**Location 1 — Schema:** `src/validation/schemas.ts:71`
```ts
accent_color: z.string().default("#2563eb"),
```

**Location 2 — Sink:** `src/templates/invoice-detail.ts:41, 60`
```ts
<div style="background-color: ${accent}">
<div style="border-top: 4px solid ${accent}">
```

**Attack vector:** User stored value `red; background-image: url(https://evil.example/pixel.png)` → outbound HTTP-Request beim Invoice-View. CSP (`img-src 'self' data:`) blockiert das im Default-Browser, aber:
- Relying on CSP für Input-Validation ist Defense-in-Depth-only, nicht Primary
- ADR-001 EU-Compliance verlangt "keine externen CDN-Requests" — das muss am Input-Boundary validiert werden
- PDF-Renderer (wenn später kommt) hat keine CSP und würde das Request ausführen

**Gefunden von:** security-sentinel (P2-3).

## Proposed Solutions

### Option A: Hex-Regex im Schema (empfohlen, 3 min)

```ts
accent_color: z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Akzentfarbe muss Hex-Format sein (#RRGGBB)")
  .default("#2563eb"),
```

**Effort:** Trivial | **Risk:** None | **Pattern:** Anwendbar auf alle zukünftigen Color-Fields

### Option B: CSS Custom Properties + predefined palette

Kein user-input CSS, nur ausgewählte Farben aus vordefinierter Palette. Mehr UX-Arbeit.

**Empfehlung:** Option A jetzt, Option B wenn Palette-Feature kommt.

## Acceptance Criteria

- [ ] `accent_color` im Schema regex-validiert
- [ ] Test: `"red; background-image: url(...)"` → ZodError
- [ ] Test: `"#2563eb"` → OK
- [ ] Test: `"#abc"` (short hex) → ZodError (wir wollen #RRGGBB)
- [ ] Error-Message ist deutsch und user-freundlich

## Work Log

- 2026-04-15: Gefunden von security-sentinel in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- ADR: `docs/adr/001-eu-compliance.md`
- Betroffene Datei: `src/validation/schemas.ts:71`
