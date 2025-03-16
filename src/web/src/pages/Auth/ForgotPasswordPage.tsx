import React from 'react'; // react v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import { Helmet } from 'react-helmet-async'; // react-helmet-async v1.3.0
import AuthLayout from '../../layouts/AuthLayout';
import ForgotPasswordForm from '../../components/Auth/ForgotPasswordForm';

/**
 * Main component for the forgot password page
 * @returns Rendered forgot password page component
 */
const ForgotPasswordPage: React.FC = () => {
  // Initialize navigate function using useNavigate hook
  const navigate = useNavigate();

  /**
   * Define handleLoginClick function to navigate to login page
   */
  const handleLoginClick = () => {
    navigate('/login');
  };

  // Render AuthLayout with appropriate title
  return (
    <AuthLayout title="Forgot Password">
      {/* Set document title and meta description using Helmet */}
      <Helmet>
        <title>Forgot Password - Student Admissions</title>
        <meta name="description" content="Request a password reset for your Student Admissions account." />
      </Helmet>

      {/* Render ForgotPasswordForm component with handleLoginClick prop */}
      <ForgotPasswordForm onLoginClick={handleLoginClick} />
    </AuthLayout>
  );
};

export default ForgotPasswordPage;