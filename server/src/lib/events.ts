import { EventEmitter } from 'events';

export interface OrderEvent {
  type: 'order_created' | 'order_updated' | 'order_status_changed';
  tenantId: string;
  orderId: string;
  data?: Record<string, unknown>;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitOrderEvent(event: OrderEvent) {
  emitter.emit(`order:${event.tenantId}`, event);
}

export function onOrderEvent(tenantId: string, handler: (event: OrderEvent) => void) {
  emitter.on(`order:${tenantId}`, handler);
  return () => emitter.off(`order:${tenantId}`, handler);
}
