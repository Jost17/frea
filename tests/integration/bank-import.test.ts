import { describe, test, expect } from "bun:test";
import { parseCamt053 } from "../../src/lib/bank-import/camt-parser";
import { parseBankCsv } from "../../src/lib/bank-import/csv-parser";
import { matchTransactions } from "../../src/lib/bank-import/matcher";
import type { InvoiceForMatching } from "../../src/lib/bank-import/matcher";

describe("CAMT.053 Parser", () => {
  test("Einfache CRDT-Transaktion parsen", () => {
    const xml = `<?xml version="1.0"?>
      <Document>
        <BkToCstmrStmt>
          <Stmt>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-15</Dt></BookgDt>
              <ValDt><Dt>2026-05-15</Dt></ValDt>
              <Amt Ccy="EUR">1234.56</Amt>
              <BkTxCd>
                <Domn><Cd>PMNT</Cd></Domn>
                <Prtry><Cd>OTHR</Cd></Prtry>
              </BkTxCd>
              <RmtInf>
                <Ustrd>RE-2026-0042</Ustrd>
              </RmtInf>
              <Dbtr>
                <Nm>ACME Inc</Nm>
              </Dbtr>
            </Ntry>
          </Stmt>
        </BkToCstmrStmt>
      </Document>`;

    const result = parseCamt053(xml);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2026-05-15",
      amount: 1234.56,
      currency: "EUR",
      purpose: "RE-2026-0042",
      counterparty: "ACME Inc",
    });
  });

  test("Nur CRDT-Transaktionen (keine DBIT)", () => {
    const xml = `<?xml version="1.0"?>
      <Document>
        <BkToCstmrStmt>
          <Stmt>
            <Ntry>
              <CdtDbtInd>DBIT</CdtDbtInd>
              <Amt Ccy="EUR">100.00</Amt>
            </Ntry>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-15</Dt></BookgDt>
              <Amt Ccy="EUR">200.00</Amt>
              <RmtInf><Ustrd>Test</Ustrd></RmtInf>
              <Dbtr><Nm>Test</Nm></Dbtr>
            </Ntry>
          </Stmt>
        </BkToCstmrStmt>
      </Document>`;

    const result = parseCamt053(xml);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(200.0);
  });

  test("Mehrere <Ustrd> concatenieren", () => {
    const xml = `<?xml version="1.0"?>
      <Document>
        <BkToCstmrStmt>
          <Stmt>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-15</Dt></BookgDt>
              <Amt Ccy="EUR">500.00</Amt>
              <RmtInf>
                <Ustrd>RE-2026-0001</Ustrd>
                <Ustrd>Zahlungszusatz</Ustrd>
              </RmtInf>
              <Dbtr><Nm>Client</Nm></Dbtr>
            </Ntry>
          </Stmt>
        </BkToCstmrStmt>
      </Document>`;

    const result = parseCamt053(xml);
    expect(result[0].purpose).toBe("RE-2026-0001 Zahlungszusatz");
  });

  test("ValDt vor BookgDt preferieren", () => {
    const xml = `<?xml version="1.0"?>
      <Document>
        <BkToCstmrStmt>
          <Stmt>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-10</Dt></BookgDt>
              <ValDt><Dt>2026-05-15</Dt></ValDt>
              <Amt Ccy="EUR">100.00</Amt>
              <RmtInf><Ustrd></Ustrd></RmtInf>
              <Dbtr><Nm>A</Nm></Dbtr>
            </Ntry>
          </Stmt>
        </BkToCstmrStmt>
      </Document>`;

    const result = parseCamt053(xml);
    expect(result[0].date).toBe("2026-05-15");
  });

  test("Negative oder null Beträge ignorieren", () => {
    const xml = `<?xml version="1.0"?>
      <Document>
        <BkToCstmrStmt>
          <Stmt>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-15</Dt></BookgDt>
              <Amt Ccy="EUR">0.00</Amt>
              <RmtInf><Ustrd></Ustrd></RmtInf>
              <Dbtr><Nm>A</Nm></Dbtr>
            </Ntry>
            <Ntry>
              <CdtDbtInd>CRDT</CdtDbtInd>
              <BookgDt><Dt>2026-05-15</Dt></BookgDt>
              <Amt Ccy="EUR">-100.00</Amt>
              <RmtInf><Ustrd></Ustrd></RmtInf>
              <Dbtr><Nm>B</Nm></Dbtr>
            </Ntry>
          </Stmt>
        </BkToCstmrStmt>
      </Document>`;

    const result = parseCamt053(xml);
    expect(result).toHaveLength(0);
  });

  test("Ungültiges XML — graceful empty result", () => {
    const result = parseCamt053("<invalid>not camt</invalid>");
    expect(result).toHaveLength(0);
  });
});

describe("CSV-Parser — Bank-Formate", () => {
  test("DKB-Format erkennen und parsen", () => {
    const csv = `Kontonummer:12345678
Kontostand:0,00 EUR
Datum:19.05.2026
Saldo:

Buchungstag;Wertstellung;Buchungstext;Auftraggeber;Verwendungszweck;Begünstigter;Kontonummer;Betrag (€);Währung
15.05.2026;15.05.2026;Überweisung;ACME Inc;RE-2026-0042;Test Client;98765432;1250,50;EUR
16.05.2026;16.05.2026;Dauerauftrag;Test Corp;Miete Mai;Landlord;12345678;-500,00;EUR`;

    const result = parseBankCsv(csv);
    expect(result.format).toBe("DKB");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toEqual({
      date: "2026-05-15",
      amount: 1250.50,
      currency: "EUR",
      purpose: "RE-2026-0042",
      counterparty: "ACME Inc",
    });
  });

  test("Deutsche Komma-Dezimalzahlen parsen", () => {
    const csv = `Kontonummer:12345678
Kontostand:0,00 EUR
Datum:19.05.2026
Saldo:

Buchungstag;Wertstellung;Buchungstext;Auftraggeber;Verwendungszweck;Begünstigter;Kontonummer;Betrag (€);Währung
15.05.2026;15.05.2026;Überweisung;A;Test;B;12345678;1.234,56;EUR
16.05.2026;16.05.2026;Überweisung;C;Test2;D;12345678;-99,99;EUR`;

    const result = parseBankCsv(csv);
    expect(result.format).toBe("DKB");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBeCloseTo(1234.56, 2);
  });

  test("Quoted Felder handhaben", () => {
    const csv = `Kontonummer:12345678
Kontostand:0,00 EUR
Datum:19.05.2026
Saldo:

Buchungstag;Wertstellung;Buchungstext;Auftraggeber;Verwendungszweck;Begünstigter;Kontonummer;Betrag (€);Währung
15.05.2026;15.05.2026;Überweisung;"ACME, Inc.";"RE-2026-0042";"Client Ltd";12345678;555,00;EUR`;

    const result = parseBankCsv(csv);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].counterparty).toBe("ACME, Inc.");
  });

  test("Leer CSV — keine Transaktionen", () => {
    const result = parseBankCsv("");
    expect(result.transactions).toHaveLength(0);
    expect(result.format).toBe("unknown");
  });

  test("Unbekanntes Format — graceful unknown", () => {
    const csv = `Random;Columns;That;Dont;Match;Any;Bank
15.05.2026;100,00;EUR;Test`;

    const result = parseBankCsv(csv);
    expect(result.format).toBe("unknown");
    expect(result.transactions).toHaveLength(0);
  });
});

describe("Matching Engine", () => {
  const invoices: InvoiceForMatching[] = [
    {
      id: 1,
      invoice_number: "RE-2026-0001",
      gross_amount: 1000.0,
      client_name: "Client A",
      due_date: "2026-06-15",
    },
    {
      id: 2,
      invoice_number: "RE-2026-0002",
      gross_amount: 500.0,
      client_name: "Client B",
      due_date: "2026-06-20",
    },
    {
      id: 3,
      invoice_number: "RE-2026-0003",
      gross_amount: 750.0,
      client_name: "Client C",
      due_date: "2026-06-10",
    },
  ];

  test("HIGH Confidence: Rechnungsnummer + Betrag", () => {
    const transactions = [
      {
        date: "2026-05-15",
        amount: 1000.0,
        currency: "EUR",
        purpose: "Zahlung RE-2026-0001 für Mai",
        counterparty: "My Company",
      },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBe("high");
    expect(report.matched[0].invoice.invoice_number).toBe("RE-2026-0001");
  });

  test("MEDIUM Confidence: Nur Rechnungsnummer", () => {
    const transactions = [
      {
        date: "2026-05-15",
        amount: 999.99,
        currency: "EUR",
        purpose: "RE-2026-0002 mit Gebühr",
        counterparty: "My Company",
      },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBe("medium");
  });

  test("LOW Confidence: Eindeutiger Betrag nur", () => {
    const transactions = [
      {
        date: "2026-05-15",
        amount: 750.0,
        currency: "EUR",
        purpose: "Irgendwelcher Text",
        counterparty: "My Company",
      },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBe("low");
  });

  test("Kein Match: Eindeutiger Betrag mit mehreren Rechnungen", () => {
    const localInvoices = [
      { ...invoices[0] },
      { ...invoices[0], id: 10, invoice_number: "RE-2026-0010" },
    ];

    const transactions = [
      {
        date: "2026-05-15",
        amount: 1000.0,
        currency: "EUR",
        purpose: "Mystery payment",
        counterparty: "My Company",
      },
    ];

    const report = matchTransactions(transactions, localInvoices);
    expect(report.matched).toHaveLength(0);
    expect(report.unmatched).toHaveLength(1);
  });

  test("Greedy: HIGH vor MEDIUM", () => {
    const localInvoices = [
      ...invoices,
      { id: 100, invoice_number: "RE-2026-0100", gross_amount: 1000.0, client_name: "X", due_date: "2026-07-01" },
    ];

    const transactions = [
      {
        date: "2026-05-15",
        amount: 1000.0,
        currency: "EUR",
        purpose: "RE-2026-0001",
        counterparty: "My Company",
      },
    ];

    const report = matchTransactions(transactions, localInvoices);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].invoice.id).toBe(1);
  });

  test("Eindeutigkeit: Jede Rechnung nur einmal", () => {
    const transactions = [
      { date: "2026-05-15", amount: 1000.0, currency: "EUR", purpose: "RE-2026-0001", counterparty: "A" },
      { date: "2026-05-16", amount: 1000.0, currency: "EUR", purpose: "RE-2026-0001", counterparty: "B" },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(1);
    expect(report.unmatched).toHaveLength(1);
  });

  test("Normalisierung: Bindestriche, Leerzeichen ignorieren", () => {
    const transactions = [
      { date: "2026-05-15", amount: 500.0, currency: "EUR", purpose: "RE 2026 0002", counterparty: "A" },
      { date: "2026-05-16", amount: 750.0, currency: "EUR", purpose: "RE_2026_0003", counterparty: "B" },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(2);
  });

  test("Betrag-Toleranz: ±0.005€", () => {
    const transactions = [
      { date: "2026-05-15", amount: 1000.004, currency: "EUR", purpose: "RE-2026-0001", counterparty: "A" },
    ];

    const report = matchTransactions(transactions, invoices);
    expect(report.matched).toHaveLength(1);
  });

  test("Leere Listen", () => {
    const report = matchTransactions([], invoices);
    expect(report.matched).toHaveLength(0);
  });
});
