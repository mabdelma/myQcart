import React from 'react';
import { LayoutGrid, Users, ChefHat, Table, ClipboardList, UserCheck, Settings, ToggleLeft, CreditCard, Palette, Tag, Star, CalendarDays, Clock, Percent, Grid3X3, Gift, Timer, FileBarChart, Sparkles } from 'lucide-react';
import { useI18n, type TranslationKey } from '../../contexts/I18nContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Escoutly-style grouped navigation — sections instead of a flat list.
const groups = [
  { label: 'Overview', items: [
    { id: 'analytics', icon: LayoutGrid },
    { id: 'assistant', icon: Sparkles },
    { id: 'reports', icon: FileBarChart },
  ] },
  { label: 'Operations', items: [
    { id: 'orders', icon: ClipboardList },
    { id: 'tables', icon: Table },
    { id: 'layout', icon: Grid3X3 },
    { id: 'reservations', icon: CalendarDays },
    { id: 'waitlist', icon: Clock },
  ] },
  { label: 'Menu', items: [
    { id: 'menu', icon: ChefHat },
    { id: 'modifiers', icon: ToggleLeft },
  ] },
  { label: 'Team', items: [
    { id: 'staff', icon: UserCheck },
    { id: 'users', icon: Users },
    { id: 'time-tracking', icon: Timer },
  ] },
  { label: 'Marketing', items: [
    { id: 'campaigns', icon: Tag },
    { id: 'loyalty', icon: Star },
    { id: 'gift-cards', icon: Gift },
  ] },
  { label: 'Account', items: [
    { id: 'subscription', icon: CreditCard },
    { id: 'branding', icon: Palette },
    { id: 'tax', icon: Percent },
    { id: 'settings', icon: Settings },
  ] },
] as const;

const tabKeyMap: Record<string, string> = {
  analytics: 'nav.dashboard',
  assistant: 'nav.assistant',
  orders: 'nav.orders',
  reports: 'nav.reports',
  staff: 'nav.staff',
  users: 'nav.customers',
  menu: 'nav.menu',
  modifiers: 'nav.modifiers',
  tables: 'staff.tables',
  layout: 'layout.title',
  subscription: 'nav.subscription',
  branding: 'nav.branding',
  campaigns: 'nav.promotions',
  waitlist: 'waitlist.title',
  reservations: 'reservations.title',
  tax: 'tax.title',
  loyalty: 'nav.loyalty',
  'gift-cards': 'giftCards.title',
  'time-tracking': 'timeTracking.title',
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
      
      <nav className="space-y-4 overflow-y-auto">
        {groups.map((groupNav) => (
          <div key={groupNav.label} className="space-y-1">
            <p className={`px-4 text-[10px] font-semibold uppercase tracking-wider text-[#C9A26B] transition-opacity duration-300 ${collapsed ? 'opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto' : 'opacity-100'}`}>
              {groupNav.label}
            </p>
            {groupNav.items.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center ${collapsed ? 'justify-center group-hover:justify-start' : ''} px-4 py-2.5 text-sm rounded-lg transition-colors ${
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
          </div>
        ))}
      </nav>
    </div>
  );
}