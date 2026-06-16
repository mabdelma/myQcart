import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function ResetPassword() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(t('auth.invalidToken'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post<{ message: string }>(
        '/auth/reset-password',
        { token, password },
        { skipAuth: true },
      );
      setSuccess(true);
    } catch (err) {
      setError((err as { message?: string }).message || t('error.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.invalidToken')}</h1>
            <p className="mt-2 text-gray-500">{t('auth.tokenExpired')}</p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover"
            >
              <ArrowLeft className="h-4 w-4" /> {t('auth.sendResetLink')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.passwordResetSuccess')}</h1>
            <p className="mt-2 text-gray-500">{t('auth.passwordResetSuccess')}</p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover"
            >
              <ArrowLeft className="h-4 w-4" /> {t('auth.backToSignIn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.resetYourPassword')}</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your new password below.</p>

          {error && (
            <div className="mt-4 rounded-lg border-l-4 border-red-400 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                {t('auth.newPassword')}
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="new-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:text-gray-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : t('auth.resetPassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
