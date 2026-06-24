import React from 'react';
import { LayoutGrid, Users, ChefHat, Table, ClipboardList, UserCheck, Settings, ToggleLeft, CreditCard, Palette, Tag, Star, CalendarDays, Clock, Percent, Grid3X3, Gift, Timer, FileBarChart, Sparkles, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '../../contexts/I18nContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
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
    { id: 'payment-links', icon: CreditCard },
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
  'payment-links': 'nav.paymentLinks',
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

export function Sidebar({ activeTab, onTabChange, mobileOpen = false, onClose }: SidebarProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = React.useState(true);
  // Collapse is a DESKTOP-only behaviour (hover to expand). On mobile the sidebar
  // is a full-width off-canvas drawer with labels always visible.
  const hide = `lg:transition-opacity lg:duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0 lg:group-hover:opacity-100 lg:group-hover:w-auto lg:group-hover:ml-3' : ''}`;

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#5C4033] text-white p-4 flex flex-col transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:min-h-screen group lg:hover:w-64 ${collapsed ? 'lg:w-20' : 'lg:w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className={`flex items-center justify-between mb-8 px-2 lg:${collapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center">
          <ChefHat className="w-8 h-8 mr-2" />
          <span className={`text-xl font-bold ${hide}`}>{t('nav.admin')}</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-[#F5DEB3]" aria-label="Close menu"><X className="w-5 h-5" /></button>
      </div>

      <nav className="space-y-4 overflow-y-auto">
        {groups.map((groupNav) => (
          <div key={groupNav.label} className="space-y-1">
            <p className={`px-4 text-[10px] font-semibold uppercase tracking-wider text-[#C9A26B] ${collapsed ? 'lg:opacity-0 lg:h-0 lg:group-hover:opacity-100 lg:group-hover:h-auto' : ''}`}>
              {groupNav.label}
            </p>
            {groupNav.items.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { onTabChange(tab.id); onClose?.(); }}
                  className={`w-full flex items-center ${collapsed ? 'lg:justify-center lg:group-hover:justify-start' : ''} px-4 py-2.5 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#8B4513] text-white'
                      : 'text-[#F5DEB3] hover:bg-[#6A4B35]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${collapsed ? 'lg:mr-0' : ''}`} />
                  <span className={hide}>{t(tabKeyMap[tab.id] as TranslationKey)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}