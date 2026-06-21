import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authApi } from '../lib/api';
import type { User, Tenant } from '../lib/api/types';

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

const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string, totpToken?: string) => Promise<User | 'TWO_FACTOR' | null>;
  loginWithGoogle: (credential: string) => Promise<User | null>;
  logout: () => void;
} | null>(null);

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, tenant: null, loading: true, error: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    authApi.me()
      .then((data) => {
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, tenant: data.tenant } });
      })
      .catch(() => {
        localStorage.removeItem('token');
        dispatch({ type: 'SET_LOADING', payload: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string, totpToken?: string): Promise<User | 'TWO_FACTOR' | null> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.login(email, password, totpToken);
      // 2FA-enabled account: password was correct but a code is required.
      if (res.twoFactorRequired || !res.token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return 'TWO_FACTOR';
      }
      localStorage.setItem('token', res.token);
      const me = await authApi.me();
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: me.user, tenant: me.tenant } });
      return me.user;
    } catch (err) {
      const msg = (err as { message?: string }).message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      return null;
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<User | null> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await authApi.google(credential);
      localStorage.setItem('token', res.token);
      const me = await authApi.me();
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: me.user, tenant: me.tenant } });
      return me.user;
    } catch (err) {
      const msg = (err as { message?: string }).message || 'Google sign-in failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
