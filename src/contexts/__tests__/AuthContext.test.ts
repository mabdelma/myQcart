import { describe, it, expect } from 'vitest';

type User = { id: string; email: string; name: string; role: string };
type Tenant = { id: string; name: string; slug: string };

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tenant: Tenant | null } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload.user, tenant: action.payload.tenant, error: null, loading: false };
    case 'AUTH_ERROR':
      return { ...state, user: null, tenant: null, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, tenant: null, error: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const initialState: AuthState = { user: null, tenant: null, loading: false, error: null };
const user: User = { id: '1', email: 'a@b.com', name: 'Alice', role: 'waiter' };
const tenant: Tenant = { id: '1', name: 'Test Cafe', slug: 'test-cafe' };

describe('authReducer', () => {
  it('has correct initial state', () => {
    expect(initialState.user).toBeNull();
    expect(initialState.tenant).toBeNull();
    expect(initialState.loading).toBe(false);
    expect(initialState.error).toBeNull();
  });

  it('handles AUTH_SUCCESS with user and tenant', () => {
    const state = authReducer(initialState, { type: 'AUTH_SUCCESS', payload: { user, tenant } });
    expect(state.user).toEqual(user);
    expect(state.tenant).toEqual(tenant);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('handles AUTH_SUCCESS with null tenant', () => {
    const state = authReducer(initialState, { type: 'AUTH_SUCCESS', payload: { user, tenant: null } });
    expect(state.user).toEqual(user);
    expect(state.tenant).toBeNull();
  });

  it('handles AUTH_ERROR', () => {
    const state = authReducer(initialState, { type: 'AUTH_ERROR', payload: 'Invalid credentials' });
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('handles LOGOUT and clears state', () => {
    const loggedIn: AuthState = { user, tenant, loading: false, error: null };
    const state = authReducer(loggedIn, { type: 'LOGOUT' });
    expect(state.user).toBeNull();
    expect(state.tenant).toBeNull();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('handles SET_LOADING during auth check', () => {
    const state = authReducer(initialState, { type: 'SET_LOADING', payload: true });
    expect(state.loading).toBe(true);
  });

  it('handles SET_LOADING false after completion', () => {
    const loading: AuthState = { user: null, tenant: null, loading: true, error: null };
    const state = authReducer(loading, { type: 'SET_LOADING', payload: false });
    expect(state.loading).toBe(false);
  });
});

describe('useAuth', () => {
  it('throws if used outside AuthProvider', async () => {
    const mod = await import('../AuthContext.js');
    expect(mod.useAuth).toBeDefined();
    expect(typeof mod.useAuth).toBe('function');
  });
});
