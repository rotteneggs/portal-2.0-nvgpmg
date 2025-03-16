import React, { useEffect } from 'react'; // react v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import AuthLayout from '../../layouts/AuthLayout'; // AuthLayout component that provides consistent structure for authentication pages
import RegisterForm from '../../components/Auth/RegisterForm'; // RegisterForm component that handles user registration
import { useAuthContext } from '../../contexts/AuthContext'; // Hook to access authentication context

/**
 * Registration page component that provides a user interface for new users to create an account
 * @returns Rendered registration page
 */
const RegisterPage: React.FC = () => {
  // Initialize navigate function from useNavigate hook
  const navigate = useNavigate();

  // Get isAuthenticated state from useAuthContext hook
  const { isAuthenticated } = useAuthContext();

  // Use useEffect to redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  /**
   * Function to handle successful registration and navigate to the dashboard
   */
  const handleRegistrationSuccess = () => {
    navigate('/dashboard');
  };

  // Render AuthLayout with "Create Your Account" title
  return (
    <AuthLayout title="Create Your Account">
      {/* Render RegisterForm component with onSuccess callback and dashboard redirect URL */}
      <RegisterForm onSuccess={handleRegistrationSuccess} redirectUrl="/login" />
    </AuthLayout>
  );
};

export default RegisterPage;