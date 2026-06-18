import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import { generateInvoice } from '../services/invoiceService.js';

const invoiceRoutes = new Hono();

invoiceRoutes.get('/:slug/orders/:orderId/invoice', authMiddleware, requireRole('admin', 'manager', 'cashier'), resolveTenant, async (c) => {
  const tenantId = c.get('tenantId')!;
  const orderId = c.req.param('orderId')!;

  try {
    const pdf = await generateInvoice(tenantId, orderId);
    return new Response(pdf as unknown as Blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${orderId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message === 'Order not found' || message === 'Tenant not found' ? 404 : 500;
    return c.json({ error: message }, status);
  }
});

export default invoiceRoutes;
