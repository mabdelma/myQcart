import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { adminCopilot, customerChat, aiEnabled } from '../services/aiService.js';

const ai = new Hono();

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(40),
});

// Is the assistant configured? (cheap check for the UI to hide the feature)
ai.get('/:slug/ai/status', resolveTenant, (c) => c.json({ enabled: aiEnabled() }));

// Admin copilot — tenant-scoped tool-use over the restaurant's data.
ai.post('/:slug/ai/admin', authMiddleware, requireRole('admin', 'manager'), resolveTenant, zValidator('json', chatSchema), async (c) => {
  const tenant = c.get('tenant');
  const { messages } = c.req.valid('json');
  const result = await adminCopilot(tenant.id, tenant.name, tenant.currency, messages);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

// Customer menu chat — public (guest at a table), menu used as context.
ai.post('/:slug/ai/customer', resolveTenant, zValidator('json', chatSchema), async (c) => {
  const tenant = c.get('tenant');
  const { messages } = c.req.valid('json');
  const result = await customerChat(tenant.id, tenant.name, tenant.currency, messages);
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json(result.data);
});

export default ai;
