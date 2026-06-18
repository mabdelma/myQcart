import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from './logger.js';

export async function addExpoPushToken(tenantId: string, token: string, deviceInfo?: string) {
  const existing = await db
    .select({ id: schema.expoPushTokens.id })
    .from(schema.expoPushTokens)
    .where(eq(schema.expoPushTokens.token, token))
    .limit(1);

  if (existing.length > 0) {
    await db.update(schema.expoPushTokens)
      .set({ deviceInfo })
      .where(eq(schema.expoPushTokens.token, token));
    return;
  }

  await db.insert(schema.expoPushTokens).values({
    id: uuid(),
    tenantId,
    token,
    deviceInfo,
  });
}

export async function removeExpoPushToken(token: string) {
  await db.delete(schema.expoPushTokens)
    .where(eq(schema.expoPushTokens.token, token));
}

export async function sendExpoPushNotification(
  tenantId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const tokens = await db
    .select({ token: schema.expoPushTokens.token })
    .from(schema.expoPushTokens)
    .where(eq(schema.expoPushTokens.tenantId, tenantId));

  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default' as const,
    title,
    body,
    data: data || {},
    priority: 'high' as const,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Expo push API error');
      return { sent: 0, failed: tokens.length };
    }

    const result = (await response.json()) as { data?: Array<{ status: string; id?: string; message?: string }> };
    const dataArr = result.data || [];

    for (let i = 0; i < dataArr.length; i++) {
      if (dataArr[i]?.status === 'error') {
        const details = dataArr[i]?.message || '';
        if (details.includes('DeviceNotRegistered') || details.includes('InvalidCredentials')) {
          await removeExpoPushToken(tokens[i].token);
        }
      }
    }

    return { sent: dataArr.filter((d) => d?.status === 'ok').length, failed: dataArr.filter((d) => d?.status === 'error').length };
  } catch (err) {
    logger.error({ err }, 'Expo push send failed');
    return { sent: 0, failed: tokens.length };
  }
}
