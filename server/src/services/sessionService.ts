import { db, schema } from '../db/index.js';
import { lt } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

export async function createSession(userId: string, tenantId: string): Promise<string> {
  const id = uuid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(schema.sessions).values({ id, userId, tenantId, expiresAt });

  return id;
}

export async function cleanupExpiredSessions(): Promise<void> {
  await db
    .delete(schema.sessions)
    .where(lt(schema.sessions.expiresAt, new Date().toISOString()));
}
