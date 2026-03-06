import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { VerificationHelper } from '@/lib/verification';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional: require seller capability (accepted terms + V1 + V2) or verified identity (V3)
   */
  requiredLevel?: 'Seller' | 'VerifiedSeller';
  /**
   * Optional: redirect path if not authenticated
   */
  redirectTo?: string;
}

/**
 * Route wrapper that requires authentication
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({
  children,
  requiredLevel,
  redirectTo = '/register',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredLevel && user) {
    const hasSeller = VerificationHelper.canSell(user);
    const hasVerifiedIdentity = VerificationHelper.hasV3(user);
    if (requiredLevel === 'Seller' && !hasSeller) {
      return <Navigate to="/seller-verification" replace />;
    }
    if (requiredLevel === 'VerifiedSeller' && !hasVerifiedIdentity) {
      return <Navigate to="/seller-verification" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
