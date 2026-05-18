export interface IndustryPreset {
  label: string;
  description: string;
  vat_rate: number;
  kleinunternehmer: number;
  payment_days: number;
  invoice_prefix: string;
}

export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  IT: {
    label: "IT & Software",
    description: "Entwicklung, Beratung, SaaS",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 14,
    invoice_prefix: "RE",
  },
  BERATUNG: {
    label: "Unternehmensberatung",
    description: "Management, Strategie, Coaching",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 14,
    invoice_prefix: "RE",
  },
  KREATIV: {
    label: "Kreativ & Design",
    description: "Grafik, UX, Fotografie, Video",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 14,
    invoice_prefix: "RE",
  },
  HANDWERK: {
    label: "Handwerk & Bau",
    description: "Renovierung, Installation, Wartung",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 30,
    invoice_prefix: "RE",
  },
  GESUNDHEIT: {
    label: "Gesundheit & Wellness",
    description: "Therapie, Coaching, Beratung",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 14,
    invoice_prefix: "RE",
  },
  SONSTIGE: {
    label: "Sonstige Branchen",
    description: "Alle anderen Tätigkeiten",
    vat_rate: 0.19,
    kleinunternehmer: 0,
    payment_days: 30,
    invoice_prefix: "RE",
  },
};

export const DEFAULT_PRESET: IndustryPreset = INDUSTRY_PRESETS.SONSTIGE;
