import React, { useEffect } from 'react'; // react v18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.0
import AuthLayout from '../../layouts/AuthLayout';
import ResetPasswordForm from '../../components/Auth/ResetPasswordForm';
import useNotification from '../../hooks/useNotification';
import { Helmet } from 'react-helmet-async'; // react-helmet-async v1.3.0

/**
 * Main component for the password reset page
 * @returns Rendered password reset page component
 */
const ResetPasswordPage: React.FC = () => {
  // Initialize navigate function using useNavigate hook
  const navigate = useNavigate();

  // Initialize location using useLocation hook to access URL query parameters
  const location = useLocation();

  // Initialize showNotification function using useNotification hook
  const showNotification = useNotification();

  // Extract token from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  // Check if token exists in URL parameters
  useEffect(() => {
    if (!token) {
      // If token is missing, show error notification and redirect to forgot password page
      showNotification.error('Invalid or missing reset token. Please request a new password reset link.');
      navigate('/forgot-password');
    }
  }, [token, navigate, showNotification]);

  // Define handleLoginClick function to navigate to login page
  const handleLoginClick = () => {
    navigate('/login');
  };

  // Render AuthLayout with appropriate title
  return (
    <AuthLayout title="Reset Password">
      {/* Set document title and meta description using Helmet */}
      <Helmet>
        <title>Reset Password - Student Admissions Enrollment Platform</title>
        <meta name="description" content="Reset your password for the Student Admissions Enrollment Platform." />
      </Helmet>
      {/* Render ResetPasswordForm component with token and handleLoginClick props */}
      <ResetPasswordForm token={token} onLoginClick={handleLoginClick} />
    </AuthLayout>
  );
};

export default ResetPasswordPage;