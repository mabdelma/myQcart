import { useState } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// Self-contained TOTP 2FA enrollment card. Uses /auth/2fa/{setup,enable,disable}.
export function TwoFactorSettings() {
  const { state } = useAuth();
  const [enabled, setEnabled] = useState(!!state.user?.totpEnabled);
  const [step, setStep] = useState<'idle' | 'enrolling'>('idle');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function startSetup() {
    setError(''); setBusy(true);
    try {
      const r = await authApi.setup2fa();
      setSecret(r.secret); setOtpauthUrl(r.otpauthUrl); setStep('enrolling'); setCode('');
    } catch (e) { setError((e as { message?: string }).message || 'Could not start setup'); }
    finally { setBusy(false); }
  }

  async function confirmEnable() {
    setError(''); setBusy(true);
    try {
      await authApi.enable2fa(code);
      setEnabled(true); setStep('idle'); setSecret(''); setCode('');
    } catch (e) { setError((e as { message?: string }).message || 'Invalid code'); }
    finally { setBusy(false); }
  }

  async function disable() {
    setError(''); setBusy(true);
    try {
      await authApi.disable2fa(code);
      setEnabled(false); setCode('');
    } catch (e) { setError((e as { message?: string }).message || 'Invalid code'); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-1">
          {enabled ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldOff className="h-6 w-6 text-gray-400" />}
          <h2 className="text-lg font-semibold text-gray-900">Two-factor authentication</h2>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Add a one-time code from an authenticator app (Google Authenticator, 1Password, Authy) on top of your password.</p>

        {error && <div className="mb-4 rounded-lg border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* Disabled, not enrolling → offer to set up */}
        {!enabled && step === 'idle' && (
          <button onClick={startSetup} disabled={busy}
            className="rounded-lg bg-[#8B4513] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5C4033] disabled:opacity-50">
            {busy ? 'Starting…' : 'Set up 2FA'}
          </button>
        )}

        {/* Enrolling → show secret + verify code */}
        {!enabled && step === 'enrolling' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">1. Add this key to your authenticator app</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm tracking-wider">{secret}</code>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50" aria-label="Copy secret">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <a href={otpauthUrl} className="mt-1 inline-block text-xs text-[#8B4513] hover:underline">Open in authenticator app</a>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">2. Enter the 6-digit code to confirm</p>
              <input inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 tracking-[0.4em] focus:border-[#8B4513] focus:ring-[#8B4513]" />
            </div>
            <div className="flex gap-2">
              <button onClick={confirmEnable} disabled={busy || code.length !== 6}
                className="rounded-lg bg-[#8B4513] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#5C4033] disabled:opacity-50">
                {busy ? 'Verifying…' : 'Enable 2FA'}
              </button>
              <button onClick={() => { setStep('idle'); setError(''); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        )}

        {/* Enabled → allow disabling with a current code */}
        {enabled && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Enter a current code to turn off</label>
              <input inputMode="numeric" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 tracking-[0.4em] focus:border-[#8B4513] focus:ring-[#8B4513]" />
            </div>
            <button onClick={disable} disabled={busy || code.length !== 6}
              className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
