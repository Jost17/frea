---
title: EPC069-12 GiroCode Correctness — Charset, Beneficiary, Injection, Byte-Cap
date: 2026-05-30
last_updated: 2026-05-30
category: design-patterns
module: pdf/epc-qr
problem_type: best_practice
component: invoice_pdf
severity: high
applies_when:
  - "Generating an EPC069-12 GiroCode (SEPA payment QR) on an invoice or any document"
  - "Encoding a position-based, newline-separated payload from user-controlled fields"
  - "Building any payment artifact where a wrong value silently routes or rejects real money"
related_components:
  - invoice_pdf
  - email_processing
tags:
  - epc069-12
  - girocode
  - sepa
  - qr-code
  - money-path
  - injection
  - utf-8
---

# EPC069-12 GiroCode Correctness

## Context

FREA #71 (FREA-258) added a GiroCode (EPC069-12 payment QR) to the invoice PDF so customers pay by scanning with a banking app. This is a money-path artifact: a wrong field silently routes payment to the wrong beneficiary, garbles the reference, or makes a spec-compliant scanner reject the code. CI and the first test pass were green, but an adversarial QA pass found four correctness defects that green never surfaced. This doc is the correctness checklist for any future EPC/GiroCode work (and the Peppol redo, issue #134).

The EPC069-12 payload is a strictly position-based, newline-separated string of 11 lines:

```
BCD            (1) service tag
002            (2) version
1              (3) character set  ← 1 = UTF-8, 2 = ISO 8859-1
SCT            (4) SEPA Credit Transfer
COBADEFFXXX    (5) BIC (optional in version 002)
Müller GmbH    (6) beneficiary name (≤70 chars) ← the ACCOUNT HOLDER
DE89...        (7) IBAN (no spaces)
EUR1234.50     (8) amount: "EUR" + value, dot decimal, 2 places, no thousands sep
               (9) purpose code (optional)
               (10) structured remittance (optional)
RE-2026-001    (11) unstructured remittance (reference, ≤140 chars)
```

## Guidance

Four defects to avoid, each verified against the EPC069-12 spec:

**1. Character set: `1` = UTF-8, NOT `2`.** Line 3 selects the charset. `2` is ISO 8859-1. The `qrcode` lib encodes the JS string as **UTF-8 bytes**, so the field MUST be `"1"`; declaring `"2"` while emitting UTF-8 bytes makes banking apps garble German umlauts (ä/ö/ü/ß) in the name and reference. A comment claiming "UTF-8 (2)" is a red flag — the code says one thing, the number says another.

**2. Beneficiary (line 6) is the account holder, never the bank.** Use `company_name` (the freelancer who receives the money), not `bank_name`. `bank_name` is "Commerzbank"; putting it in the beneficiary field is wrong and some banks match the name against the IBAN account holder and reject the transfer.

**3. Sanitize CR/LF in every interpolated field.** The payload is `\n`-joined and position-based. A newline inside `recipientName` or `reference` shifts every subsequent line — the IBAN moves to the amount's slot, etc. — so a scanner reads the wrong payee/IBAN/amount. `company_name` was only Zod `min(1)` (newlines pass). Flatten `[\r\n]+` to a space before assembling. This is an injection vector on a money document, not a cosmetic issue.

**4. Enforce the 331-byte total payload cap by bytes, not chars.** EPC069-12 caps the whole payload at 331 **bytes**. Per-field char limits (name ≤70, reference ≤140) do not bound the byte total: 70 umlaut chars = 140 UTF-8 bytes, and name + long reference + max amount can exceed 331 bytes → a spec-compliant scanner rejects the code. Truncate UTF-8-byte-safely (don't split a multibyte char) and give the reference whatever byte budget remains after the fixed lines. Also guard the EPC amount range (0.01–999999999.99).

## Why This Matters

Every one of these ships a QR that *looks* fine — it renders, scans, and the tests are green — but routes or formats real money wrong, or gets silently rejected at the bank. A freelancer whose invoice QR shows "Commerzbank" as payee, or whose umlaut name is mojibake, or whose long reference overflows the cap, loses payments and trust on the single artifact that exists to get them paid. None of the four were caught by unit tests asserting "a data URL is produced" — they were caught by checking each field against the actual EPC069-12 spec and by constructing adversarial inputs (umlaut name, embedded newline, max-length multibyte).

## When to Apply

- Building or reviewing any EPC069-12 / GiroCode generator.
- Encoding any position-based, delimiter-separated payload from user-controlled strings (sanitize the delimiter; bound by the encoding's byte budget).
- Any payment/financial artifact: verify each field against the spec, and unit-test the adversarial cases (multibyte, injected delimiter, max-length, range bounds), not just "output is non-empty".

## Examples

```typescript
// Sanitize the delimiter out of every interpolated field:
function sanitizeField(v: string): string {
  return v.replace(/[\r\n]+/g, " ").trim();
}

// UTF-8-byte-safe truncation (never split a multibyte char):
const UTF8 = new TextEncoder();
function clampField(v: string, maxChars: number, maxBytes: number): string {
  let out = v.slice(0, maxChars);
  while (out.length > 0 && UTF8.encode(out).length > maxBytes) out = out.slice(0, -1);
  return out;
}

// Fixed lines first; reference gets the remaining byte budget to honor the 331-byte cap:
const fixedLines = ["BCD", "002", "1", "SCT", bic, name, iban, `EUR${amount.toFixed(2)}`, "", ""];
const fixedBytes = UTF8.encode(`${fixedLines.join("\n")}\n`).length;
const ref = clampField(sanitizeField(reference), 140, Math.max(0, 331 - fixedBytes));
```

Adversarial tests that turn red on regression: name with umlauts (assert charset line is `"1"` and the umlaut survives), `recipientName = "Evil\nDE99\n9999"` (assert exactly 11 lines, IBAN/amount in their slots), `name = "ä".repeat(70)` + max amount (assert total ≤ 331 bytes), amount `> 999999999.99` (assert null).

## Related

- Implemented in `src/lib/pdf/epc-qr.ts`; tested in `tests/epc-qr.test.ts` (PR #71 / FREA-258).
- `verifier-green-is-not-qa-ship-ready-2026-05-30.md` and `pr-premise-is-an-unverified-read-path-2026-05-30.md` — same session; green tests/CI hid all four of these money-path bugs until the adversarial QA pass.
- Relevant to issue #134 (Peppol e-invoicing redo): another money-path artifact where each field must be spec-verified, not assumed.
