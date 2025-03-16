import React, { useState, useEffect } from 'react'; // react v18.2.0
import { React.PropsWithChildren } from 'react'; // react v18.2.0
import { Box, CssBaseline, useMediaQuery } from '@mui/material'; // @mui/material v5.11.10
import { useTheme, styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10

import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import MobileNavigation from './MobileNavigation';
import { useAuthContext } from '../../contexts/AuthContext';
import { colors, spacing, transitions } from '../../styles/variables';

/**
 * Interface defining the props for the AppShell component
 */
interface AppShellProps {
  title: string;
  hideFooter?: boolean;
  hideSidebar?: boolean;
}

/**
 * Constant defining the width of the expanded sidebar drawer in pixels
 */
const DRAWER_WIDTH = 240;

/**
 * Constant defining the width of the collapsed sidebar drawer in pixels
 */
const DRAWER_COLLAPSED_WIDTH = 64;

/**
 * Styled component for the main container of the application
 * Provides a flex layout and sets the minimum height and background color
 */
const MainContainer = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: colors.neutralLight,
});

/**
 * Styled component for the content wrapper of the application
 * Provides dynamic margin based on the sidebar state and responsive padding
 */
const ContentWrapper = styled(Box)(({ theme }) => ({
  marginLeft: `${DRAWER_COLLAPSED_WIDTH}px`,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.up('md')]: {
    padding: spacing.md,
  },
  [theme.breakpoints.down('md')]: {
    padding: spacing.sm,
    marginLeft: 0,
  },
}));

/**
 * Styled component for the main content area of the application
 * Provides flex grow, padding, and max-width for content centering
 */
const MainContent = styled(Box)({
  flexGrow: 1,
  padding: spacing.md,
  maxWidth: '1200px',
  margin: '0 auto',
});

/**
 * Main application shell component that provides a consistent layout structure
 * Integrates header, sidebar, footer, and mobile navigation components
 */
const AppShell: React.FC<React.PropsWithChildren<AppShellProps>> = ({ children, title, hideFooter, hideSidebar }) => {
  // Destructure children and title from props
  // Get authentication state using useAuthContext hook
  const { isAuthenticated } = useAuthContext();

  // Initialize state for sidebar open/closed status
  const [open, setOpen] = useState(false);

  // Get current theme using useTheme hook
  const theme = useTheme();

  // Check if viewport is mobile using useMediaQuery
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  /**
   * Handles sidebar toggle function
   */
  const handleSidebarToggle = () => {
    setOpen(!open);
  };

  /**
   * Set initial sidebar state based on screen size
   */
  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isMobile]);

  /**
   * Update sidebar state when screen size changes
   */
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* CssBaseline for normalizing CSS styles */}
      <CssBaseline />

      {/* Header component with title and sidebar toggle function */}
      <Header title={title} onSidebarToggle={handleSidebarToggle} showSidebarToggle={!hideSidebar} />

      {/* Sidebar component with open state and toggle function */}
      {!hideSidebar && (
        <Sidebar open={open} onToggle={handleSidebarToggle} />
      )}

      {/* Main content area with appropriate margin based on sidebar state */}
      <ContentWrapper>
        <MainContent>
          {children}
        </MainContent>
        {!hideFooter && <Footer />}
      </ContentWrapper>

      {/* Conditionally render MobileNavigation component on mobile devices */}
      {isAuthenticated && isMobile && <MobileNavigation />}
    </Box>
  );
};

export default AppShell;