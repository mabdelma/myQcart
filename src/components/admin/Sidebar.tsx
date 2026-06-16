import React from 'react';
import { LayoutGrid, Users, ChefHat, Table, ClipboardList, UserCheck, Settings, ToggleLeft, CreditCard, Palette } from 'lucide-react';
import { useI18n, type TranslationKey } from '../../contexts/I18nContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'analytics', icon: LayoutGrid },
  { id: 'orders', icon: ClipboardList },
  { id: 'staff', icon: UserCheck },
  { id: 'users', icon: Users },
  { id: 'menu', icon: ChefHat },
  { id: 'modifiers', icon: ToggleLeft },
  { id: 'tables', icon: Table },
  { id: 'subscription', icon: CreditCard },
  { id: 'branding', icon: Palette },
  { id: 'settings', icon: Settings },
] as const;

const tabKeyMap: Record<string, string> = {
  analytics: 'nav.dashboard',
  orders: 'nav.orders',
  staff: 'nav.staff',
  users: 'nav.customers',
  menu: 'nav.menu',
  modifiers: 'nav.modifiers',
  tables: 'staff.tables',
  subscription: 'nav.subscription',
  branding: 'nav.branding',
  settings: 'common.settings',
};

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <div 
      className={`${collapsed ? 'w-20' : 'w-64'} bg-[#5C4033] min-h-screen text-white p-4 transition-[width] duration-300 relative group hover:w-64`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className={`flex items-center mb-8 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <ChefHat className="w-8 h-8 mr-2" />
        <span className={`text-xl font-bold transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          {t('nav.admin')}
        </span>
      </div>
      
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center group-hover:justify-start' : ''} px-4 py-3 text-sm rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#8B4513] text-white'
                  : 'text-[#F5DEB3] hover:bg-[#6A4B35]'
              }`}
            >
              <Icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-hover:ml-3' : 'opacity-100'}`}>
                {t(tabKeyMap[tab.id] as TranslationKey)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}