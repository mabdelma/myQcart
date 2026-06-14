import { db, schema } from '../db/index.js';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';
import { sendDemoNotification } from '../lib/mail.js';

export interface CreateDemoRequestInput {
  name: string;
  email: string;
  restaurant: string;
  phone?: string;
  size?: string;
  message?: string;
}

export async function createDemoRequest(input: CreateDemoRequestInput) {
  const id = uuid();

  await db.insert(schema.demoRequests).values({
    id,
    name: input.name,
    email: input.email,
    restaurant: input.restaurant,
    phone: input.phone,
    size: input.size,
    message: input.message,
  });

  logger.info({ id, email: input.email }, 'Demo request created');

  sendDemoNotification(input.email, input.name, input.restaurant).catch((err) =>
    logger.error({ err }, 'Failed to send demo notification email')
  );

  return {
    data: { id },
    status: 201 as const,
  };
}
