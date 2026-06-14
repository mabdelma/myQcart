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

import { createTenant, getTenantBySlug, updateTenantSettings } from './tenantService.js';
import { db } from '../db/index.js';

describe('tenantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTenant', () => {
    it('returns error if slug already taken', async () => {
      db.__setQueryData([{ id: 'existing', slug: 'taken' }]);

      const result = await createTenant({
        name: 'Test',
        slug: 'taken',
        email: 'admin@test.com',
        adminName: 'Admin',
        adminPassword: 'pass123',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Restaurant slug already taken');
        expect(result.status).toBe(409);
      }
    });

    it('creates tenant and admin user', async () => {
      db.__setQueryData([]);

      const result = await createTenant({
        name: 'New Cafe',
        slug: 'new-cafe',
        email: 'admin@newcafe.com',
        adminName: 'Owner',
        adminPassword: 'secure123',
      });

      expect(db.insert).toHaveBeenCalledTimes(2);
      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.tenant.slug).toBe('new-cafe');
        expect(result.data.admin.email).toBe('admin@newcafe.com');
        expect(result.status).toBe(201);
      }
    });

    it('creates tenant with optional phone', async () => {
      db.__setQueryData([]);

      const result = await createTenant({
        name: 'Phone Cafe',
        slug: 'phone-cafe',
        email: 'admin@phone.com',
        phone: '+1-555-0100',
        adminName: 'Owner',
        adminPassword: 'pass123',
      });

      expect('data' in result).toBe(true);
      expect(result.status).toBe(201);
    });
  });

  describe('getTenantBySlug', () => {
    it('returns error if tenant not found', async () => {
      db.__setQueryData([]);

      const result = await getTenantBySlug('non-existent');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Not found');
        expect(result.status).toBe(404);
      }
    });

    it('returns tenant data', async () => {
      db.__setQueryData([{ id: 't1', name: 'Demo Cafe', slug: 'demo-cafe', logoUrl: null, coverImage: null, primaryColor: '#8B4513', currency: 'USD' }]);

      const result = await getTenantBySlug('demo-cafe');

      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.name).toBe('Demo Cafe');
        expect(result.data.slug).toBe('demo-cafe');
      }
    });
  });

  describe('updateTenantSettings', () => {
    it('updates allowed fields only', async () => {
      await updateTenantSettings('tenant-1', {
        name: 'Updated Name',
        phone: '+1-555-0199',
        taxRate: 0.1,
        disallowedField: 'should-be-ignored',
      });

      expect(db.update).toHaveBeenCalled();
    });
  });
});
