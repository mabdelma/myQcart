const QUEUE_KEY = 'orderQueue';

interface QueuedOrder {
  slug: string;
  data: unknown;
  timestamp: number;
}

export function enqueueOrder(slug: string, orderData: unknown): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: QueuedOrder[] = raw ? JSON.parse(raw) : [];
    queue.push({ slug, data: orderData, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Silently fail — queue is best-effort
  }
}

export function getQueuedOrders(): QueuedOrder[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Silently fail
  }
}

export function clearQueuedOrders(slug: string): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queue: QueuedOrder[] = JSON.parse(raw);
    const filtered = queue.filter((o) => o.slug !== slug);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}
