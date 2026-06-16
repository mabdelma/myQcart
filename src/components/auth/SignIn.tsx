import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  UtensilsCrossed, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  ShieldCheck, Store, Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { homePathForRole } from '../../lib/roleRoutes';

const panelPoints = [
  { icon: ShieldCheck, title: 'Platform oversight', desc: 'Super admins manage every restaurant from one place.' },
  { icon: Store, title: 'Restaurant management', desc: 'Owners and managers run menus, tables, staff, and settings.' },
  { icon: Activity, title: 'Live operations', desc: 'Kitchen, waiters, and cashiers stay in sync in real time.' },
];

export function SignIn() {
  const navigate = useNavigate();
  const { login, state } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const user = await login(email, password);
    if (user) {
      // One central login for every role — route to the right home.
      navigate(homePathForRole(user.role), { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel ──────────────────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8B4513] to-[#3f2415] p-12 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2">
          <UtensilsCrossed className="h-8 w-8" />
          <span className="text-2xl font-bold">QCart</span>
          <span className="ml-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Console</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">The console behind every QCart restaurant.</h1>
          <p className="mt-4 text-amber-100/90">
            One secure sign-in for platform super admins, restaurant admins, and staff.
          </p>
          <ul className="mt-10 space-y-5">
            {panelPoints.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-amber-100/80">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-amber-100/70">&copy; {new Date().getFullYear()} QCart. All rights reserved.</p>
      </div>

      {/* ── Form panel ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-gray-50 px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <UtensilsCrossed className="h-8 w-8 text-[#8B4513]" />
            <span className="text-2xl font-bold text-gray-900">QCart</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{t('auth.signin')}</h2>
            <p className="mt-2 text-sm text-gray-500">
              Super admins, restaurant admins, and staff all sign in here.
            </p>
          </div>

          {state.error && (
            <div className="mb-6 rounded-lg border-l-4 border-red-400 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-700">{state.error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('auth.email')}</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-[#8B4513] focus:outline-none focus:ring-1 focus:ring-[#8B4513]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs font-medium text-[#8B4513] hover:text-[#5C4033]">{t('auth.troubleSigningIn')}</Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 shadow-sm focus:border-[#8B4513] focus:outline-none focus:ring-1 focus:ring-[#8B4513]"
                />
                <button
                  type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={state.loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B4513] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5C4033] focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:ring-offset-2 disabled:opacity-50"
            >
              {state.loading ? <LoadingSpinner /> : <>{t('auth.signin')} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between text-sm">
            <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </Link>
            <Link to="/demo" className="font-medium text-[#8B4513] hover:text-[#5C4033]">{t('cta.requestDemo')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
