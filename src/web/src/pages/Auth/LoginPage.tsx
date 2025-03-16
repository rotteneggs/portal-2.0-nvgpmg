import React, { useState, useEffect } from 'react'; // react v18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.0
import AuthLayout from '../../layouts/AuthLayout';
import LoginForm from '../../components/Auth/LoginForm';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * Login page component that renders the login form within the authentication layout
 * @returns Rendered login page component
 */
const LoginPage: React.FC = () => {
  // Initialize navigate function using useNavigate hook
  const navigate = useNavigate();

  // Initialize location object using useLocation hook
  const location = useLocation();

  // Get authentication context using useAuthContext hook
  const { isAuthenticated } = useAuthContext();

  /**
   * Extract redirect URL from location state or query parameters
   * @returns URL to redirect to after successful login
   */
  const getRedirectUrl = (): string => {
    // Check location state for redirectUrl
    if (location.state && location.state.redirectUrl) {
      return location.state.redirectUrl;
    }

    // If not found, parse query parameters for redirect
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    if (redirect) {
      return redirect;
    }

    // Return dashboard path as default if no redirect specified
    return '/dashboard';
  };

  // Extract redirectUrl from location state or query parameters
  const redirectUrl = getRedirectUrl();

  // Set up state for showMfaVerification
  const [showMfaVerification, setShowMfaVerification] = useState<boolean>(false);

  /**
   * Handle when MFA verification is required after login
   * @returns void No return value
   */
  const handleMfaRequired = (): void => {
    // Navigate to MFA verification page with email in state
    setShowMfaVerification(true);
  };

  // Check if user is already authenticated on mount and after auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      // Redirect to dashboard or specified redirect URL if already authenticated
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // Render AuthLayout with LoginForm component
  return (
    <AuthLayout title="Sign In">
      <LoginForm onMfaRequired={handleMfaRequired} redirectUrl={redirectUrl} />
    </AuthLayout>
  );
};

export default LoginPage;