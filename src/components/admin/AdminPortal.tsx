import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StaffPerformance } from './staff/StaffPerformance';
import { OrderManagement } from './OrderManagement';
import { MenuManagement } from './MenuManagement';
import { TableManagement } from './TableManagement';
import { Analytics } from './Analytics';
import { AdminProfile } from './AdminProfile';
import { UserManagement } from './UserManagement';
import { NotificationsProvider } from '../../contexts/NotificationsContext';

const routes = [
  { path: 'analytics', element: <Analytics /> },
  { path: 'orders', element: <OrderManagement /> },
  { path: 'staff', element: <StaffPerformance /> },
  { path: 'menu', element: <MenuManagement /> },
  { path: 'tables', element: <TableManagement /> },
  { path: 'profile', element: <AdminProfile /> },
  { path: 'users', element: <UserManagement /> }
];

export function AdminPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/')[2] || 'profile';

  const handleTabChange = (tab: string) => {
    navigate(`/admin/${tab}`);
  };

  return (
    <NotificationsProvider role="admin">
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="flex-1">
          <Header />
          
          <main className="p-8">
            <Routes>
              <Route index element={<Navigate to="analytics" replace />} />
              {routes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Routes>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}