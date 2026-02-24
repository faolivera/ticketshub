import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional: require specific user level
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
  redirectTo = '/register' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useUser();
  const location = useLocation();

  // Show nothing while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check for required level if specified
  if (requiredLevel && user) {
    const levelOrder = ['Basic', 'Buyer', 'Seller', 'VerifiedSeller'];
    const userLevelIndex = levelOrder.indexOf(user.level);
    const requiredLevelIndex = levelOrder.indexOf(requiredLevel);

    if (userLevelIndex < requiredLevelIndex) {
      // Redirect to seller verification if they need to upgrade
      return <Navigate to="/seller-verification" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
