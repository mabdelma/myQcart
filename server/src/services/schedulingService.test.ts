import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createShift, listShifts, deleteShift } from './schedulingService.js';
import { db } from '../db/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

describe('schedulingService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockDb.__setQueryQueue([]); });

  it('createShift inserts and returns an id', async () => {
    const r = await createShift('t1', { userId: 'u1', date: '2026-07-10', startTime: '09:00', endTime: '17:00' });
    expect(r.id).toBeTruthy();
    expect(mockDb.values).toHaveBeenCalled();
  });

  it('listShifts returns the joined rows for the week', async () => {
    mockDb.__setQueryQueue([[
      { id: 'sh1', userId: 'u1', userName: 'Sam', date: '2026-07-10', startTime: '09:00', endTime: '17:00' },
    ]]);
    const rows = await listShifts('t1', '2026-07-06');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'sh1', userName: 'Sam' });
  });

  it('deleteShift succeeds', async () => {
    const r = await deleteShift('t1', 'sh1');
    expect(r.success).toBe(true);
  });
});
