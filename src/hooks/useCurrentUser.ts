import { useAuth } from '../contexts/AuthContext';

export function useCurrentUser() {
  const { state } = useAuth();
  
  if (!state.user) {
    throw new Error('User not authenticated');
  }
  
  return state.user;
}