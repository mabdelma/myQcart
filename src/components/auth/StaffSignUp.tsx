import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDB } from '../../lib/db';
import { AuthLayout } from './AuthLayout';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function StaffSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'kitchen' as 'kitchen' | 'waiter' | 'cashier' | 'admin'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const db = await getDB();
      
      // Check if email already exists
      const users = await db.getAll('users');
      if (users.some(user => user.email === formData.email)) {
        throw new Error('Email already exists');
      }

      // Create new user
      await db.add('users', {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        role: formData.role
      });

      // Redirect to sign in
      navigate('/staff/signin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <AuthLayout title="Staff Sign Up">
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <div className="mt-1">
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

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
              value={formData.email}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <div className="mt-1">
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="kitchen">Kitchen Staff</option>
              <option value="cashier">Cashier</option>
              <option value="waiter">Waiter</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Sign up'}
          </button>
        </div>

        <div className="text-sm text-center">
          <button
            type="button"
            onClick={() => navigate('/staff/signin')}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}