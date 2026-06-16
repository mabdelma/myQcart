import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { buildPagination } from '../lib/pagination.js';

const auditRoutes = new Hono();

auditRoutes.get('/:slug/audit-logs', authMiddleware, requireRole('admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const action = c.req.query('action');
  const offset = (page - 1) * limit;

  const conditions = [eq(schema.auditLogs.tenantId, tenantId)];
  if (action) conditions.push(eq(schema.auditLogs.action, action));

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.auditLogs)
    .where(where);

  const data = await db
    .select()
    .from(schema.auditLogs)
    .where(where)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json(buildPagination(data, Number(count), { page, limit }));
});

export default auditRoutes;
