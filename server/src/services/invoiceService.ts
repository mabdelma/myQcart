import PDFDocument from 'pdfkit';
import { db } from '../db/index.js';
import { orders, orderItems, tenants, payments, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function generateInvoice(tenantId: string, orderId: string): Promise<Buffer> {
  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));
  if (!order) throw new Error('Order not found');

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) throw new Error('Tenant not found');

  const items = await db.select().from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const orderPayments = await db.select().from(payments)
    .where(eq(payments.orderId, orderId));

  const [server] = order.serverId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, order.serverId))
    : [{ name: '—' }];

  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#8B4513';
    const rightMargin = doc.page.width - 50;

    doc.fontSize(24).fillColor(primary).text(tenant.name, 50, 50);
    doc.fontSize(10).fillColor('#666').text(tenant.address || '', 50, 78);
    doc.fontSize(10).fillColor('#666').text(`Phone: ${tenant.phone || '—'}`, 50, 94);
    doc.fontSize(10).fillColor('#666').text(`Email: ${tenant.email}`, 50, 108);

    doc.fontSize(20).fillColor(primary).text('INVOICE', rightMargin, 50, { align: 'right' });
    doc.fontSize(10).fillColor('#666').text(`#${orderId.slice(0, 8).toUpperCase()}`, rightMargin, 78, { align: 'right' });
    doc.fontSize(10).fillColor('#666').text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, rightMargin, 94, { align: 'right' });

    doc.moveTo(50, 135).lineTo(rightMargin, 135).strokeColor('#ddd').stroke();

    const topY = 155;
    doc.fontSize(10).fillColor('#666');
    doc.text('Customer', 50, topY);
    doc.text('Server', 200, topY);
    doc.text('Order Type', 350, topY);
    doc.text('Status', 450, topY);

    doc.fontSize(11).fillColor('#333');
    doc.text(order.customerName || 'Walk-in', 50, topY + 16);
    doc.text(server.name, 200, topY + 16);
    doc.text(order.orderType.replace('_', ' '), 350, topY + 16);
    doc.text(order.status, 450, topY + 16);

    if (order.orderType === 'delivery' && order.deliveryAddress) {
      doc.fontSize(9).fillColor('#666').text(`Deliver to: ${order.deliveryAddress}`, 50, topY + 36);
    }

    const tableTop = topY + 60;
    doc.moveTo(50, tableTop - 6).lineTo(rightMargin, tableTop - 6).strokeColor('#ddd').stroke();

    doc.fontSize(10).fillColor(primary);
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 350, tableTop, { width: 40, align: 'right' });
    doc.text('Price', 390, tableTop, { width: 60, align: 'right' });
    doc.text('Total', 460, tableTop, { width: 60, align: 'right' });

    doc.moveTo(50, tableTop + 14).lineTo(rightMargin, tableTop + 14).strokeColor(primary).stroke();

    let y = tableTop + 24;
    items.forEach((item) => {
      const total = item.quantity * item.unitPrice;
      doc.fontSize(10).fillColor('#333');
      doc.text(item.name, 50, y);
      if (item.isComp) {
        doc.fillColor('#999').text('(Comp)', 50, y + 12);
      }
      doc.text(String(item.quantity), 350, y, { width: 40, align: 'right' });
      doc.text(`$${item.unitPrice.toFixed(2)}`, 390, y, { width: 60, align: 'right' });
      doc.fillColor(item.isComp ? '#999' : '#333').text(item.isComp ? '$0.00' : `$${total.toFixed(2)}`, 460, y, { width: 60, align: 'right' });
      y += item.notes ? 28 : 20;
      if (item.notes) {
        doc.fontSize(8).fillColor('#999').text(`  ${item.notes}`, 50, y);
        y += 14;
      }
    });

    const summaryY = Math.max(y + 20, 420);

    doc.moveTo(350, summaryY).lineTo(rightMargin, summaryY).strokeColor('#ddd').stroke();

    const summary: [string, string, boolean][] = [
      ['Subtotal', `$${order.subtotal.toFixed(2)}`, false],
    ];
    if (order.discountAmount && order.discountAmount > 0) {
      summary.push([`Discount${order.discountReason ? ` (${order.discountReason})` : ''}`, `-$${order.discountAmount.toFixed(2)}`, false]);
    }
    summary.push(['Tax', `$${order.tax.toFixed(2)}`, false]);
    if (order.serviceCharge > 0) {
      summary.push(['Service Charge', `$${order.serviceCharge.toFixed(2)}`, false]);
    }
    if (order.deliveryFee && order.deliveryFee > 0) {
      summary.push(['Delivery Fee', `$${order.deliveryFee.toFixed(2)}`, false]);
    }
    summary.push(['Total', `$${order.total.toFixed(2)}`, true]);

    let sy = summaryY + 10;
    summary.forEach(([label, value, bold]) => {
      doc.fontSize(bold ? 12 : 10).fillColor(bold ? primary : '#333');
      const font = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).text(label, 350, sy, { width: 120 });
      doc.text(value, 450, sy, { width: 70, align: 'right' });
      sy += bold ? 22 : 18;
    });

    if (orderPayments.length > 0) {
      sy += 10;
      doc.moveTo(50, sy).lineTo(rightMargin, sy).strokeColor('#ddd').stroke();
      sy += 10;
      doc.fontSize(10).fillColor('#666').text('Payments', 50, sy);
      sy += 16;
      orderPayments.forEach((p) => {
        doc.fontSize(9).fillColor('#333').text(`${p.method} — ${p.status}`, 50, sy);
        doc.fontSize(9).fillColor('#333').text(`$${p.amount.toFixed(2)}${p.tip ? ` (+ $${p.tip.toFixed(2)} tip)` : ''}`, rightMargin - 100, sy, { width: 100, align: 'right' });
        sy += 14;
      });
    }

    if (order.notes) {
      sy += 10;
      doc.fontSize(9).fillColor('#666').text(`Notes: ${order.notes}`, 50, sy);
    }

    doc.fontSize(8).fillColor('#aaa').text('Thank you for your business!', 50, doc.page.height - 50, { align: 'center' });
    doc.end();
  });
}
