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

const SignIn = lazy(() => import('./components/auth/SignIn').then(m => ({ default: m.SignIn })));
const StaffSignUp = lazy(() => import('./components/auth/StaffSignUp').then(m => ({ default: m.StaffSignUp })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import('./components/auth/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const StaffPortal = lazy(() => import('./components/staff/StaffPortal').then(m => ({ default: m.StaffPortal })));
const AdminPortal = lazy(() => import('./components/admin/AdminPortal').then(m => ({ default: m.AdminPortal })));
const SuperAdminPortal = lazy(() => import('./features/admin/SuperAdminPortal').then(m => ({ default: m.SuperAdminPortal })));
const CustomerMenuPage = lazy(() => import('./features/menu/CustomerMenuPage').then(m => ({ default: m.CustomerMenuPage })));
const RestaurantLanding = lazy(() => import('./features/restaurant/RestaurantLanding').then(m => ({ default: m.RestaurantLanding })));
const OnboardingWizard = lazy(() => import('./features/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const MarketingLanding = lazy(() => import('./features/marketing/MarketingLanding').then(m => ({ default: m.MarketingLanding })));
const PricingPage = lazy(() => import('./features/marketing/PricingPage').then(m => ({ default: m.PricingPage })));
const FeaturesPage = lazy(() => import('./features/marketing/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const ContactPage = lazy(() => import('./features/marketing/ContactPage').then(m => ({ default: m.ContactPage })));
const DemoPage = lazy(() => import('./features/marketing/DemoPage').then(m => ({ default: m.DemoPage })));
const TableFlowLayout = lazy(() => import('./features/restaurant/TableFlowLayout').then(m => ({ default: m.TableFlowLayout })));
const TableMenuPage = lazy(() => import('./features/restaurant/TableMenuPage').then(m => ({ default: m.TableMenuPage })));
const TableMenuItemDetail = lazy(() => import('./features/restaurant/TableMenuItemDetail').then(m => ({ default: m.TableMenuItemDetail })));
const CartPage = lazy(() => import('./features/cart/CartPage').then(m => ({ default: m.CartPage })));
const OrdersPage = lazy(() => import('./features/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const BillPage = lazy(() => import('./features/checkout/BillPage').then(m => ({ default: m.BillPage })));
const PaymentReturn = lazy(() => import('./features/checkout/PaymentReturn').then(m => ({ default: m.PaymentReturn })));
const PaymentLinkPage = lazy(() => import('./features/payment-links/PaymentLinkPage').then(m => ({ default: m.PaymentLinkPage })));
const OrderTracking = lazy(() => import('./features/orders/OrderTracking').then(m => ({ default: m.OrderTracking })));

function RouteFallback() {
  const location = useLocation();
  const path = location.pathname;
  if (path.includes('/menu')) return <MenuSkeleton />;
  if (path.includes('/cart') || path.includes('/checkout')) return <CartSkeleton />;
  return <LoadingSpinner />;
}

// Subdomain landing map — each Qlisted subdomain serves this same SPA and the
// root path lands on its purpose-built route. Deep links work on every host
// since this only affects "/". (auth-gated routes bounce to /signin as usual.)
const HOST_LANDING: Record<string, string> = {
  login: '/signin',         // login.qlisted.com
  central: '/super-admin',  // central.qlisted.com — platform console
  app: '/admin',            // app.qlisted.com — restaurant dashboard
  ai: '/admin/assistant',   // ai.qlisted.com — AI copilot
};

function RootRoute() {
  const sub = window.location.hostname.split('.')[0];
  const target = HOST_LANDING[sub];
  return target ? <Navigate to={target} replace /> : <MarketingLanding />;
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
          <Route path="/payment/return" element={<RouteErrorBoundary name="payment-return"><PaymentReturn /></RouteErrorBoundary>} />
          <Route path="/" element={<RootRoute />} />
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

          {/* Customer-facing order tracking */}
          <Route path="/r/:slug/orders/:orderId/track" element={
            <RouteErrorBoundary name="order-tracking"><OrderTracking /></RouteErrorBoundary>
          } />

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
