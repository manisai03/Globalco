import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { loginUrl } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to={loginUrl(`${location.pathname}${location.search}`)} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
