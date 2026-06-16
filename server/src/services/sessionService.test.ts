import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-session-id'),
}));

import { createSession, cleanupExpiredSessions } from './sessionService.js';
import { db } from '../db/index.js';

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('inserts a session and returns its id', async () => {
      const result = await createSession('user-1', 'tenant-1');

      expect(result).toBe('mock-session-id');
      expect(db.insert).toHaveBeenCalledOnce();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('deletes sessions that have expired', async () => {
      await cleanupExpiredSessions();

      expect(db.delete).toHaveBeenCalled();
    });
  });
});
