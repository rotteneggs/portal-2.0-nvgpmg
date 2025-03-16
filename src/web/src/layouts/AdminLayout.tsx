import React, { useEffect } from 'react'; // react v18.2.0
import { React.PropsWithChildren } from 'react'; // react v18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import AppShell from '../components/AppShell';
import ErrorBoundary from '../components/Common';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * @interface AdminLayoutProps
 * @description Props interface for the AdminLayout component.
 */
interface AdminLayoutProps {
  title?: string;
  showBreadcrumbs?: boolean;
}

/**
 * @const ContentContainer
 * @description A styled container for the main content area of the admin layout.
 */
const ContentContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

/**
 * @function AdminLayout
 * @description Layout component for admin pages that ensures proper authentication and authorization.
 * @param {React.PropsWithChildren<AdminLayoutProps>} props - The props object containing children and title.
 * @returns {JSX.Element} - Rendered admin layout with children.
 */
const AdminLayout: React.FC<React.PropsWithChildren<AdminLayoutProps>> = (props) => {
  // Destructure children and title from props
  const { children, title } = props;

  // Get authentication state and user role checking function using useAuthContext hook
  const { isAuthenticated, hasRole } = useAuthContext();

  // Get navigation functions from React Router
  const navigate = useNavigate();

  // Get current location from useLocation hook
  const location = useLocation();

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login page if not authenticated
      navigate('/login', { state: { from: location } });
    }
  }, [isAuthenticated, navigate, location]);

  // Check if user has admin role
  useEffect(() => {
    if (isAuthenticated && !hasRole('admin')) {
      // Redirect to dashboard if user doesn't have admin role
      navigate('/dashboard');
    }
  }, [isAuthenticated, hasRole, navigate]);

  // Determine page title based on current path or provided title
  const pageTitle = title || 'Admin Area';

  // Render AppShell with appropriate title and admin-specific configuration
  return (
    <AppShell title={pageTitle}>
      <ContentContainer>
        {/* Wrap children in ErrorBoundary for error handling */}
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </ContentContainer>
    </AppShell>
  );
};

export default AdminLayout;