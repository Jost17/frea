import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ZF_NAMESPACE = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

function validateZUGFeRDXML(filePath: string): ValidationResult {
  const errors: string[] = [];

  try {
    const xml = readFileSync(filePath, "utf-8");

    // Basis-Checks: XML well-formedness + Root-Element
    if (!xml.includes("<?xml")) {
      errors.push("Missing XML declaration");
    }

    if (!xml.includes("rsm:CrossIndustryInvoice")) {
      errors.push("Missing rsm:CrossIndustryInvoice root element");
    }

    if (!xml.includes(ZF_NAMESPACE)) {
      errors.push(`Missing ZUGFeRD namespace ${ZF_NAMESPACE}`);
    }

    // Erforderliche Strukturen
    const requiredElements = [
      "rsm:ExchangedDocumentContext",
      "rsm:ExchangedDocument",
      "rsm:SupplyChainTradeTransaction",
      "ram:ID", // Document ID
      "ram:TypeCode", // 380 for invoice
      "ram:IssueDateTime",
      "ram:SellerTradeParty",
      "ram:BuyerTradeParty",
      "ram:ApplicableHeaderTradeSettlement",
      "ram:SpecifiedTradeSettlementHeaderMonetarySummation",
    ];

    for (const element of requiredElements) {
      if (!xml.includes(element)) {
        errors.push(`Missing required element: ${element}`);
      }
    }

    // Prüfe InvoiceCurrencyCode (sollte EUR sein)
    if (!xml.includes("EUR")) {
      errors.push("Missing or invalid currency code (expected EUR)");
    }

    // Prüfe dass GrandTotalAmount vorhanden ist
    if (!xml.includes("<ram:GrandTotalAmount>")) {
      errors.push("Missing GrandTotalAmount in settlement");
    }

    return {
      file: filePath,
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      file: filePath,
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

async function validateAllFixtures(): Promise<void> {
  const fixtureDir = resolve("src/__tests__/fixtures");
  const fixtures: string[] = [];

  try {
    const files = readdirSync(fixtureDir);
    for (const file of files) {
      if (file.endsWith(".xml")) {
        fixtures.push(join(fixtureDir, file));
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  if (fixtures.length === 0) {
    console.error("❌ No ZUGFeRD fixture files found");
    process.exit(1);
  }

  console.log(`Validating ${fixtures.length} ZUGFeRD fixture(s)...\n`);

  const results = fixtures.map((file: string) => validateZUGFeRDXML(file));
  let allValid = true;

  for (const result of results) {
    if (result.valid) {
      console.log(`✓ ${result.file}`);
    } else {
      console.error(`✗ ${result.file}`);
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
      allValid = false;
    }
  }

  if (!allValid) {
    console.error("\n❌ Some ZUGFeRD files are invalid");
    process.exit(1);
  }

  console.log("\n✓ All ZUGFeRD files are valid");
}

validateAllFixtures().catch((err) => {
  console.error("Validation script failed:", err);
  process.exit(1);
});
