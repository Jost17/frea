/**
 * ZUGFeRD XML Generator
 * EN16931 (Comfort) profile für deutsche B2B-Rechnungen
 * Anforderung: https://www.ferd-net.de/standards/zunorm/index.html
 */

export type VATCategory = "S" | "E" | "AE";

export interface VATInfo {
  categoryCode: VATCategory;
  exemptionReason?: string;
}

export interface SellerInfo {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  taxNumber: string; // Steuernummer (BT-32 schemeID="FC")
  vatId?: string; // USt-ID (BT-31 schemeID="VA")
}

export interface BuyerInfo {
  name: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  email?: string; // BT-49
  vatId?: string; // BT-48
  reference: string; // BT-10
}

export interface PaymentInfo {
  iban: string;
  bic: string;
  accountName?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
}

export interface InvoiceTotals {
  netAmount: number;
  vatRate: number; // Dezimal z.B. 0.19 oder 0 (Kleinunternehmer)
  vatAmount: number; // Math.round(netAmount * vatRate * 100) / 100
  grossAmount: number; // netAmount + vatAmount
}

export interface ZUGFeRDInvoiceData {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  periodMonth: number;
  periodYear: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  seller: SellerInfo;
  buyer: BuyerInfo;
  payment: PaymentInfo;
  vat: VATInfo;
  lineItems: LineItem[];
  totals: InvoiceTotals;
}

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function generateZUGFeRDXML(data: ZUGFeRDInvoiceData): string {
  const vatPercent = (data.totals.vatRate * 100).toFixed(2);
  const monthName = MONTH_NAMES[data.periodMonth - 1] || `Monat ${data.periodMonth}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:BusinessProcessSpecifiedDocumentContextParameter>
      <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>
    </ram:BusinessProcessSpecifiedDocumentContextParameter>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(data.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDateForXML(data.invoiceDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>Rechnung für ${escapeXml(monthName)} ${data.periodYear}</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${data.lineItems.map((item, i) => buildLineItem(item, i, data.vat.categoryCode, vatPercent)).join("")}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${escapeXml(data.buyer.reference)}</ram:BuyerReference>
${buildSellerParty(data.seller)}
${buildBuyerParty(data.buyer)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDateForXML(data.invoiceDate)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
${buildSettlement(data, vatPercent)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function buildLineItem(
  item: LineItem,
  index: number,
  vatCategoryCode: VATCategory,
  vatPercent: string,
): string {
  return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:GrossPriceProductTradePrice>
          <ram:ChargeAmount>${formatAmount(item.unitPrice)}</ram:ChargeAmount>
        </ram:GrossPriceProductTradePrice>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${formatAmount(item.unitPrice)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="DAY">${formatAmount(item.quantity)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${vatCategoryCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${vatPercent}</ram:RateApplicablePercent>${
            vatCategoryCode === "E" ? `\n          <ram:ExemptionReasonCode>VATEX-EU-132</ram:ExemptionReasonCode>` : ""
          }
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${formatAmount(item.netAmount)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
`;
}

function buildSellerParty(seller: SellerInfo): string {
  const vatIdBlock = seller.vatId
    ? `\n      <ram:SpecifiedTaxRegistration>
        <ram:ID schemeID="VA">${escapeXml(seller.vatId)}</ram:ID>
      </ram:SpecifiedTaxRegistration>`
    : "";

  return `      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(seller.name)}</ram:Name>
        <ram:SpecifiedLegalOrganization>
          <ram:ID>${escapeXml(seller.taxNumber)}</ram:ID>
        </ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(seller.postalCode)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(seller.address)}</ram:LineOne>
          <ram:CityName>${escapeXml(seller.city)}</ram:CityName>
          <ram:CountryID>${countryToISO(seller.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(seller.email)}</ram:URIID>
        </ram:URIUniversalCommunication>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${escapeXml(seller.taxNumber)}</ram:ID>
        </ram:SpecifiedTaxRegistration>${vatIdBlock}
      </ram:SellerTradeParty>`;
}

function buildBuyerParty(buyer: BuyerInfo): string {
  const addressFields = [
    buyer.postalCode && `<ram:PostcodeCode>${escapeXml(buyer.postalCode)}</ram:PostcodeCode>`,
    buyer.address && `<ram:LineOne>${escapeXml(buyer.address)}</ram:LineOne>`,
    buyer.city && `<ram:CityName>${escapeXml(buyer.city)}</ram:CityName>`,
    `<ram:CountryID>${countryToISO(buyer.country)}</ram:CountryID>`,
  ].filter(Boolean);

  const emailBlock = buyer.email
    ? `\n        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(buyer.email)}</ram:URIID>
        </ram:URIUniversalCommunication>`
    : "";

  const vatIdBlock = buyer.vatId
    ? `\n        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(buyer.vatId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
    : "";

  return `      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(buyer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          ${addressFields.join("\n          ")}
        </ram:PostalTradeAddress>${emailBlock}${vatIdBlock}
      </ram:BuyerTradeParty>`;
}

function buildSettlement(data: ZUGFeRDInvoiceData, vatPercent: string): string {
  const exemptionLine = data.vat.exemptionReason
    ? `\n        <ram:ExemptionReason>${escapeXml(data.vat.exemptionReason)}</ram:ExemptionReason>`
    : data.vat.categoryCode === "E"
      ? `\n        <ram:ExemptionReasonCode>VATEX-EU-132</ram:ExemptionReasonCode>`
      : "";

  return `    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${escapeXml(data.invoiceNumber)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXml(data.payment.iban.replace(/\s/g, ""))}</ram:IBANID>${
            data.payment.accountName
              ? `
          <ram:AccountName>${escapeXml(data.payment.accountName)}</ram:AccountName>`
              : ""
          }
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${escapeXml(data.payment.bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formatAmount(data.totals.vatAmount)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${exemptionLine}
        <ram:BasisAmount>${formatAmount(data.totals.netAmount)}</ram:BasisAmount>
        <ram:CategoryCode>${data.vat.categoryCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${vatPercent}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:BillingSpecifiedPeriod>
        <ram:StartDateTime>
          <udt:DateTimeString format="102">${formatDateForXML(data.periodStart)}</udt:DateTimeString>
        </ram:StartDateTime>
        <ram:EndDateTime>
          <udt:DateTimeString format="102">${formatDateForXML(data.periodEnd)}</udt:DateTimeString>
        </ram:EndDateTime>
      </ram:BillingSpecifiedPeriod>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Zahlbar bis ${formatDateForDisplay(data.dueDate)}</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateForXML(data.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatAmount(data.totals.netAmount)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${formatAmount(data.totals.netAmount)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${formatAmount(data.totals.vatAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatAmount(data.totals.grossAmount)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${formatAmount(data.totals.grossAmount)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>`;
}

function escapeXml(text: string | null | undefined): string {
  if (text == null) return "";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: XML-Kontrollzeichen entfernen
  const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function formatDateForXML(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function formatDateForDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const monthName = MONTH_NAMES[parseInt(month) - 1] || month;
  return `${day}. ${monthName} ${year}`;
}

function countryToISO(country: string): string {
  if (/^[A-Z]{2}$/.test(country)) return country;
  const map: Record<string, string> = {
    Deutschland: "DE",
    Österreich: "AT",
    Schweiz: "CH",
    Niederlande: "NL",
  };
  return map[country] || country;
}
