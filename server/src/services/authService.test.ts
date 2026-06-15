import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
  hash: vi.fn().mockResolvedValue('hashed-password'),
  compare: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

vi.mock('../lib/auth.js', () => ({
  createToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  verifyToken: vi.fn(),
  getTokenFromRequest: vi.fn(),
}));

import { registerUser, loginUser } from './authService.js';
import { db } from '../db/index.js';
import bcrypt from 'bcryptjs';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('returns error if tenant not found', async () => {
      db.__setQueryData([]);

      const result = await registerUser({
        tenantSlug: 'non-existent',
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Restaurant not found. Contact your admin.');
        expect(result.status).toBe(404);
      }
    });

    it('returns error if email already registered', async () => {
      db.__setQueryQueue([
        [{ id: 'tenant-1' }],
        [{ id: 'user-1', email: 'test@test.com' }],
      ]);

      const result = await registerUser({
        tenantSlug: 'test-cafe',
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Email already registered');
        expect(result.status).toBe(409);
      }
    });

    it('registers a user successfully', async () => {
      db.__setQueryQueue([
        [{ id: 'tenant-1' }],
        [],
      ]);

      const result = await registerUser({
        tenantSlug: 'test-cafe',
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'admin',
      });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.token).toBe('mock-jwt-token');
        expect(result.data.user.email).toBe('test@test.com');
        expect(result.data.user.role).toBe('admin');
        expect(result.status).toBe(201);
      }
    });
  });

  describe('loginUser', () => {
    it('returns error for invalid credentials', async () => {
      db.__setQueryData([]);

      const result = await loginUser({ email: 'wrong@test.com', password: 'wrong' });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Invalid credentials');
        expect(result.status).toBe(401);
      }
    });

    it('returns error for disabled account', async () => {
      db.__setQueryData([
        { id: 'user-1', isActive: false, passwordHash: 'hash', tenantId: 't1', role: 'waiter' },
      ]);

      const result = await loginUser({ email: 'disabled@test.com', password: 'password' });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Account is disabled');
        expect(result.status).toBe(403);
      }
    });

    it('returns error for wrong password', async () => {
      db.__setQueryData([
        { id: 'user-1', isActive: true, passwordHash: 'hash', tenantId: 't1', role: 'waiter' },
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await loginUser({ email: 'test@test.com', password: 'wrong' });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Invalid credentials');
        expect(result.status).toBe(401);
      }
    });

    it('logs in successfully with valid credentials', async () => {
      db.__setQueryData([
        { id: 'user-1', isActive: true, passwordHash: 'hash', tenantId: 't1', role: 'waiter', name: 'Test', email: 'test@test.com' },
      ]);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      const result = await loginUser({ email: 'test@test.com', password: 'correct' });

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.token).toBe('mock-jwt-token');
        expect(result.data.user.email).toBe('test@test.com');
        expect(result.status).toBe(200);
      }
    });
  });
});
