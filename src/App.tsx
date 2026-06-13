import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { StaffSignIn } from './components/auth/StaffSignIn';
import { StaffSignUp } from './components/auth/StaffSignUp';
import { AdminSignIn } from './components/auth/AdminSignIn';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StaffPortal } from './components/staff/StaffPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { CustomerMenuPage } from './features/menu/CustomerMenuPage';
import { RestaurantLanding } from './features/restaurant/RestaurantLanding';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/staff/signin" element={<StaffSignIn />} />
          <Route path="/staff/signup" element={<StaffSignUp />} />
          <Route path="/admin/signin" element={<AdminSignIn />} />
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
              <AdminPortal />
            </ProtectedRoute>
          } />
          <Route path="/staff/*" element={
            <ProtectedRoute allowedRoles={['kitchen', 'waiter', 'cashier']}>
              <StaffPortal />
            </ProtectedRoute>
          } />
          <Route path="/table/:tableId/*" element={<CustomerMenuPage />} />
          <Route path="/*" element={<RestaurantLanding />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
