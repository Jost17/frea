import { Hono } from 'hono';
import { db, newId } from '../db.js';
import { z } from 'zod';
import { generateInvoicePdf, buildInvoiceFilename, type InvoicePdfData } from '../lib/invoice-pdf.js';

const invoicesRoute = new Hono();

// Validation schemas
const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  issueDate: z.string(),
  dueDate: z.string(),
  vatRate: z.string().default('19'),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    vatRate: z.string().optional(),
    // Computed fields
    net: z.number().optional(),
    vat: z.number().optional(),
    gross: z.number().optional(),
  })).min(1),
});

const UpdateInvoiceSchema = z.object({
  status: z.enum(['draft', 'open', 'paid', 'overdue', 'cancelled']).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(), // ISO timestamp when marked paid
});

// Helper: compute totals
function computeTotals(items: any[], vatRate: string) {
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (const item of items) {
    const rate = item.vatRate ?? vatRate;
    const net = item.quantity * item.unitPrice;
    const vat = net * (parseFloat(rate) / 100);
    const gross = net + vat;

    item.net = Math.round(net * 100) / 100;
    item.vat = Math.round(vat * 100) / 100;
    item.gross = Math.round(gross * 100) / 100;

    totalNet += item.net;
    totalVat += item.vat;
    totalGross += item.gross;
  }

  return {
    totalNet: Math.round(totalNet * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
  };
}

// Helper: get invoice settings (singleton)
function getInvoiceSettings() {
  return db.prepare('SELECT * FROM invoice_settings LIMIT 1').get() as any;
}

// Helper: get next invoice number with configurable prefix + year + gap detection
// Format: PREFIX-YEAR-NNN (e.g. FREA-2026-001)
function getNextInvoiceNumber(): string {
  const settings = getInvoiceSettings();
  if (!settings) return `RE-${new Date().getFullYear()}-1`;

  const year = new Date().getFullYear();
  const prefix = settings.prefix || 'RE';
  const start = settings.start_number || 1;

  // Find all invoice numbers for this year
  const yearPattern = `${prefix}-${year}-`;
  const existing = db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number"
  ).all(yearPattern) as any[];

  if (existing.length === 0) {
    return `${prefix}-${year}-${String(start).padStart(3, '0')}`;
  }

  // Find gaps (Lücken) — legally required in Germany
  const usedNumbers = new Set<number>();
  let maxNumber = start - 1;

  for (const row of existing) {
    const match = row.invoice_number.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      usedNumbers.add(num);
      if (num > maxNumber) maxNumber = num;
    }
  }

  // Find first gap (or next number if no gaps)
  let next = start;
  while (usedNumbers.has(next)) next++;
  // If we walked all the way to max+1, just use max+1 (no gaps)
  if (next > maxNumber) next = maxNumber + 1;

  return `${prefix}-${year}-${String(next).padStart(3, '0')}`;
}

// GET /api/invoices — list all (optionally filtered by status)
invoicesRoute.get('/', (c) => {
  const status = c.req.query('status');

  let sql = `
    SELECT i.*, c.name as client_name
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
  `;
  const params: any[] = [];

  if (status) {
    // Handle 'overdue': due_date < today AND status NOT IN (paid, cancelled)
    if (status === 'overdue') {
      sql += ` WHERE date(i.due_date) < date('now') AND i.status NOT IN ('paid', 'cancelled')`;
    } else {
      sql += ` WHERE i.status = ?`;
      params.push(status);
    }
  }

  sql += ` ORDER BY i.created_at DESC`;

  const invoices = db.prepare(sql).all(...params);
  return c.json(invoices);
});

// GET /api/invoices/settings — get invoice settings (must be before /:id to avoid conflict)
invoicesRoute.get('/settings', (c) => {
  const settings = db.prepare('SELECT * FROM invoice_settings LIMIT 1').get();
  return c.json(settings ?? { prefix: 'RE', start_number: 1, default_due_days: 14 });
});

// PATCH /api/invoices/settings — update invoice settings
invoicesRoute.patch('/settings', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { prefix, start_number, default_due_days } = body as any;

  const updates: string[] = [];
  const values: any[] = [];

  if (prefix !== undefined) { updates.push('prefix = ?'); values.push(prefix); }
  if (start_number !== undefined) { updates.push('start_number = ?'); values.push(Number(start_number)); }
  if (default_due_days !== undefined) { updates.push('default_due_days = ?'); values.push(Number(default_due_days)); }

  if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

  updates.push("updated_at = datetime('now')");

  const existing = db.prepare('SELECT id FROM invoice_settings LIMIT 1').get() as any;
  if (!existing) {
    db.prepare(
      'INSERT INTO invoice_settings (id, prefix, start_number, default_due_days) VALUES (?, ?, ?, ?)'
    ).run(newId(), prefix ?? 'RE', start_number ?? 1, default_due_days ?? 14);
  } else {
    db.prepare(`UPDATE invoice_settings SET ${updates.join(', ')} WHERE id = ?`).run(...values, existing.id);
  }

  const settings = db.prepare('SELECT * FROM invoice_settings LIMIT 1').get();
  return c.json(settings);
});

// GET /api/invoices/:id — get one with items
invoicesRoute.get('/:id', (c) => {
  const id = c.req.param('id');
  
  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(id) as any;

  if (!invoice) return c.json({ error: 'Not found' }, 404);

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);

  return c.json({ ...invoice, items });
});

// POST /api/invoices — create
invoicesRoute.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = CreateInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { clientId, issueDate, dueDate, vatRate, notes, items } = parsed.data;
  const totals = computeTotals(items, vatRate);
  const invoiceNumber = getNextInvoiceNumber();

  const invoiceId = newId();

  // Insert invoice
  db.prepare(`
    INSERT INTO invoices (id, client_id, invoice_number, status, issue_date, due_date, total_net, total_vat, total_gross, vat_rate, notes)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `).run(invoiceId, clientId, invoiceNumber, issueDate, dueDate, totals.totalNet, totals.totalVat, totals.totalGross, vatRate, notes ?? '');

  // Insert items
  const insertItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, vat_rate, net, vat, gross)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertItem.run(newId(), invoiceId, item.description, item.quantity, item.unitPrice, item.vatRate ?? vatRate, item.net, item.vat, item.gross);
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  const insertedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

  return c.json({ ...invoice, items: insertedItems }, 201);
});

// PATCH /api/invoices/:id — update
invoicesRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: string[] = [];
  const values: any[] = [];

  if (parsed.data.status) {
    updates.push('status = ?');
    values.push(parsed.data.status);

    // Auto-set paid_at when marked as paid
    if (parsed.data.status === 'paid') {
      updates.push('paid_at = ?');
      values.push(parsed.data.paidAt ?? new Date().toISOString());
    }
  }
  if (parsed.data.issueDate) {
    updates.push('issue_date = ?');
    values.push(parsed.data.issueDate);
  }
  if (parsed.data.dueDate) {
    updates.push('due_date = ?');
    values.push(parsed.data.dueDate);
  }
  if (parsed.data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(parsed.data.notes);
  }
  // Explicit paid_at update (e.g. backdating)
  if (parsed.data.paidAt !== undefined) {
    updates.push('paid_at = ?');
    values.push(parsed.data.paidAt || null);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);

  return c.json({ ...invoice, items });
});

// DELETE /api/invoices/:id
invoicesRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Not found' }, 404);

  db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
  return c.json({ success: true });
});

// GET /api/invoices/:id/pdf — download PDF
invoicesRoute.get('/:id/pdf', async (c) => {
  const id = c.req.param('id');

  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name, c.address as client_address
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(id) as any;

  if (!invoice) return c.json({ error: 'Not found' }, 404);

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id) as any[];

  // Build PDF data
  const pdfData: InvoicePdfData = {
    senderName: 'Dein Name / Firmenname',
    senderAddress: 'Musterstraße 1\n12345 Musterstadt',
    senderTaxId: 'DE123456789', // TODO: replace with real tax ID
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    clientName: invoice.client_name,
    clientAddress: invoice.client_address || '',
    items: items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      vatRate: item.vat_rate,
      net: item.net,
      vat: item.vat,
      gross: item.gross,
    })),
    totalNet: invoice.total_net,
    totalVat: invoice.total_vat,
    totalGross: invoice.total_gross,
    vatRate: invoice.vat_rate,
    notes: invoice.notes || undefined,
  };

  // Kleinunternehmerregelung notice if 0% VAT
  if (invoice.vat_rate === '0' || items.every(i => i.vat_rate === '0')) {
    pdfData.notes = (pdfData.notes ? pdfData.notes + '\n\n' : '') + 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.';
  }

  const pdfBytes = await generateInvoicePdf(pdfData);
  const filename = buildInvoiceFilename(invoice.invoice_number, invoice.client_name, invoice.issue_date);

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// POST /api/invoices/:id/mark-paid — convenience endpoint
invoicesRoute.post('/:id/mark-paid', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as any;
  const paidAt = body?.paidAt ?? new Date().toISOString();

  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Not found' }, 404);

  db.prepare(`
    UPDATE invoices
    SET status = 'paid', paid_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(paidAt, id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
  return c.json({ ...invoice, items });
});

export default invoicesRoute;
