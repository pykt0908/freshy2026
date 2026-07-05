import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'judge';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-lg">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && appUser.role !== requiredRole) {
    if (appUser.role === 'judge') {
      return <Navigate to="/judge" replace />;
    }
    if (appUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
