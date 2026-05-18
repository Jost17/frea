import QRCode from "qrcode";

interface EpcQrInput {
  recipientName: string;
  iban: string;
  bic?: string;
  amount: number;
  reference: string;
}

function buildEpcString(input: EpcQrInput): string {
  const { recipientName, iban, bic, amount, reference } = input;
  const amountStr = `EUR${amount.toFixed(2)}`;
  const bicStr = bic ?? "";
  // EPC069-12 format (GiroCode), version 002, encoding UTF-8 (2), transfer type SCT
  const lines = [
    "BCD",
    "002",
    "2",
    "SCT",
    bicStr,
    recipientName.slice(0, 70),
    iban.replace(/\s/g, ""),
    amountStr,
    "",
    "",
    reference.slice(0, 140),
  ];
  return lines.join("\n");
}

export async function generateEpcQrDataUrl(input: EpcQrInput): Promise<string | null> {
  if (!input.iban || !input.recipientName || input.amount <= 0) {
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
