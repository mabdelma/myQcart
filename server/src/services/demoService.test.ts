import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('demo-uuid'),
}));

import { createDemoRequest } from './demoService.js';
import { db } from '../db/index.js';

describe('demoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDemoRequest', () => {
    it('inserts a demo request and returns its id', async () => {
      const result = await createDemoRequest({
        name: 'John',
        email: 'john@test.com',
        restaurant: 'Test Cafe',
        phone: '+123',
        size: '11-25',
        message: 'Quick setup please',
      });

      expect(db.insert).toHaveBeenCalledOnce();
      expect('data' in result).toBe(true);
      if ('data' in result) {
        expect(result.data.id).toBe('demo-uuid');
        expect(result.status).toBe(201);
      }
    });

    it('accepts minimal input without optional fields', async () => {
      const result = await createDemoRequest({
        name: 'Jane',
        email: 'jane@test.com',
        restaurant: 'Jane Bistro',
      });

      expect(db.insert).toHaveBeenCalledOnce();
      expect('data' in result).toBe(true);
    });
  });
});
