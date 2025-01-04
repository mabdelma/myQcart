import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { KitchenPortal } from '../kitchen/KitchenPortal';
import { WaiterPortal } from '../waiter/WaiterPortal';
import { CashierPanel } from './CashierPanel';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function StaffPortal() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (!state.user || !['kitchen', 'waiter', 'cashier'].includes(state.user.role)) {
    return <Navigate to="/staff/signin" state={{ from: location }} replace />;
  }

  return (
    <NotificationsProvider role={state.user.role}>
      {(() => {
        switch (state.user.role) {
          case 'kitchen':
            return <KitchenPortal />;
          case 'cashier':
            return (
              <div className="min-h-screen bg-gray-50">
                <CashierPanel />
              </div>
            );
          case 'waiter':
            return <WaiterPortal />;
          default:
            return <Navigate to="/staff/signin" replace />;
        }
      })()}
    </NotificationsProvider>
  );
}