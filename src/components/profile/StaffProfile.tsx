import React, { useState } from 'react';
import { User, Camera, Phone, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDB } from '../../lib/db';
import { uploadImage } from '../../lib/utils/imageUpload';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

export function StaffProfile() {
  const { state, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: state.user?.name || '',
    bio: state.user?.bio || '',
    phoneNumber: state.user?.phoneNumber || ''
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

    setLoading(true);
    setError(null);

    try {
      const db = await getDB();
      const updatedUser = {
        ...state.user,
        ...formData,
        lastActive: new Date()
      };
      
      await db.put('users', updatedUser);
      login(state.user.email, ''); // Refresh user data
      setEditing(false);
    } catch (err) {
      setError('Failed to update profile');
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
        <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-500">
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
                  <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium capitalize">
                    {state.user.role}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Edit Profile
                </button>
              </div>

              {state.user.bio && (
                <p className="mt-4 text-gray-600">{state.user.bio}</p>
              )}

              <dl className="mt-6 space-y-4">
                <div className="flex items-center text-gray-500">
                  <Mail className="w-5 h-5 mr-2" />
                  <dt className="sr-only">Email</dt>
                  <dd>{state.user.email}</dd>
                </div>
                
                {state.user.phoneNumber && (
                  <div className="flex items-center text-gray-500">
                    <Phone className="w-5 h-5 mr-2" />
                    <dt className="sr-only">Phone</dt>
                    <dd>{state.user.phoneNumber}</dd>
                  </div>
                )}
                
                <div className="flex items-center text-gray-500">
                  <Calendar className="w-5 h-5 mr-2" />
                  <dt className="sr-only">Joined</dt>
                  <dd>Joined {new Date(state.user.joinedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}