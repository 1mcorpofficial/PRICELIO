import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore((state) => state.session.accessToken);
  const initDone = useAuthStore((state) => state.initDone);
  const location = useLocation();

  if (!initDone) {
    return <div className="page-shell">Loading...</div>;
  }

  if (!accessToken) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
}
