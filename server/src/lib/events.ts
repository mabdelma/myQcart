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

const _require = createRequire(import.meta.url);
let RedisClient: RedisConstructor | null = null;
try {
  RedisClient = _require('ioredis');
} catch {
  throw new Error('ioredis is required for SSE event bus. Install it or set REDIS_URL.');
}

export interface OrderEvent {
  type: 'order_created' | 'order_updated' | 'order_status_changed';
  tenantId: string;
  orderId: string;
  data?: Record<string, unknown>;
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required for real-time events. Set it to a valid Redis connection string.');
}

const _redisUrl: string = redisUrl;

let redis: Redis;
let redisSub: Redis;

function initRedis() {
  if (!RedisClient) throw new Error('ioredis not available');

  redis = new RedisClient(_redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 5) {
        throw new Error('Redis connection failed after 5 retries');
      }
      return Math.min(times * 200, 3000);
    },
    lazyConnect: true,
  });

  redisSub = new RedisClient(_redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 5) {
        throw new Error('Redis subscriber connection failed after 5 retries');
      }
      return Math.min(times * 200, 3000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err: unknown) => logger.error({ err }, 'Redis error'));
  redisSub.on('error', (err: unknown) => logger.error({ err }, 'Redis subscriber error'));
}

initRedis();

export function emitOrderEvent(event: OrderEvent) {
  const channel = `order:${event.tenantId}`;
  redis.publish(channel, JSON.stringify(event)).catch((err) => {
    logger.error({ err, channel }, 'Redis publish failed');
  });
}

export function onOrderEvent(tenantId: string, handler: (event: OrderEvent) => void) {
  const channel = `order:${tenantId}`;
  let connected = false;

  redisSub.subscribe(channel).then(() => {
    connected = true;
  }).catch((err: Error) => {
    logger.error({ err, channel }, 'Redis subscribe failed');
  });

  const onMessage = (...args: unknown[]) => {
    const [_channel, message] = args as [string, string];
    if (_channel !== channel) return;
    try {
      handler(JSON.parse(message));
    } catch { /* ignore parse errors */ }
  };

  redisSub.on('message', onMessage);

  return () => {
    if (connected) {
      redisSub.unsubscribe(channel).catch(() => {});
    }
    redisSub.off('message', onMessage);
  };
}
