import crypto from 'node:crypto';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { createToken, verifyToken, getTokenFromRequest } from '../lib/auth.js';
import { generateTotpSecret, verifyTotp, otpauthURL } from '../lib/totp.js';
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
  totpToken?: string;
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

  const verificationToken = uuid();
  const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

  await db
    .update(schema.users)
    .set({ verificationToken: verificationTokenHash, verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
    .where(eq(schema.users.id, userId));

  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: input.email,
    subject: `Verify your email — ${existingTenant.name}`,
    html: `
      <h2>Welcome, ${input.name}!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>This link expires in 24 hours.</p>
      <hr />
      <p style="color:#666;font-size:12px;">Qlisted &middot; ${existingTenant.name}</p>
    `,
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

  // 2FA gate: only for accounts that opted in. Password-correct but no/invalid
  // code → challenge (no token issued); valid code → proceed.
  if (user.totpEnabled && user.totpSecret) {
    if (!input.totpToken) {
      return { data: { twoFactorRequired: true }, status: 200 as const };
    }
    if (!verifyTotp(user.totpSecret, input.totpToken)) {
      return { error: 'Invalid 2FA code', status: 401 as const };
    }
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

export async function loginWithRefresh(input: LoginInput) {
  const userResult = await loginUser(input);
  if ('error' in userResult) return userResult;
  // 2FA challenge: no user/token yet — pass straight through (no refresh token).
  if ('twoFactorRequired' in userResult.data) return userResult;

  const refreshToken = uuid();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(schema.refreshTokens).values({
    id: uuid(),
    userId: userResult.data.user.id,
    tenantId: userResult.data.user.tenantId,
    tokenHash,
    expiresAt,
  });

  return {
    data: { ...userResult.data, refreshToken },
    status: 200 as const,
  };
}

export function googleEnabled(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID;
}

/**
 * Sign in with a Google ID token (from Google Identity Services on the client).
 * Verifies the token against GOOGLE_CLIENT_ID via Google's tokeninfo endpoint
 * (no extra dependency), then logs in the EXISTING user with that email. We do
 * not auto-provision — a Google account with no matching Qlisted user is asked
 * to be invited first (avoids assigning an ambiguous tenant/role).
 */
export async function googleLogin(idToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { error: 'Google sign-in is not configured', status: 501 as const };

  let payload: { aud?: string; email?: string; email_verified?: string | boolean };
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return { error: 'Invalid Google token', status: 401 as const };
    payload = await res.json();
  } catch {
    return { error: 'Could not verify Google token', status: 502 as const };
  }

  if (payload.aud !== clientId) return { error: 'Google token audience mismatch', status: 401 as const };
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (!payload.email || !verified) return { error: 'Google email not verified', status: 401 as const };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, payload.email)).limit(1);
  if (!user) return { error: 'No Qlisted account for this Google email — ask an admin to invite you first.', status: 404 as const };
  if (!user.isActive) return { error: 'Account is disabled', status: 403 as const };

  const token = await createToken({ sub: user.id, userId: user.id, tenantId: user.tenantId, role: user.role });
  await db.update(schema.users).set({ lastActive: new Date().toISOString() }).where(eq(schema.users.id, user.id));
  await createSession(user.id, user.tenantId!);

  const refreshToken = uuid();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.insert(schema.refreshTokens).values({
    id: uuid(),
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  logger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in via Google');
  return {
    data: {
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
    },
    status: 200 as const,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const [stored] = await db
    .select()
    .from(schema.refreshTokens)
    .where(and(eq(schema.refreshTokens.tokenHash, tokenHash), eq(schema.refreshTokens.revoked, false)))
    .limit(1);

  if (!stored) {
    return { error: 'Invalid refresh token', status: 401 as const };
  }

  if (new Date(stored.expiresAt) < new Date()) {
    return { error: 'Refresh token expired', status: 401 as const };
  }

  await db.update(schema.refreshTokens)
    .set({ revoked: true })
    .where(eq(schema.refreshTokens.id, stored.id));

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, stored.userId))
    .limit(1);

  if (!user) {
    return { error: 'User not found', status: 404 as const };
  }

  const token = await createToken({
    sub: user.id,
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  const newRefreshToken = uuid();
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(schema.refreshTokens).values({
    id: uuid(),
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: newTokenHash,
    expiresAt,
  });

  return {
    data: {
      token,
      refreshToken: newRefreshToken,
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

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.update(schema.refreshTokens)
    .set({ revoked: true })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash));
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await db.update(schema.refreshTokens)
    .set({ revoked: true })
    .where(eq(schema.refreshTokens.userId, userId));
}

export async function verifyEmail(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.verificationToken, tokenHash))
    .limit(1);

  if (!user) {
    return { error: 'Invalid verification token', status: 400 as const };
  }

  if (user.emailVerified) {
    return { data: { message: 'Email already verified' }, status: 200 as const };
  }

  if (!user.verificationTokenExpiry || new Date(user.verificationTokenExpiry) < new Date()) {
    return { error: 'Verification token has expired. Request a new one.', status: 400 as const };
  }

  await db
    .update(schema.users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(schema.users.id, user.id));

  logger.info({ userId: user.id }, 'Email verified');

  return { data: { message: 'Email verified successfully' }, status: 200 as const };
}

export async function resendVerificationEmail(email: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    return { data: { message: 'If an account with that email exists, a verification link has been sent.' }, status: 200 as const };
  }

  if (user.emailVerified) {
    return { data: { message: 'Email already verified' }, status: 200 as const };
  }

  const verificationToken = uuid();
  const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

  await db
    .update(schema.users)
    .set({
      verificationToken: verificationTokenHash,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .where(eq(schema.users.id, user.id));

  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your email — Qlisted',
    html: `
      <h2>Email Verification</h2>
      <p>Hi ${user.name},</p>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>This link expires in 24 hours.</p>
      <hr />
      <p style="color:#666;font-size:12px;">Qlisted</p>
    `,
  });

  logger.info({ userId: user.id }, 'Verification email resent');

  return { data: { message: 'If an account with that email exists, a verification link has been sent.' }, status: 200 as const };
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
    subject: 'Reset your Qlisted password',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr />
      <p style="color:#666;font-size:12px;">Qlisted</p>
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
        totpEnabled: user.totpEnabled,
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

// ── TOTP 2FA enrollment ─────────────────────────────────────────────────────
async function authedUser(c: Context) {
  const token = getTokenFromRequest(c);
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.userId)).limit(1);
    return user || null;
  } catch {
    return null;
  }
}

/** Generate a fresh secret (stored but NOT yet enabled) + return the otpauth URL. */
export async function setupTotp(c: Context) {
  const user = await authedUser(c);
  if (!user) return { error: 'Authentication required', status: 401 as const };
  const secret = generateTotpSecret();
  await db.update(schema.users).set({ totpSecret: secret }).where(eq(schema.users.id, user.id));
  return { data: { secret, otpauthUrl: otpauthURL(secret, user.email) }, status: 200 as const };
}

/** Confirm enrollment: the user must prove they can generate a valid code. */
export async function enableTotp(c: Context, token: string) {
  const user = await authedUser(c);
  if (!user) return { error: 'Authentication required', status: 401 as const };
  if (!user.totpSecret) return { error: 'Start 2FA setup first', status: 400 as const };
  if (!verifyTotp(user.totpSecret, token)) return { error: 'Invalid 2FA code', status: 401 as const };
  await db.update(schema.users).set({ totpEnabled: true }).where(eq(schema.users.id, user.id));
  return { data: { enabled: true }, status: 200 as const };
}

/** Turn 2FA off — requires a current code to prevent lockout abuse. */
export async function disableTotp(c: Context, token: string) {
  const user = await authedUser(c);
  if (!user) return { error: 'Authentication required', status: 401 as const };
  if (user.totpEnabled && user.totpSecret && !verifyTotp(user.totpSecret, token)) {
    return { error: 'Invalid 2FA code', status: 401 as const };
  }
  await db.update(schema.users).set({ totpEnabled: false, totpSecret: null }).where(eq(schema.users.id, user.id));
  return { data: { enabled: false }, status: 200 as const };
}
