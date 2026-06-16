import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid'),
}));

import { getCustomers, findOrCreateCustomer, recordCustomerVisit, updateCustomer } from './customerService.js';
import { db } from '../db/index.js';

describe('customerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('returns a list of customers for the tenant', async () => {
      const mockCustomers = [
        { id: 'c1', name: 'Alice', email: 'alice@test.com', tenantId: 'tenant-1' },
        { id: 'c2', name: 'Bob', email: 'bob@test.com', tenantId: 'tenant-1' },
      ];
      db.__setQueryData(mockCustomers);

      const result = await getCustomers('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
    });
  });

  describe('findOrCreateCustomer', () => {
    it('returns existing customer when email matches', async () => {
      db.__setQueryData([{ id: 'c1', name: 'Existing', email: 'existing@test.com', tenantId: 'tenant-1' }]);

      const result = await findOrCreateCustomer('tenant-1', { name: 'Existing', email: 'existing@test.com' });

      expect(result.id).toBe('c1');
      expect(result.email).toBe('existing@test.com');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('returns existing customer when phone matches and email does not', async () => {
      db.__setQueryQueue([
        [],
        [{ id: 'c2', name: 'Phone User', phone: '+123', tenantId: 'tenant-1' }],
      ]);

      const result = await findOrCreateCustomer('tenant-1', { name: 'Phone User', phone: '+123' });

      expect(result.id).toBe('c2');
      expect(result.phone).toBe('+123');
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('creates a new customer when no match found and no phone provided', async () => {
      db.__setQueryQueue([
        [],
        [{ id: 'mock-uuid', name: 'New Customer', email: 'new@test.com', tenantId: 'tenant-1' }],
      ]);

      const result = await findOrCreateCustomer('tenant-1', { name: 'New Customer', email: 'new@test.com' });

      expect(result.id).toBe('mock-uuid');
      expect(result.name).toBe('New Customer');
      expect(db.insert).toHaveBeenCalledOnce();
    });

    it('creates a new customer when neither email nor phone match', async () => {
      db.__setQueryQueue([
        [],
        [],
        [{ id: 'mock-uuid', name: 'Brand New', phone: '+999', tenantId: 'tenant-1' }],
      ]);

      const result = await findOrCreateCustomer('tenant-1', { name: 'Brand New', phone: '+999' });

      expect(result.id).toBe('mock-uuid');
      expect(result.name).toBe('Brand New');
      expect(db.insert).toHaveBeenCalledOnce();
    });
  });

  describe('recordCustomerVisit', () => {
    it('updates customer visit statistics', async () => {
      await recordCustomerVisit('cust-1', 50);

      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
    });
  });

  describe('updateCustomer', () => {
    it('updates customer fields', async () => {
      await updateCustomer('cust-1', 'tenant-1', { name: 'Updated', notes: 'VIP' });

      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
    });
  });
});
