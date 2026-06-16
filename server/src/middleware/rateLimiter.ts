import { rateLimiter, MemoryStore } from 'hono-rate-limiter';
import type { Context } from 'hono';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
let RedisStore: unknown = null;
try {
  RedisStore = _require('hono-rate-limiter').RedisStore;
} catch {
  // Redis store not available — use MemoryStore fallback
}

const redisUrl = process.env.REDIS_URL;

function keyGenerator(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
}

let store: unknown;
if (redisUrl && RedisStore) {
  try {
    const IORedis = _require('ioredis');
    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    store = new (RedisStore as new (client: unknown) => unknown)(redis);
  } catch {
    store = new MemoryStore();
  }
} else {
  store = new MemoryStore();
}

export const generalLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  keyGenerator,
  message: { error: 'Too many requests, please try again later' },
  statusCode: 429,
  store: store as never,
});

export const authLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  keyGenerator,
  message: { error: 'Too many login attempts, please try again later' },
  statusCode: 429,
  store: store as never,
});

export const publicLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  keyGenerator,
  message: { error: 'Too many requests, please try again later' },
  statusCode: 429,
  store: store as never,
});

export const paymentLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  keyGenerator,
  message: { error: 'Too many payment requests, please try again later' },
  statusCode: 429,
  store: store as never,
});

export const pointsLimiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  keyGenerator,
  message: { error: 'Too many requests, please try again later' },
  statusCode: 429,
  store: store as never,
});
