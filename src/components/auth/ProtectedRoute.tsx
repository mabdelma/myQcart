import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'kitchen' | 'waiter' | 'admin'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { state } = useAuth();

  if (state.loading) {
    return <div>Loading...</div>;
  }

  if (!state.user || !allowedRoles.includes(state.user.role as any)) {
    // Redirect to appropriate sign in page based on roles
    const redirectPath = allowedRoles.includes('admin') ? '/admin/signin' : '/staff/signin';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}