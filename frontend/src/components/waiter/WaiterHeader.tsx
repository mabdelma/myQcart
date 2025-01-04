import React from 'react';
import { User, LayoutGrid, ClipboardList, LogOut, Settings, Store } from 'lucide-react';
import { NotificationsBell } from '../ui/NotificationsBell';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface WaiterHeaderProps {
  activeView: 'tables' | 'orders' | 'pos';
  onViewChange: (view: 'tables' | 'orders' | 'pos') => void;
  onProfileClick: () => void;
}

export function WaiterHeader({ activeView, onViewChange, onProfileClick }: WaiterHeaderProps) {
  const { state, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/staff/signin');
  };

  return (
    <div className="bg-[#5C4033] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">Waiter Panel</h1>
            <nav className="ml-6 flex space-x-2">
              <button
                onClick={() => onViewChange('tables')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeView === 'tables'
                    ? 'bg-[#8B4513] text-white'
                    : 'text-[#F5DEB3] hover:bg-[#6A4B35]'
                }`}
              >
                <LayoutGrid className="w-5 h-5 mr-2" />
                Tables
              </button>
              <button
                onClick={() => onViewChange('orders')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeView === 'orders'
                    ? 'bg-[#8B4513] text-white'
                    : 'text-[#F5DEB3] hover:bg-[#6A4B35]'
                }`}
              >
                <ClipboardList className="w-5 h-5 mr-2" />
                Orders
              </button>
              <button
                onClick={() => onViewChange('pos')}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  activeView === 'pos'
                    ? 'bg-[#8B4513] text-white'
                    : 'text-[#F5DEB3] hover:bg-[#6A4B35]'
                }`}
              >
                <Store className="w-5 h-5 mr-2" />
                Point of Sale
              </button>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationsBell />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <span className="text-[#F5DEB3]">{state.user?.name}</span>
                <div className="w-10 h-10 rounded-full bg-[#8B4513] flex items-center justify-center overflow-hidden">
                  {state.user?.profileImage ? (
                    <img
                      src={state.user.profileImage}
                      alt={state.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-[#F5DEB3]" />
                  )}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => {
                      onProfileClick();
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}

              {showProfileMenu && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowProfileMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}