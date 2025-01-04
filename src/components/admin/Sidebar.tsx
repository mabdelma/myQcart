import React from 'react';
import { LayoutGrid, Users, ChefHat, Table, ClipboardList, UserCheck } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'analytics', name: 'Dashboard', icon: LayoutGrid },
  { id: 'orders', name: 'Orders', icon: ClipboardList },
  { id: 'staff', name: 'Staff', icon: UserCheck },
  { id: 'users', name: 'Users', icon: Users },
  { id: 'menu', name: 'Menu', icon: ChefHat },
  { id: 'tables', name: 'Tables', icon: Table },
] as const;

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <div 
      className={`${collapsed ? 'w-20' : 'w-64'} bg-[#5C4033] min-h-screen text-white p-4 transition-all duration-300 relative group hover:w-64`}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
    >
      <div className={`flex items-center mb-8 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <ChefHat className="w-8 h-8 mr-2" />
        <span className={`text-xl font-bold transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          Admin Panel
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
              {collapsed && !collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                  {tab.name}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}