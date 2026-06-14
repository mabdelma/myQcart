import { describe, it, expect } from 'vitest';

describe('API Health Check', () => {
  it('responds with ok status', async () => {
    const app = (await import('../index.js')).default;
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  }, 15000);

  it('returns 404 for unknown routes', async () => {
    const app = (await import('../index.js')).default;
    const res = await app.request('/api/non-existent');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Not found');
  });
});
