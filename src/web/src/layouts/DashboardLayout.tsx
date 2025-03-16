import React, { React.PropsWithChildren, useEffect } from 'react'; // react v18.2.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import AppShell from '../components/AppShell';
import ErrorBoundary from '../components/Common';
import { useAuthContext } from '../contexts/AuthContext';

/**
 * Interface defining the props for the DashboardLayout component
 */
interface DashboardLayoutProps {
  title?: string;
  showBreadcrumbs?: boolean;
}

/**
 * Styled component for the content container of the dashboard layout
 */
const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
}));

/**
 * Layout component for authenticated user dashboard pages
 * Wraps the AppShell component with dashboard-specific configuration
 * and ensures proper authentication before rendering content.
 */
const DashboardLayout: React.FC<React.PropsWithChildren<DashboardLayoutProps>> = (props) => {
  // Destructure children and title from props
  const { children, title } = props;

  // Get authentication state and user data using useAuthContext hook
  const { isAuthenticated } = useAuthContext();

  // Get navigation functions from React Router
  const navigate = useNavigate();

  // Get current location from useLocation hook
  const location = useLocation();

  // Check if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login page if not authenticated
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, navigate, location]);

  // Determine page title based on current path or provided title
  const pageTitle = title || 'Student Admissions Enrollment Platform';

  // If not authenticated, render nothing
  if (!isAuthenticated) {
    return null;
  }

  // Render AppShell with appropriate title and dashboard-specific configuration
  return (
    <AppShell title={pageTitle}>
      {/* Wrap children in ErrorBoundary for error handling */}
      <ErrorBoundary>
        {/* Render children within content container */}
        <ContentContainer>
          {children}
        </ContentContainer>
      </ErrorBoundary>
    </AppShell>
  );
};

export default DashboardLayout;