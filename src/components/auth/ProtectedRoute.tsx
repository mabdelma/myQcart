import { Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { homePathForRole } from '../../lib/roleRoutes';

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
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes(state.user.role)) {
    return <Navigate to={homePathForRole(state.user.role)} replace />;
  }

  return <>{children}</>;
}