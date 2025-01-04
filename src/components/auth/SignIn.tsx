import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLayout } from './AuthLayout';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function SignIn() {
  const navigate = useNavigate();
  const { login, state } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      // Redirect based on user role
      const role = state.user?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'kitchen') navigate('/kitchen');
      else if (role === 'waiter') navigate('/waiter');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <AuthLayout title="Sign in to your account">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {state.error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8B4513] focus:border-[#8B4513]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8B4513] focus:border-[#8B4513]"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={state.loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B4513] hover:bg-[#5C4033] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B4513] disabled:opacity-50"
          >
            {state.loading ? <LoadingSpinner /> : 'Sign in'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}