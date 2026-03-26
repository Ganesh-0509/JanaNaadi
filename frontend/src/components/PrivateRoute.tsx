import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function PrivateRoute({ children, requireAdmin }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#6B5E57]">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400 text-lg">Admin access required</div>
      </div>
    );
  }

  return <>{children}</>;
}
