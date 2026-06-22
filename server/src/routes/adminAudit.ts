import { Hono } from 'hono';
import { db, schema } from '../db/index.js';
import { desc, eq } from 'drizzle-orm';
import { authMiddleware, requireRole } from '../middleware/auth.js';

// Platform activity log (super admin) — recent audited actions across all tenants.
// Separate file so it doesn't touch admin.ts (kept conflict-free for parallel work).
const adminAudit = new Hono();

adminAudit.get('/admin/audit-logs', authMiddleware, requireRole('super_admin'), async (c) => {
  const rows = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      resource: schema.auditLogs.resource,
      resourceId: schema.auditLogs.resourceId,
      userName: schema.users.name,
      tenantName: schema.tenants.name,
      ip: schema.auditLogs.ip,
      createdAt: schema.auditLogs.createdAt,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .leftJoin(schema.tenants, eq(schema.auditLogs.tenantId, schema.tenants.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(200);
  return c.json(rows);
});

export default adminAudit;
