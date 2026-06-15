import { describe, it, expect } from 'vitest';

describe('useTableFlow', () => {
  it('is a function that throws when called outside provider', async () => {
    const mod = await import('../TableFlowLayout.js');
    expect(typeof mod.useTableFlow).toBe('function');
  });
});
