import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { MenuSkeleton } from './components/ui/MenuSkeleton';
import { CartSkeleton } from './components/ui/CartSkeleton';

const SignIn = lazy(() => import('./components/auth/SignIn'));
const StaffSignUp = lazy(() => import('./components/auth/StaffSignUp'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail'));
const StaffPortal = lazy(() => import('./components/staff/StaffPortal'));
const AdminPortal = lazy(() => import('./components/admin/AdminPortal'));
const SuperAdminPortal = lazy(() => import('./features/admin/SuperAdminPortal'));
const CustomerMenuPage = lazy(() => import('./features/menu/CustomerMenuPage'));
const RestaurantLanding = lazy(() => import('./features/restaurant/RestaurantLanding'));
const OnboardingWizard = lazy(() => import('./features/onboarding/OnboardingWizard'));
const MarketingLanding = lazy(() => import('./features/marketing/MarketingLanding'));
const PricingPage = lazy(() => import('./features/marketing/PricingPage'));
const FeaturesPage = lazy(() => import('./features/marketing/FeaturesPage'));
const ContactPage = lazy(() => import('./features/marketing/ContactPage'));
const DemoPage = lazy(() => import('./features/marketing/DemoPage'));
const TableFlowLayout = lazy(() => import('./features/restaurant/TableFlowLayout'));
const TableMenuPage = lazy(() => import('./features/restaurant/TableMenuPage'));
const TableMenuItemDetail = lazy(() => import('./features/restaurant/TableMenuItemDetail'));
const CartPage = lazy(() => import('./features/cart/CartPage'));
const OrdersPage = lazy(() => import('./features/orders/OrdersPage'));
const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage'));
const BillPage = lazy(() => import('./features/checkout/BillPage'));
const PaymentLinkPage = lazy(() => import('./features/payment-links/PaymentLinkPage'));

function RouteFallback() {
  const location = useLocation();
  const path = location.pathname;
  if (path.includes('/menu')) return <MenuSkeleton />;
  if (path.includes('/cart') || path.includes('/checkout')) return <CartSkeleton />;
  return <LoadingSpinner />;
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <I18nProvider>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* One consolidated login for every role; old paths redirect here. */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/staff/signin" element={<Navigate to="/signin" replace />} />
          <Route path="/admin/signin" element={<Navigate to="/signin" replace />} />
          <Route path="/staff/signup" element={<StaffSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </I18nProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
