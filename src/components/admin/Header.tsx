import React from 'react';
import { User, Settings, LogOut, Menu, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { NotificationsBell } from '../ui/NotificationsBell';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useI18n } from '../../contexts/I18nContext';

interface HeaderProps {
  username?: string;
  onMenuClick?: () => void;
}

export function Header({ username = 'Admin User', onMenuClick }: HeaderProps) {
  const { t } = useI18n();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-full px-4 flex justify-between items-center h-16 gap-2">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 shrink-0 text-gray-600" aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        <div className="relative w-full max-w-96">
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        
        <div className="flex items-center space-x-4">
          {state.tenant?.slug && (
            <a
              href={`/r/${state.tenant.slug}`}
              target="_blank"
              rel="noreferrer"
              title={t('nav.viewStorefrontHint')}
              aria-label={t('nav.viewStorefront')}
              className="flex items-center gap-1.5 rounded-lg border border-[#8B4513] px-2.5 sm:px-3 py-1.5 text-sm font-medium text-[#8B4513] transition-colors hover:bg-[#F5DEB3]/40"
            >
              <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">{t('nav.viewStorefront')}</span>
            </a>
          )}
          <LanguageSwitcher />
          <NotificationsBell />
          
          <div className="flex items-center space-x-2">
            <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2 focus:outline-none"
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              <span className="text-sm font-medium text-gray-700">{state.user?.name || username}</span>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5DEB3]">
                {state.user?.profileImage ? (
                  <img
                    src={state.user.profileImage}
                    alt={state.user.name}
                    width="32"
                    height="32"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-[#5C4033]" aria-hidden />
                )}
              </div>
            </button>

            {showProfileMenu && (
              <>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      navigate('/admin/profile');
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4 mr-2" aria-hidden />
                    {t('staff.profileSettings')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" aria-hidden />
                    {t('staff.signOut')}
                  </button>
                </div>

                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}