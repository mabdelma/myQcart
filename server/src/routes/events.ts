import { Hono } from 'hono';
import type { ServerResponse } from 'node:http';
import { resolveTenant } from '../middleware/tenant.js';
import { onOrderEvent } from '../lib/events.js';

const events = new Hono();

events.get('/:slug/events', resolveTenant, async (c) => {
  const tenantId = c.get('tenantId');

  const res = c.res as unknown as ServerResponse;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(': connected\n\n');

  const cleanup = onOrderEvent(tenantId, (event) => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      cleanup();
      clearInterval(keepAlive);
    }
  });

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      cleanup();
      clearInterval(keepAlive);
    }
  }, 15000);

  res.on('close', () => {
    cleanup();
    clearInterval(keepAlive);
  });
});

export default events;
