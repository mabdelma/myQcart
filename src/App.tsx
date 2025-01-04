import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { initDB } from './lib/db';
import { checkForExistingAdmin } from './lib/utils/adminCheck';
import { InitialAdminSetup } from './components/auth/InitialAdminSetup';
import { StaffSignIn } from './components/auth/StaffSignIn';
import { StaffSignUp } from './components/auth/StaffSignUp';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StaffPortal } from './components/staff/StaffPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { Menu } from './components/restaurant/Menu';
import { MenuItemDetail } from './components/restaurant/MenuItemDetail';
import { TableOrders } from './components/table/TableOrders';
import { Checkout } from './components/restaurant/Checkout';
import { TableMenu } from './components/table/TableMenu';
import { RestaurantWebsite } from './components/restaurant/RestaurantWebsite';

function App() {
  const [hasAdmin, setHasAdmin] = React.useState<boolean | null>(null);

  // Initialize DB when app starts
  React.useEffect(() => {
    const init = async () => {
      await initDB();
      const adminExists = await checkForExistingAdmin();
      setHasAdmin(adminExists);
    };
    init().catch(console.error);
  }, []);

  if (hasAdmin === null) {
    return <div>Loading...</div>;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {!hasAdmin && <Route path="/*" element={<InitialAdminSetup />} />}
          <Route path="/staff/signin" element={<StaffSignIn />} />
        <Route path="/staff/signup" element={<StaffSignUp />} />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPortal />
          </ProtectedRoute>
        } />
        <Route path="/staff/*" element={
          <ProtectedRoute allowedRoles={['kitchen', 'waiter', 'cashier']}>
            <StaffPortal />
          </ProtectedRoute>
        } />
        <Route path="/table/:tableId/*" element={<TableMenu />}>
          <Route index element={<Navigate to="menu" replace />} />
          <Route path="menu" element={<Menu />} />
          <Route path="menu/:itemId" element={<MenuItemDetail />} />
          <Route path="orders" element={<TableOrders />} />
          <Route path="checkout" element={<Checkout />} />
        </Route>
        <Route path="/*" element={<RestaurantWebsite />} />
      </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
