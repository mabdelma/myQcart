import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { SignIn } from './components/auth/SignIn';
import { StaffSignUp } from './components/auth/StaffSignUp';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StaffPortal } from './components/staff/StaffPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { SuperAdminPortal } from './features/admin/SuperAdminPortal';
import { CustomerMenuPage } from './features/menu/CustomerMenuPage';
import { RestaurantLanding } from './features/restaurant/RestaurantLanding';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { MarketingLanding } from './features/marketing/MarketingLanding';
import { PricingPage } from './features/marketing/PricingPage';
import { FeaturesPage } from './features/marketing/FeaturesPage';
import { ContactPage } from './features/marketing/ContactPage';
import { DemoPage } from './features/marketing/DemoPage';
import { TableFlowLayout } from './features/restaurant/TableFlowLayout';
import { TableMenuPage } from './features/restaurant/TableMenuPage';
import { TableMenuItemDetail } from './features/restaurant/TableMenuItemDetail';
import { CartPage } from './features/cart/CartPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { BillPage } from './features/checkout/BillPage';
import { PaymentLinkPage } from './features/payment-links/PaymentLinkPage';

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* One consolidated login for every role; old paths redirect here. */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/staff/signin" element={<Navigate to="/signin" replace />} />
          <Route path="/admin/signin" element={<Navigate to="/signin" replace />} />
          <Route path="/staff/signup" element={<StaffSignUp />} />
          <Route path="/onboarding" element={<RouteErrorBoundary name="onboarding"><OnboardingWizard /></RouteErrorBoundary>} />
          <Route path="/super-admin/*" element={
            <RouteErrorBoundary name="super-admin">
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminPortal />
            </ProtectedRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/admin/*" element={
            <RouteErrorBoundary name="admin">
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <AdminPortal />
            </ProtectedRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/staff/*" element={
            <RouteErrorBoundary name="staff">
            <ProtectedRoute allowedRoles={['kitchen', 'waiter', 'cashier']}>
              <StaffPortal />
            </ProtectedRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/" element={<MarketingLanding />} />
          <Route path="/pricing" element={<RouteErrorBoundary name="pricing"><PricingPage /></RouteErrorBoundary>} />
          <Route path="/features" element={<RouteErrorBoundary name="features"><FeaturesPage /></RouteErrorBoundary>} />
          <Route path="/contact" element={<RouteErrorBoundary name="contact"><ContactPage /></RouteErrorBoundary>} />
          <Route path="/demo" element={<RouteErrorBoundary name="demo"><DemoPage /></RouteErrorBoundary>} />

          {/* Table QR / Customer ordering flow — structured restaurant routes */}
          <Route path="/r/:slug/table/:tableId" element={
            <RouteErrorBoundary name="table-flow">
            <TableFlowLayout />
            </RouteErrorBoundary>
          }>
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="menu" element={<TableMenuPage />} />
            <Route path="menu/:itemId" element={<TableMenuItemDetail />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="bill" element={<BillPage />} />
          </Route>

          {/* Legacy QR token-based route (single-page tabbed flow) */}
          <Route path="/table/:tableId/*" element={<RouteErrorBoundary name="customer-menu"><CustomerMenuPage /></RouteErrorBoundary>} />

          {/* Public restaurant landing page */}
          <Route path="/r/:slug" element={<RouteErrorBoundary name="restaurant"><RestaurantLanding /></RouteErrorBoundary>} />
          <Route path="/:slug" element={<RouteErrorBoundary name="restaurant"><RestaurantLanding /></RouteErrorBoundary>} />

          {/* Payment link (customer-facing, no auth required) */}
          <Route path="/pay/:token" element={
            <RouteErrorBoundary name="payment-link"><PaymentLinkPage /></RouteErrorBoundary>
          } />

          <Route path="*" element={<RestaurantLanding />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
