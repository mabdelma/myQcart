import type { Context, Next } from 'hono';
import { logger } from '../lib/logger.js';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({ method, path, status, duration }, 'HTTP request');
}
