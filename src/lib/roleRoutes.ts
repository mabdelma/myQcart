// Single source of truth for where each role lands after login. Used by the
// consolidated SignIn page and by ProtectedRoute's wrong-role redirect.
export function homePathForRole(role?: string | null): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
    case 'manager':
      return '/admin';
    case 'kitchen':
    case 'waiter':
    case 'cashier':
      return '/staff';
    default:
      return '/';
  }
}
