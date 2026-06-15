import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { logger } from './logger.js';

interface Redis {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
  off(event: string, handler: (...args: unknown[]) => void): unknown;
}

type RedisConstructor = new (url: string, options: Record<string, unknown>) => Redis;

// ioredis v5 type declarations don't play nicely with ESM TypeScript projects.
// We load it via createRequire and use a minimal interface to avoid the namespace-vs-class issue.
const _require = createRequire(import.meta.url);
let RedisClient: RedisConstructor | null = null;
try {
  RedisClient = _require('ioredis');
} catch {
  // Redis not available — will use in-process EventEmitter fallback
}

export interface OrderEvent {
  type: 'order_created' | 'order_updated' | 'order_status_changed';
  tenantId: string;
  orderId: string;
  data?: Record<string, unknown>;
}

const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;
let redisSub: Redis | null = null;
let fallbackEmitter: EventEmitter | null = null;

function initRedis() {
  if (!redisUrl) return;

  if (!RedisClient) return;

  try {
    redis = new RedisClient(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis connection failed 5 times, falling back to in-process events');
          return null;
        }
        return Math.min(times * 200, 3000);
      },
      lazyConnect: true,
    });

    redisSub = new RedisClient(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) {
          logger.warn('Redis subscriber connection failed 5 times');
          return null;
        }
        return Math.min(times * 200, 3000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
    redisSub.on('error', (err: Error) => logger.error({ err }, 'Redis subscriber error'));
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Redis');
    redis = null;
    redisSub = null;
  }
}

function ensureBackend() {
  if (redis && redisSub) return 'redis';
  if (!fallbackEmitter) fallbackEmitter = new EventEmitter().setMaxListeners(100);
  return 'fallback';
}

export function emitOrderEvent(event: OrderEvent) {
  const backend = ensureBackend();

  if (backend === 'redis' && redis) {
    const channel = `order:${event.tenantId}`;
    redis.publish(channel, JSON.stringify(event)).catch(() => {
      if (fallbackEmitter) {
        fallbackEmitter.emit(channel, event);
      }
    });
  } else if (fallbackEmitter) {
    fallbackEmitter.emit(`order:${event.tenantId}`, event);
  }
}

export function onOrderEvent(tenantId: string, handler: (event: OrderEvent) => void) {
  const backend = ensureBackend();
  const channel = `order:${tenantId}`;

  if (backend === 'redis' && redisSub) {
    let connected = false;

    redisSub.subscribe(channel).then(() => {
      connected = true;
    }).catch((err: Error) => {
      logger.error({ err, channel }, 'Redis subscribe failed');
    });

    const onMessage = (_channel: string, message: string) => {
      if (_channel !== channel) return;
      try {
        handler(JSON.parse(message));
      } catch { /* ignore parse errors */ }
    };

    redisSub.on('message', onMessage);

    return () => {
      if (connected) {
        redisSub!.unsubscribe(channel).catch(() => {});
      }
      redisSub!.off('message', onMessage);
    };
  }

  if (!fallbackEmitter) fallbackEmitter = new EventEmitter().setMaxListeners(100);
  fallbackEmitter.on(channel, handler);
  return () => { fallbackEmitter!.off(channel, handler); };
}

initRedis();
