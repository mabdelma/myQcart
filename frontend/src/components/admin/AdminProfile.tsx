import React, { useState } from 'react';
import { User, Camera, Mail, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDB } from '../../lib/db';
import { uploadImage } from '../../lib/utils/imageUpload';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function AdminProfile() {
  const { state, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: state.user?.name || '',
    email: state.user?.email || '',
    password: '',
    confirmPassword: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.user) return;

    setLoading(true);
    setError(null);

    try {
      const imageUrl = await uploadImage(file);
      const db = await getDB();
      const updatedUser = {
        ...state.user,
        profileImage: imageUrl
      };
      
      await db.put('users', updatedUser);
      login(state.user.email, ''); // Refresh user data
    } catch (err) {
      setError('Failed to upload image');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user) return;

    // Validate password match if changing password
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDB();
      
      // Check if email is already taken by another user
      if (formData.email !== state.user.email) {
        const existingUser = await db.getAll('users');
        if (existingUser.some(u => u.email === formData.email && u.id !== state.user?.id)) {
          throw new Error('Email is already taken');
        }
      }

      const updatedUser = {
        ...state.user,
        name: formData.name,
        email: formData.email,
        lastActive: new Date()
      };
      
      await db.put('users', updatedUser);
      login(formData.email, ''); // Refresh user data
      setEditing(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to update profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!state.user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="relative h-32 bg-gradient-to-r from-[#8B4513] to-[#5C4033]">
          <div className="absolute -bottom-16 left-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                {state.user.profileImage ? (
                  <img
                    src={state.user.profileImage}
                    alt={state.user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-4 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50">
                <Camera className="w-5 h-5 text-gray-600" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-20 px-6 pb-6">
          {error && <ErrorMessage message={error} />}

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                  />
                  <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 relative">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                  />
                  <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                    placeholder="Leave blank to keep current password"
                  />
                  <Key className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <div className="mt-1 relative">
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8B4513] focus:ring-[#8B4513]"
                    placeholder="Leave blank to keep current password"
                  />
                  <Key className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#8B4513] text-white rounded-md hover:bg-[#5C4033] disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner /> : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{state.user.name}</h2>
                  <span className="inline-block mt-1 px-3 py-1 bg-[#F5DEB3] text-[#8B4513] rounded-full text-sm font-medium capitalize">
                    {state.user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      name: state.user?.name || '',
                      email: state.user?.email || '',
                      password: '',
                      confirmPassword: ''
                    });
                    setEditing(true);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Edit Profile
                </button>
              </div>

              <dl className="mt-6 space-y-4">
                <div className="flex items-center text-gray-500">
                  <Mail className="w-5 h-5 mr-2" />
                  <dt className="sr-only">Email</dt>
                  <dd>{state.user.email}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}