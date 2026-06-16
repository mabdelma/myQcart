import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';

function createSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function getIntegrations(tenantId: string) {
  return db.select().from(schema.webhookIntegrations).where(eq(schema.webhookIntegrations.tenantId, tenantId));
}

export async function createIntegration(tenantId: string, data: { name: string; provider: 'delivery' | 'accounting' | 'custom'; url: string; events?: string }) {
  const id = uuid();
  const secret = crypto.randomBytes(24).toString('hex');
  await db.insert(schema.webhookIntegrations).values({ id, tenantId, secret, ...data });
  return { id, secret };
}

export async function updateIntegration(integrationId: string, tenantId: string, data: Partial<{ name: string; url: string; events: string; isActive: boolean }>) {
  await db.update(schema.webhookIntegrations).set(data).where(and(eq(schema.webhookIntegrations.id, integrationId), eq(schema.webhookIntegrations.tenantId, tenantId)));
}

export async function deleteIntegration(integrationId: string, tenantId: string) {
  await db.delete(schema.webhookIntegrations).where(and(eq(schema.webhookIntegrations.id, integrationId), eq(schema.webhookIntegrations.tenantId, tenantId)));
}

export async function triggerWebhooks(tenantId: string, event: string, payload: Record<string, unknown>) {
  const integrations = await db
    .select()
    .from(schema.webhookIntegrations)
    .where(and(eq(schema.webhookIntegrations.tenantId, tenantId), eq(schema.webhookIntegrations.isActive, true)));

  const body = JSON.stringify(payload);

  for (const integration of integrations) {
    const events = integration.events.split(',').map((e) => e.trim());
    if (!events.includes(event)) continue;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-QCart-Event': event };
      if (integration.secret) {
        headers['X-QCart-Signature'] = createSignature(body, integration.secret);
      }

      const response = await fetch(integration.url, { method: 'POST', headers, body });
      await db.update(schema.webhookIntegrations)
        .set({ lastTriggeredAt: new Date().toISOString() })
        .where(eq(schema.webhookIntegrations.id, integration.id));

      logger.info({ integrationId: integration.id, event, status: response.status }, 'Webhook triggered');
    } catch (err) {
      logger.error({ err, integrationId: integration.id, event }, 'Webhook trigger failed');
    }
  }
}
