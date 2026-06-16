import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post<{ message: string }>('/auth/forgot-password', { email }, { skipAuth: true });
      setSent(true);
    } catch (err) {
      setError((err as { message?: string }).message || t('error.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.checkEmail')}</h1>
            <p className="mt-2 text-gray-500">
              If an account with that email exists, a reset link has been sent.
            </p>
            <Link
              to="/signin"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover"
            >
              <ArrowLeft className="h-4 w-4" /> {t('auth.backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.forgotPassword')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            No worries — enter your email and we'll send you a reset link.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border-l-4 border-red-400 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')}
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner /> : <>{t('auth.sendResetLink')} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link to="/signin" className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-hover">
              <ArrowLeft className="h-4 w-4" /> {t('auth.backToSignIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
