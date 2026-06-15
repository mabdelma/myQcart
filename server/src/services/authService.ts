import crypto from 'node:crypto';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { createToken, verifyToken, getTokenFromRequest } from '../lib/auth.js';
import { createSession, cleanupExpiredSessions } from './sessionService.js';
import { logger } from '../lib/logger.js';
import { sendEmail } from '../lib/mail.js';
import type { Context } from 'hono';

export interface RegisterInput {
  tenantSlug: string;
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'waiter' | 'kitchen' | 'cashier';
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const [existingTenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, input.tenantSlug))
    .limit(1);

  if (!existingTenant) {
    return { error: 'Restaurant not found. Contact your admin.', status: 404 as const };
  }

  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  if (existingUser) {
    return { error: 'Email already registered', status: 409 as const };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = uuid();

  await db.insert(schema.users).values({
    id: userId,
    tenantId: existingTenant.id,
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role || 'waiter',
  });

  const token = await createToken({
    sub: userId,
    userId,
    tenantId: existingTenant.id,
    role: input.role || 'waiter',
  });

  logger.info({ userId, tenantId: existingTenant.id, role: input.role }, 'User registered');

  return {
    data: {
      token,
      user: { id: userId, name: input.name, email: input.email, role: input.role || 'waiter' },
    },
    status: 201 as const,
  };
}

export async function loginUser(input: LoginInput) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, input.email))
    .limit(1);

  if (!user) {
    return { error: 'Invalid credentials', status: 401 as const };
  }

  if (!user.isActive) {
    return { error: 'Account is disabled', status: 403 as const };
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    return { error: 'Invalid credentials', status: 401 as const };
  }

  const token = await createToken({
    sub: user.id,
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  await db
    .update(schema.users)
    .set({ lastActive: new Date().toISOString() })
    .where(eq(schema.users.id, user.id));

  await createSession(user.id, user.tenantId!);
  await cleanupExpiredSessions();

  logger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

  return {
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    },
    status: 200 as const,
  };
}

export async function requestPasswordReset(email: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    logger.info({ email }, 'Password reset requested for non-existent email');
    return { data: { message: 'If an account with that email exists, a reset link has been sent.' }, status: 200 as const };
  }

  const rawToken = uuid();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db
    .update(schema.users)
    .set({ resetToken: tokenHash, resetTokenExpiry: expiry })
    .where(eq(schema.users.id, user.id));

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your QCart password',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr />
      <p style="color:#666;font-size:12px;">QCart</p>
    `,
  });

  logger.info({ userId: user.id }, 'Password reset token generated');

  return { data: { message: 'If an account with that email exists, a reset link has been sent.' }, status: 200 as const };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.resetToken, tokenHash))
    .limit(1);

  if (!user) {
    return { error: 'Invalid or expired reset token', status: 400 as const };
  }

  if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
    return { error: 'Reset token has expired', status: 400 as const };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(schema.users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(schema.users.id, user.id));

  await db
    .delete(schema.sessions)
    .where(eq(schema.sessions.userId, user.id));

  logger.info({ userId: user.id }, 'Password reset completed');

  return { data: { message: 'Password has been reset successfully.' }, status: 200 as const };
}

export async function getCurrentUser(c: Context) {
  const token = getTokenFromRequest(c);
  if (!token) {
    return { error: 'Authentication required', status: 401 as const };
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return { error: 'Invalid or expired token', status: 401 as const };
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, payload.userId))
    .limit(1);

  if (!user) {
    return { error: 'User not found', status: 404 as const };
  }

  // super_admin has no tenant (payload.tenantId is null).
  const [tenant] = payload.tenantId
    ? await db
        .select()
        .from(schema.tenants)
        .where(eq(schema.tenants.id, payload.tenantId))
        .limit(1)
    : [undefined];

  return {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        tenantId: user.tenantId,
        joinedAt: user.joinedAt,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            currency: tenant.currency,
            timezone: tenant.timezone,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
          }
        : null,
    },
    status: 200 as const,
  };
}
