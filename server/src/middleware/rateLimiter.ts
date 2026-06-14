import { rateLimiter, MemoryStore } from 'hono-rate-limiter';
import type { Context } from 'hono';

export const generalLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  keyGenerator: (c: Context) => {
    const forwarded = c.req.header('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
  },
  message: { error: 'Too many requests, please try again later' },
  statusCode: 429,
  store: new MemoryStore(),
});

export const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  keyGenerator: (c: Context) => {
    const forwarded = c.req.header('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
  },
  message: { error: 'Too many login attempts, please try again later' },
  statusCode: 429,
  store: new MemoryStore(),
});

export const publicLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  keyGenerator: (c: Context) => {
    const forwarded = c.req.header('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
  },
  message: { error: 'Too many requests, please try again later' },
  statusCode: 429,
  store: new MemoryStore(),
});
