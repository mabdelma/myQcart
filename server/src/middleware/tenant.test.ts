import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { resolveTenant } from './tenant.js';

const TENANT = { id: 't-demo', slug: 'demo', isActive: true };

// Minimal Context stub exposing only what resolveTenant touches.
function makeCtx(slug: string, vars: Record<string, unknown>) {
  const store: Record<string, unknown> = { ...vars };
  return {
    req: { param: (k: string) => (k === 'slug' ? slug : undefined) },
    get: (k: string) => store[k],
    set: (k: string, v: unknown) => { store[k] = v; },
    store,
  } as unknown as Context & { store: Record<string, unknown> };
}

describe('resolveTenant — tenant isolation', () => {
  beforeEach(() => {
    (db as unknown as { __setQueryData: (d: unknown) => void }).__setQueryData([TENANT]);
  });

  it('allows a user acting on their OWN tenant', async () => {
    const c = makeCtx('demo', { userTenantId: 't-demo', role: 'admin' });
    const next = vi.fn();
    await resolveTenant(c, next);
    expect(next).toHaveBeenCalledOnce();
    expect((c as unknown as { store: Record<string, unknown> }).store.tenantId).toBe('t-demo');
  });

  it('BLOCKS cross-tenant access with 403', async () => {
    const c = makeCtx('demo', { userTenantId: 't-other', role: 'admin' });
    const next = vi.fn();
    await expect(resolveTenant(c, next)).rejects.toMatchObject({ status: 403 });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows super_admin to act across tenants', async () => {
    const c = makeCtx('demo', { userTenantId: undefined, role: 'super_admin' });
    const next = vi.fn();
    await resolveTenant(c, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows public (unauthenticated) requests — QR menu / ordering', async () => {
    const c = makeCtx('demo', {}); // no userTenantId set
    const next = vi.fn();
    await resolveTenant(c, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects an inactive tenant', async () => {
    (db as unknown as { __setQueryData: (d: unknown) => void }).__setQueryData([{ ...TENANT, isActive: false }]);
    const c = makeCtx('demo', {});
    const next = vi.fn();
    await expect(resolveTenant(c, next)).rejects.toBeInstanceOf(HTTPException);
    expect(next).not.toHaveBeenCalled();
  });
});
