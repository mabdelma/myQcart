import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { authApi } from '../../lib/api';
import { AuthLayout } from './AuthLayout';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function StaffSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tenantSlug: '',
    name: '',
    email: '',
    password: '',
    role: 'kitchen' as 'kitchen' | 'waiter' | 'cashier' | 'admin',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Real server-side registration into a specific restaurant (tenant).
      await authApi.register({
        tenantSlug: formData.tenantSlug.trim(),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      navigate('/signin');
    } catch (err) {
      setError((err as { message?: string }).message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const inputCls = 'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8B4513] focus:border-[#8B4513]';

  return (
    <AuthLayout title="Staff Sign Up">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="tenantSlug" className="block text-sm font-medium text-gray-700">Restaurant code</label>
          <div className="mt-1">
            <input id="tenantSlug" name="tenantSlug" type="text" required value={formData.tenantSlug}
              onChange={handleChange} placeholder="e.g. demo-cafe" className={inputCls} />
          </div>
          <p className="mt-1 text-xs text-gray-500">Ask your manager for your restaurant code.</p>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
          <div className="mt-1">
            <input id="name" name="name" type="text" autoComplete="name" required value={formData.name} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
          <div className="mt-1">
            <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <div className="mt-1">
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} value={formData.password} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
          <div className="mt-1">
            <select id="role" name="role" value={formData.role} onChange={handleChange} className={inputCls}>
              <option value="kitchen">Kitchen Staff</option>
              <option value="cashier">Cashier</option>
              <option value="waiter">Waiter</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        <div>
          <button type="submit" disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B4513] hover:bg-[#5C4033] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B4513] disabled:opacity-50">
            {loading ? <LoadingSpinner /> : 'Sign up'}
          </button>
        </div>

        <div className="text-sm text-center">
          <button type="button" onClick={() => navigate('/signin')} className="font-medium text-[#8B4513] hover:text-[#5C4033]">
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
