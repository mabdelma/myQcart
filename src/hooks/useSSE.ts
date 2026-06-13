import { useEffect, useRef, useCallback } from 'react';

interface SSEOptions {
  onOrderCreated?: (data: { orderId: string }) => void;
  onOrderUpdated?: (data: { orderId: string; status?: string }) => void;
  onOrderStatusChanged?: (data: { orderId: string; status: string }) => void;
  enabled?: boolean;
}

export function useSSE(slug: string | undefined, options: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!slug) return;
    if (eventSourceRef.current) return;

    const url = `/api/r/${slug}/events`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('order_created', (event) => {
      const data = JSON.parse(event.data);
      optionsRef.current.onOrderCreated?.(data);
    });

    es.addEventListener('order_updated', (event) => {
      const data = JSON.parse(event.data);
      optionsRef.current.onOrderUpdated?.(data);
    });

    es.addEventListener('order_status_changed', (event) => {
      const data = JSON.parse(event.data);
      optionsRef.current.onOrderStatusChanged?.(data);
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 3000);
    };
  }, [slug]);

  useEffect(() => {
    if (options.enabled !== false) {
      connect();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect, options.enabled]);
}
