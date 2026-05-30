import QRCode from "qrcode";

interface EpcQrInput {
  recipientName: string;
  iban: string;
  bic?: string;
  amount: number;
  reference: string;
}

// EPC069-12 limits.
const MAX_NAME_CHARS = 70;
const MAX_REFERENCE_CHARS = 140;
const MAX_PAYLOAD_BYTES = 331;
const MAX_AMOUNT = 999999999.99;

const UTF8 = new TextEncoder();

// The payload is a strictly position-based, newline-separated format. Any literal
// CR/LF inside a field would shift every subsequent line and produce a QR that
// scans to the wrong beneficiary/IBAN/amount — so flatten line breaks to spaces.
function sanitizeField(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

// Truncate to at most `maxChars` characters AND `maxBytes` UTF-8 bytes without
// splitting a multibyte character.
function clampField(value: string, maxChars: number, maxBytes: number): string {
  let out = value.slice(0, maxChars);
  while (out.length > 0 && UTF8.encode(out).length > maxBytes) {
    out = out.slice(0, -1);
  }
  return out;
}

export function buildEpcString(input: EpcQrInput): string {
  const { iban, bic, amount, reference } = input;
  const amountStr = `EUR${amount.toFixed(2)}`;
  const bicStr = sanitizeField(bic ?? "");
  const ibanStr = iban.replace(/\s/g, "");
  const name = clampField(sanitizeField(input.recipientName), MAX_NAME_CHARS, MAX_PAYLOAD_BYTES);

  // Fixed lines + separators; whatever byte budget remains goes to the reference
  // so the assembled payload never exceeds the EPC 331-byte cap.
  const fixedLines = ["BCD", "002", "1", "SCT", bicStr, name, ibanStr, amountStr, "", ""];
  const fixedBytes = UTF8.encode(`${fixedLines.join("\n")}\n`).length;
  const referenceBudget = Math.max(0, MAX_PAYLOAD_BYTES - fixedBytes);
  const ref = clampField(sanitizeField(reference), MAX_REFERENCE_CHARS, referenceBudget);

  return [...fixedLines, ref].join("\n");
}

export async function generateEpcQrDataUrl(input: EpcQrInput): Promise<string | null> {
  if (!input.iban || !input.recipientName || input.amount <= 0 || input.amount > MAX_AMOUNT) {
    return null;
  }
  try {
    const epcString = buildEpcString(input);
    const dataUrl = await QRCode.toDataURL(epcString, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 120,
    });
    return dataUrl;
  } catch (err) {
    console.error("EPC QR generation failed", err);
    return null;
  }
}
