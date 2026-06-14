import { describe, it, expect } from 'vitest';

describe('API client', () => {
  it('exports api instance', async () => {
    const mod = await import('./client.js');
    expect(mod.api).toBeDefined();
    expect(typeof mod.api.get).toBe('function');
    expect(typeof mod.api.post).toBe('function');
  });
});

describe('endpoints', () => {
  it('exports endpoint namespaces', async () => {
    const mod = await import('./endpoints.js');
    expect(mod.authApi).toBeDefined();
    expect(typeof mod.authApi.login).toBe('function');
    expect(typeof mod.authApi.register).toBe('function');
    expect(typeof mod.authApi.me).toBe('function');
  });

  it('exports menu endpoints', async () => {
    const mod = await import('./endpoints.js');
    expect(mod.menuApi).toBeDefined();
    expect(typeof mod.menuApi.getFullMenu).toBe('function');
    expect(typeof mod.menuApi.createItem).toBe('function');
  });

  it('exports order endpoints', async () => {
    const mod = await import('./endpoints.js');
    expect(mod.orderApi).toBeDefined();
    expect(typeof mod.orderApi.create).toBe('function');
    expect(typeof mod.orderApi.list).toBe('function');
    expect(typeof mod.orderApi.updateStatus).toBe('function');
  });
});
