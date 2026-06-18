import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/api';
import { homePathForRole } from '../../lib/roleRoutes';

// Minimal typing for the Google Identity Services global.
interface GoogleId {
  accounts?: { id?: {
    initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  } };
}
declare global {
  interface Window { google?: GoogleId }
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** "Sign in with Google" — renders only when GOOGLE_CLIENT_ID is configured server-side. */
export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    authApi.googleStatus().then(async ({ enabled: on, clientId }) => {
      if (!on || !clientId || cancelled) return;
      await loadGis();
      const id = window.google?.accounts?.id;
      if (cancelled || !ref.current || !id) return;
      id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          const user = await loginWithGoogle(resp.credential);
          if (user) navigate(homePathForRole(user.role), { replace: true });
          else setError('Google sign-in failed.');
        },
      });
      id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' });
      setEnabled(true);
    }).catch(() => { /* feature stays hidden */ });
    return () => { cancelled = true; };
  }, [loginWithGoogle, navigate]);

  return (
    <div hidden={!enabled} className="mt-4">
      <div className="relative my-4 flex items-center">
        <div className="flex-grow border-t border-gray-200" />
        <span className="mx-3 text-xs text-gray-400">or</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
      <div ref={ref} className="flex justify-center" />
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
