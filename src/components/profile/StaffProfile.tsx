import React, { useState } from 'react';
import { User, Camera, Phone, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { userApi, uploadApi } from '../../lib/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function StaffProfile() {
  const { state: authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: authState.user?.name || '',
    phone: authState.user?.phone || '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authState.user || !authState.tenant?.slug) return;

    setLoading(true);
    setError(null);

    try {
      const { url } = await uploadApi.image(authState.tenant.slug, file);
      await userApi.update(authState.tenant.slug, authState.user.id, { avatar: url });
    } catch {
      setError('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user || !authState.tenant?.slug) return;

    setLoading(true);
    setError(null);

    try {
      await userApi.update(authState.tenant.slug, authState.user.id, formData);
      setEditing(false);
    } catch {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!authState.user) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-brand to-brand-hover">
          <div className="absolute -bottom-16 left-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden dark:border-gray-800">
                {authState.user.avatar ? (
                  <img
                    src={authState.user.avatar}
                    alt={authState.user.name}
                    width="128"
                    height="128"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-4 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600">
                <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
        </div>

        <div className="pt-20 px-6 pb-6">
          {error && <ErrorMessage message={error} />}

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="staff-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  id="staff-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="staff-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <input
                  id="staff-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand focus:ring-brand dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner /> : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{authState.user.name}</h2>
                  <span className="inline-block mt-1 px-3 py-1 bg-brand-light text-brand rounded-full text-sm font-medium capitalize">
                    {authState.user.role}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Edit Profile
                </button>
              </div>
              <dl className="mt-6 space-y-4">
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Mail className="w-5 h-5 mr-2" />
                  <dt className="sr-only">Email</dt>
                  <dd>{authState.user.email}</dd>
                </div>
                {authState.user.phone && (
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Phone className="w-5 h-5 mr-2" />
                    <dt className="sr-only">Phone</dt>
                    <dd>{authState.user.phone}</dd>
                  </div>
                )}
                <div className="flex items-center text-gray-500 dark:text-gray-400">
                  <Calendar className="w-5 h-5 mr-2" />
                  <dt className="sr-only">Joined</dt>
                  <dd>Joined {new Date(authState.user.joinedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
