import React from 'react';
import { ChefHat, Users, ClipboardList, Store, Clock, Settings } from 'lucide-react';

interface SidebarProps {
  role: 'kitchen' | 'waiter' | 'cashier';
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabsByRole = {
  kitchen: [
    { id: 'orders', name: 'Active Orders', icon: ClipboardList },
    { id: 'history', name: 'Order History', icon: Clock },
    { id: 'profile', name: 'Profile', icon: Settings }
  ],
  waiter: [
    { id: 'tables', name: 'Tables', icon: Users },
    { id: 'pos', name: 'Point of Sale', icon: Store },
    { id: 'orders', name: 'Orders', icon: ClipboardList },
    { id: 'history', name: 'History', icon: Clock },
    { id: 'profile', name: 'Profile', icon: Settings }
  ],
  cashier: [
    { id: 'pos', name: 'Point of Sale', icon: Store },
    { id: 'payments', name: 'Payments', icon: ClipboardList },
    { id: 'history', name: 'History', icon: Clock },
    { id: 'profile', name: 'Profile', icon: Settings }
  ]
};

export function StaffSidebar({ role, activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(true);
  const tabs = tabsByRole[role];

  return (
    <div 
      className={`${collapsed ? 'w-20' : 'w-64'} bg-[#5C4033] min-h-screen text-white p-4 transition-all duration-300 relative group hover:w-64`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className={`flex items-center mb-8 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <ChefHat className="w-8 h-8 mr-2" />
        <span className={`text-xl font-bold transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          {role.charAt(0).toUpperCase() + role.slice(1)} Panel
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
                {tab.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}