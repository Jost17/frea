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

// ---------------------------------------------------------------------------
// State Machine — valid status transitions
// ---------------------------------------------------------------------------
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:     ['open', 'cancelled'],
  open:      ['paid', 'overdue', 'cancelled'],
  overdue:   ['paid', 'cancelled'],
  paid:      [],            // terminal — no transitions allowed
  cancelled: [],            // terminal — no transitions allowed
};

function isValidTransition(current: string, next: string): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

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
  const yearPattern = `${prefix}-${year}-%`;
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

// GET /api/invoices — list all (optionally filtered by status), paginated
invoicesRoute.get('/', (c) => {
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '100', 10), 500);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  const baseSelect = `
    SELECT i.*, c.name as client_name
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
  `;

  // Build WHERE clause
  let where = '';
  const params: any[] = [];
  if (status) {
    if (status === 'overdue') {
      where = ` WHERE date(i.due_date) < date('now') AND i.status NOT IN ('paid', 'cancelled')`;
    } else {
      where = ` WHERE i.status = ?`;
      params.push(status);
    }
  }

  // Count total (ignoring limit/offset)
  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM invoices i${where}`).get(...params) as any;
  const total = totalRow?.cnt ?? 0;

  // Data query with limit/offset
  const dataSql = `${baseSelect}${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
  const invoices = db.prepare(dataSql).all(...params, limit, offset);

  return c.json(invoices, {
    headers: {
      'X-Pagination-Total': String(total),
      'X-Pagination-Limit': String(limit),
      'X-Pagination-Offset': String(offset),
    },
  });
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
    // Enforce state machine — reject invalid transitions
    if (!isValidTransition(existing.status, parsed.data.status)) {
      return c.json({
        error: 'Invalid status transition',
        detail: `Cannot change from '${existing.status}' to '${parsed.data.status}'. Allowed: ${VALID_TRANSITIONS[existing.status]?.join(', ') || 'none'}`,
      }, 409);
    }

    updates.push('status = ?');
    values.push(parsed.data.status);

    // Auto-set paid_at when marked as paid
    if (parsed.data.status === 'paid') {
      const paidAt = parsed.data.paidAt ?? new Date().toISOString();
      updates.push('paid_at = ?');
      values.push(paidAt);
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
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!existing) return c.json({ error: 'Not found' }, 404);

  // Prevent deletion of paid or cancelled invoices (legal / audit trail)
  if (existing.status === 'paid' || existing.status === 'cancelled') {
    return c.json({
      error: 'Cannot delete invoice',
      detail: `Invoice is '${existing.status}'. Paid and cancelled invoices are kept for audit purposes.`,
    }, 409);
  }

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

  // Enforce state machine
  if (!isValidTransition(existing.status, 'paid')) {
    return c.json({
      error: 'Invalid status transition',
      detail: `Cannot mark as paid from '${existing.status}'. Allowed: ${VALID_TRANSITIONS[existing.status]?.join(', ') || 'none'}`,
    }, 409);
  }

  db.prepare(`
    UPDATE invoices
    SET status = 'paid', paid_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(paidAt, id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
  return c.json({ ...invoice, items });
});

// POST /api/invoices/from-timeentries — create invoice from time entries
const FromTimeEntriesSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  timeEntryIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  vatRate: z.string().default('19'),
  groupBy: z.enum(['day', 'description', 'project']).default('day'),
  manualHourlyRate: z.number().min(0).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

invoicesRoute.post('/from-timeentries', async (c) => {
  // Accept both JSON (API) and form-encoded (HTMX) submissions
  const contentType = c.req.header('content-type') ?? '';
  let body: any;
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    const form = await c.req.parseForm();
    // Map snake_case form fields to camelCase schema
    body = {
      clientId: form.clientId as string || form.client_id as string || undefined,
      projectId: form.projectId as string || form.project_id as string || undefined,
      timeEntryIds: form.timeEntryIds
        ? String(form.timeEntryIds).split(',').filter(Boolean)
        : undefined,
      startDate: form.startDate as string || undefined,
      endDate: form.endDate as string || undefined,
      vatRate: (form.vatRate as string || form.vat_rate as string) ?? '19',
      groupBy: (form.groupBy as string) ?? 'day',
      manualHourlyRate: form.manualHourlyRate
        ? Number(form.manualHourlyRate)
        : form.manual_hourly_rate
          ? Number(form.manual_hourly_rate)
          : undefined,
      issueDate: form.issueDate as string || form.issue_date as string || undefined,
      dueDate: form.dueDate as string || form.due_date as string || undefined,
      notes: form.notes as string || undefined,
    };
  }
  const parsed = FromTimeEntriesSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { projectId, clientId, timeEntryIds, startDate, endDate, vatRate, groupBy, manualHourlyRate, issueDate, dueDate, notes } = parsed.data;

  // Build time entries query
  let sql = `
    SELECT te.*, p.name as project_name, p.hourly_rate, p.client_id, c.name as client_name
    FROM time_entries te
    JOIN projects p ON p.id = te.project_id
    JOIN clients c ON c.id = p.client_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (timeEntryIds && timeEntryIds.length > 0) {
    sql += ` AND te.id IN (${timeEntryIds.map(() => '?').join(',')})`;
    params.push(...timeEntryIds);
  } else {
    if (projectId) { sql += ` AND te.project_id = ?`; params.push(projectId); }
    if (clientId) { sql += ` AND p.client_id = ?`; params.push(clientId); }
    if (startDate) { sql += ` AND te.date >= ?`; params.push(startDate); }
    if (endDate) { sql += ` AND te.date <= ?`; params.push(endDate); }
  }

  const entries = db.prepare(sql).all(...params) as any[];
  if (entries.length === 0) {
    return c.json({ error: 'No time entries found for the given filters' }, 400);
  }

  // Determine client — either explicit or from entries
  const clientIdFinal = clientId ?? entries[0].client_id;
  if (!clientIdFinal) return c.json({ error: 'Client ID could not be determined' }, 400);

  // Compute line items based on groupBy
  const rate = manualHourlyRate ?? entries[0].hourly_rate;
  let items: any[] = [];

  if (groupBy === 'day') {
    // Group by date
    const byDate: Record<string, any[]> = {};
    for (const e of entries) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    for (const [date, group] of Object.entries(byDate)) {
      const totalMinutes = group.reduce((s: number, e: any) => s + e.duration_minutes, 0);
      const hours = totalMinutes / 60;
      const net = Math.round(hours * rate * 100) / 100;
      const vat = Math.round(net * parseFloat(vatRate) / 100 * 100) / 100;
      items.push({
        description: `Leistungen vom ${new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        quantity: Math.round(hours * 100) / 100,
        unitPrice: rate,
        vatRate,
        net,
        vat,
        gross: Math.round((net + vat) * 100) / 100,
      });
    }
  } else if (groupBy === 'description') {
    // Group by description
    const byDesc: Record<string, any[]> = {};
    for (const e of entries) {
      const key = e.description || '(ohne Beschreibung)';
      if (!byDesc[key]) byDesc[key] = [];
      byDesc[key].push(e);
    }
    for (const [desc, group] of Object.entries(byDesc)) {
      const totalMinutes = group.reduce((s: number, e: any) => s + e.duration_minutes, 0);
      const hours = totalMinutes / 60;
      const net = Math.round(hours * rate * 100) / 100;
      const vat = Math.round(net * parseFloat(vatRate) / 100 * 100) / 100;
      items.push({
        description: desc,
        quantity: Math.round(hours * 100) / 100,
        unitPrice: rate,
        vatRate,
        net,
        vat,
        gross: Math.round((net + vat) * 100) / 100,
      });
    }
  } else {
    // Group by project (default)
    const byProject: Record<string, any[]> = {};
    for (const e of entries) {
      if (!byProject[e.project_id]) byProject[e.project_id] = [];
      byProject[e.project_id].push(e);
    }
    for (const [pid, group] of Object.entries(byProject)) {
      const projectName = group[0].project_name;
      const totalMinutes = group.reduce((s: number, e: any) => s + e.duration_minutes, 0);
      const hours = totalMinutes / 60;
      const net = Math.round(hours * rate * 100) / 100;
      const vat = Math.round(net * parseFloat(vatRate) / 100 * 100) / 100;
      items.push({
        description: `Projekt: ${projectName}`,
        quantity: Math.round(hours * 100) / 100,
        unitPrice: rate,
        vatRate,
        net,
        vat,
        gross: Math.round((net + vat) * 100) / 100,
      });
    }
  }

  // Compute totals
  const totals = computeTotals(items, vatRate);

  // Dates
  const issueDateFinal = issueDate ?? new Date().toISOString().split('T')[0];
  const settings = getInvoiceSettings();
  const defaultDueDays = settings?.default_due_days ?? 14;
  const dueDateFinal = dueDate ?? new Date(Date.now() + defaultDueDays * 86400_000).toISOString().split('T')[0];

  const invoiceNumber = getNextInvoiceNumber();
  const invoiceId = newId();

  db.prepare(`
    INSERT INTO invoices (id, client_id, invoice_number, status, issue_date, due_date, total_net, total_vat, total_gross, vat_rate, notes)
    VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `).run(invoiceId, clientIdFinal, invoiceNumber, issueDateFinal, dueDateFinal, totals.totalNet, totals.totalVat, totals.totalGross, vatRate, notes ?? '');

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, vat_rate, net, vat, gross)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    insertItem.run(newId(), invoiceId, item.description, item.quantity, item.unitPrice, item.vatRate, item.net, item.vat, item.gross);
  }

  const invoice = db.prepare(`
    SELECT i.*, c.name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(invoiceId) as any;
  const insertedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

  return c.json({ ...invoice, items: insertedItems, timeEntryCount: entries.length }, 201);
});

export default invoicesRoute;
