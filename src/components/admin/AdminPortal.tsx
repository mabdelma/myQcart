import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StaffPerformance } from './staff/StaffPerformance';
import { Analytics } from './Analytics';
import { AdminProfile } from './AdminProfile';
import { UserManagement } from './UserManagement';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { MenuManagement } from '../../features/admin/MenuManagement';
import { TableManagement } from '../../features/admin/TableManagement';
import { OrderManagement } from '../../features/admin/OrderManagement';
import { SettingsPage } from '../../features/admin/SettingsPage';
import { ModifierManagement } from '../../features/admin/ModifierManagement';
import { SubscriptionManagement } from '../../features/admin/SubscriptionManagement';
import { WhiteLabelSettings } from '../../features/admin/WhiteLabelSettings';
import { AnalyticsDashboard } from '../../features/analytics/AnalyticsDashboard';
import { SalesDashboard } from '../../features/analytics/SalesDashboard';
import { ScheduledExports } from '../../features/admin/ScheduledExports';
import { CampaignManagement } from '../../features/admin/CampaignManagement';
import { LoyaltyManagement } from '../../features/admin/LoyaltyManagement';
import { ReservationManagement } from '../../features/admin/ReservationManagement';
import { WaitlistManagement } from '../../features/admin/WaitlistManagement';
import { TaxManagement } from '../../features/admin/TaxManagement';
import { TableLayoutEditor } from '../../features/admin/TableLayoutEditor';
import GiftCards from '../../features/admin/GiftCards';
import TimeTracking from '../../features/admin/TimeTracking';
import { ReportsPage } from '../../features/admin/ReportsPage';
import { AssistantPage } from '../../features/admin/AssistantPage';
import { PaymentLinks } from '../../features/admin/PaymentLinks';

const routes = [
  { path: 'orders', element: <OrderManagement /> },
  { path: 'payment-links', element: <PaymentLinks /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'assistant', element: <AssistantPage /> },
  { path: 'staff', element: <StaffPerformance /> },
  { path: 'menu', element: <MenuManagement /> },
  { path: 'modifiers', element: <ModifierManagement /> },
  { path: 'tables', element: <TableManagement /> },
  { path: 'profile', element: <AdminProfile /> },
  { path: 'users', element: <UserManagement /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'subscription', element: <SubscriptionManagement /> },
  { path: 'branding', element: <WhiteLabelSettings /> },
  { path: 'campaigns', element: <CampaignManagement /> },
  { path: 'loyalty', element: <LoyaltyManagement /> },
  { path: 'reservations', element: <ReservationManagement /> },
  { path: 'waitlist', element: <WaitlistManagement /> },
  { path: 'tax', element: <TaxManagement /> },
  { path: 'layout', element: <TableLayoutEditor /> },
  { path: 'gift-cards', element: <GiftCards /> },
  { path: 'time-tracking', element: <TimeTracking /> }
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
              <Route path="analytics" element={<Analytics />}>
                <Route index element={<AnalyticsDashboard />} />
                <Route path="sales" element={<SalesDashboard />} />
                <Route path="exports" element={<ScheduledExports />} />
              </Route>
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
