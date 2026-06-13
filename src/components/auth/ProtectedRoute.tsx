import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { state } = useAuth();

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (!state.user) {
    return <Navigate to="/staff/signin" replace />;
  }

  if (!allowedRoles.includes(state.user.role)) {
    return <Navigate to={state.user.role === 'admin' ? '/admin' : '/staff'} replace />;
  }

  return <>{children}</>;
}