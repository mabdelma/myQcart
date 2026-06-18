import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { getPrintJobs, reprintJob, generateReceiptText } from '../services/printService.js';
import { db, schema } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import { eq, and } from 'drizzle-orm';

const prints = new Hono();

prints.get('/:slug/prints', resolveTenant, authMiddleware, async (c) => {
  const tenantId = c.get('tenantId');
  const orderId = c.req.query('orderId');
  const jobs = await getPrintJobs(tenantId, orderId);
  return c.json({ data: jobs });
});

prints.post('/:slug/prints/reprint/:jobId', resolveTenant, authMiddleware, async (c) => {
  const tenantId = c.get('tenantId');
  const jobId = c.req.param('jobId')!;
  const result = await reprintJob(jobId, tenantId);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

const createPrinterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['thermal', 'laser', 'network', 'browser']),
  address: z.string().optional(),
  port: z.number().int().positive().optional(),
  autoPrint: z.boolean().optional(),
});

prints.post('/:slug/prints/printers', resolveTenant, authMiddleware, requireRole('admin', 'manager'), zValidator('json', createPrinterSchema), async (c) => {
  const tenantId = c.get('tenantId');
  const body = c.req.valid('json');
  const id = uuid();
  await db.insert(schema.printers).values({ id, tenantId, ...body });
  return c.json({ data: { id } }, 201);
});

prints.get('/:slug/prints/printers', resolveTenant, authMiddleware, async (c) => {
  const tenantId = c.get('tenantId');
  const list = await db.select().from(schema.printers).where(eq(schema.printers.tenantId, tenantId));
  return c.json({ data: list });
});

prints.patch('/:slug/prints/printers/:printerId', resolveTenant, authMiddleware, requireRole('admin', 'manager'), zValidator('json', createPrinterSchema.partial()), async (c) => {
  const tenantId = c.get('tenantId');
  const printerId = c.req.param('printerId')!;
  const body = c.req.valid('json');
  await db.update(schema.printers).set(body).where(and(eq(schema.printers.id, printerId), eq(schema.printers.tenantId, tenantId)));
  return c.json({ data: { id: printerId } });
});

prints.delete('/:slug/prints/printers/:printerId', resolveTenant, authMiddleware, requireRole('admin', 'manager'), async (c) => {
  const tenantId = c.get('tenantId');
  const printerId = c.req.param('printerId')!;
  await db.delete(schema.printers).where(and(eq(schema.printers.id, printerId), eq(schema.printers.tenantId, tenantId)));
  return c.json({ data: { id: printerId } });
});

prints.get('/:slug/orders/:orderId/receipt', resolveTenant, authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')!;
  const orderId = c.req.param('orderId')!;
  try {
    const receipt = await generateReceiptText(tenantId, orderId);
    c.header('Content-Type', 'text/plain');
    return c.body(receipt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ error: message }, 404);
  }
});

export default prints;
