import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';

const KOT_SEPARATOR = '='.repeat(40);

interface KotData {
  orderId: string;
  tableNumber: number;
  customerName?: string;
  serverName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    modifiers?: string;
  }>;
  notes?: string;
  tenantName: string;
  createdAt: string;
}

function formatKot(data: KotData): string {
  const lines: string[] = [];
  lines.push(KOT_SEPARATOR);
  lines.push(`         ${data.tenantName.toUpperCase()}`);
  lines.push(KOT_SEPARATOR);
  lines.push(`Table: ${data.tableNumber}`);
  if (data.customerName) lines.push(`Customer: ${data.customerName}`);
  if (data.serverName) lines.push(`Server: ${data.serverName}`);
  lines.push(`Order: #${data.orderId.slice(0, 8)}`);
  lines.push(`Time: ${data.createdAt}`);
  lines.push(KOT_SEPARATOR);
  lines.push('');

  for (const item of data.items) {
    const qty = `${item.quantity}x`;
    lines.push(`${qty.padStart(4)} ${item.name}`);
    if (item.modifiers) {
      const mods = typeof item.modifiers === 'string'
        ? JSON.parse(item.modifiers)
        : item.modifiers;
      if (Array.isArray(mods)) {
        for (const m of mods) {
          lines.push(`      - ${typeof m === 'string' ? m : m.name || ''}`);
        }
      }
    }
    if (item.notes) {
      lines.push(`      (${item.notes})`);
    }
    lines.push('');
  }

  if (data.notes) {
    lines.push(`Notes: ${data.notes}`);
    lines.push('');
  }

  lines.push(KOT_SEPARATOR);
  lines.push('        *** KITCHEN COPY ***');
  lines.push(KOT_SEPARATOR);
  return lines.join('\n');
}

export async function createKotPrintJob(tenantId: string, orderId: string) {
  try {
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.tenantId, tenantId)))
      .limit(1);
    if (!order) return null;

    const [table] = await db
      .select()
      .from(schema.tables)
      .where(eq(schema.tables.id, order.tableId))
      .limit(1);

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));

    const printersList = await db
      .select()
      .from(schema.printers)
      .where(and(eq(schema.printers.tenantId, tenantId), eq(schema.printers.autoPrint, true), eq(schema.printers.isActive, true)));

    if (printersList.length === 0) return null;

    const kotContent = formatKot({
      orderId,
      tableNumber: table?.number || 0,
      customerName: order.customerName || undefined,
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        notes: i.notes || undefined,
        modifiers: i.modifiers || undefined,
      })),
      notes: order.notes || undefined,
      tenantName: tenant?.name || '',
      createdAt: order.createdAt,
    });

    const jobs = printersList.map((printer) => ({
      id: uuid(),
      tenantId,
      orderId,
      printerId: printer.id,
      type: 'kot' as const,
      status: 'pending' as const,
      content: kotContent,
    }));

    await db.insert(schema.printJobs).values(jobs);
    logger.info({ tenantId, orderId, count: jobs.length }, 'KOT print jobs created');

    for (const job of jobs) {
      await executePrintJob(job.id);
    }

    return jobs;
  } catch (err) {
    logger.error({ err, tenantId, orderId }, 'Failed to create KOT print job');
    return null;
  }
}

async function executePrintJob(jobId: string) {
  try {
    const [job] = await db
      .select()
      .from(schema.printJobs)
      .where(eq(schema.printJobs.id, jobId))
      .limit(1);
    if (!job) return;

    const [printer] = await db
      .select()
      .from(schema.printers)
      .where(eq(schema.printers.id, job.printerId!))
      .limit(1);

    if (!printer) {
      await db.update(schema.printJobs)
        .set({ status: 'failed', error: 'Printer not found' })
        .where(eq(schema.printJobs.id, jobId));
      return;
    }

    if (printer.type === 'browser') {
      const channel = `print:${job.tenantId}`;
      const { emitOrderEvent } = await import('../lib/events.js');
      emitOrderEvent({
        type: 'order_updated',
        tenantId: job.tenantId,
        orderId: job.orderId,
        data: { printJob: { id: job.id, content: job.content, printerName: printer.name } },
      });
      await db.update(schema.printJobs)
        .set({ status: 'printed', printedAt: new Date().toISOString() })
        .where(eq(schema.printJobs.id, jobId));
      return;
    }

    if (printer.type === 'thermal' || printer.type === 'network') {
      if (printer.address) {
        try {
          const host = printer.address;
          const port = printer.port || 9100;
          const net = await import('net');
          const client = new net.Socket();
          await new Promise<void>((resolve, reject) => {
            client.connect(port, host, () => {
              client.write(Buffer.from(job.content || '', 'utf-8'));
              client.destroy();
              resolve();
            });
            client.on('error', (err: Error) => reject(err));
            client.setTimeout(5000, () => {
              client.destroy();
              reject(new Error('Connection timeout'));
            });
          });
          await db.update(schema.printJobs)
            .set({ status: 'printed', printedAt: new Date().toISOString() })
            .where(eq(schema.printJobs.id, jobId));
          logger.info({ jobId, printer: printer.name }, 'Thermal print job completed');
        } catch (err) {
          await db.update(schema.printJobs)
            .set({ status: 'failed', error: (err as Error).message })
            .where(eq(schema.printJobs.id, jobId));
          logger.error({ err, jobId, printer: printer.name }, 'Thermal print failed');
        }
      }
    }
  } catch (err) {
    logger.error({ err, jobId }, 'Print job execution failed');
  }
}

export async function getPrintJobs(tenantId: string, orderId?: string) {
  const conditions = [eq(schema.printJobs.tenantId, tenantId)];
  if (orderId) conditions.push(eq(schema.printJobs.orderId, orderId));
  return db.select().from(schema.printJobs).where(and(...conditions)).orderBy(schema.printJobs.createdAt);
}

export async function reprintJob(jobId: string, tenantId: string) {
  const [job] = await db
    .select()
    .from(schema.printJobs)
    .where(and(eq(schema.printJobs.id, jobId), eq(schema.printJobs.tenantId, tenantId)))
    .limit(1);
  if (!job) return { error: 'Print job not found', status: 404 as const };
  await db.update(schema.printJobs)
    .set({ status: 'pending', error: null })
    .where(eq(schema.printJobs.id, jobId));
  await executePrintJob(jobId);
  return { data: { id: jobId }, status: 200 as const };
}
