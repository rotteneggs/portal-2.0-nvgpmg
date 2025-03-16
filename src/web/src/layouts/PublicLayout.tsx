import React from 'react'; // react v18.2.0
import { React.PropsWithChildren } from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Box, Container, Typography, AppBar, Toolbar, Button, useMediaQuery } from '@mui/material'; // @mui/material v5.11.10
import { Link } from 'react-router-dom'; // react-router-dom v6.8.1
import Footer from '../components/AppShell'; // Footer component with links and copyright information
import { useThemeContext } from '../contexts/ThemeContext'; // Access current theme for styling

/**
 * Props interface for the PublicLayout component
 */
interface PublicLayoutProps {
  title?: string;
  hideNavigation?: boolean;
}

/**
 * Path to the institution logo image
 */
const INSTITUTION_LOGO = '/logo192.png';

/**
 * Navigation links for the public layout header
 */
const NAV_LINKS = [
  { text: 'Home', path: '/' },
  { text: 'About', path: '/about' },
  { text: 'Programs', path: '/programs' },
  { text: 'Apply', path: '/auth/register' },
  { text: 'Contact', path: '/contact' },
];

/**
 * Styled component for the main container of the public layout
 * Provides a flex layout and sets the minimum height and background color
 */
const PublicContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme => theme.background.default,
  justifyContent: 'space-between',
});

/**
 * Styled component for the main content area of the public layout
 * Provides flex grow, padding, and max-width for content centering
 */
const MainContent = styled(Container)({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  padding: theme => `${theme.spacing(4)} ${theme.spacing(2)}`,
  maxWidth: '1200px',
  '@media (max-width: 600px)': {
    padding: theme => `${theme.spacing(3)} ${theme.spacing(2)}`,
  },
});

/**
 * Styled component for the logo container in the AppBar
 * Provides flex layout and alignment for the logo and title
 */
const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
});

/**
 * Styled component for the logo image in the AppBar
 * Sets the height, width, and margin for the logo
 */
const Logo = styled('img')({
  height: '40px',
  width: 'auto',
  marginRight: theme => theme.spacing(2),
});

/**
 * Styled component for the AppBar in the public layout
 * Sets the background color, text color, and box shadow
 */
const StyledAppBar = styled(AppBar)({
  backgroundColor: theme => theme.background.paper,
  color: theme => theme.text.primary,
  boxShadow: theme => theme.shadows[1],
});

/**
 * Styled component for the navigation container in the AppBar
 * Provides flex layout and alignment for the navigation links
 */
const NavContainer = styled(Box)({
  display: 'flex',
  flexGrow: 1,
  justifyContent: 'flex-end',
  gap: theme => theme.spacing(2),
});

/**
 * Styled component for the page title in the main content area
 * Sets the margin, font weight, and color for the title
 */
const PageTitle = styled(Typography)({
  margin: theme => `${theme.spacing(4)} 0 ${theme.spacing(3)}`,
  fontWeight: 500,
  color: theme => theme.text.primary,
  '@media (max-width: 600px)': {
    margin: theme => `${theme.spacing(3)} 0 ${theme.spacing(2)}`,
  },
});

/**
 * Layout component for public-facing pages
 */
const PublicLayout: React.FC<React.PropsWithChildren<PublicLayoutProps>> = ({ children, title, hideNavigation }) => {
  // Destructure children and title from props
  // Get current theme and dark mode status using useThemeContext hook
  const { theme, isDarkMode } = useThemeContext();

  // Check if viewport is mobile using useMediaQuery
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <PublicContainer>
      {/* AppBar with logo and navigation links */}
      <StyledAppBar position="static">
        <Toolbar>
          <LogoContainer>
            <Link to="/">
              <Logo src={INSTITUTION_LOGO} alt="Institution Logo" />
            </Link>
            <Typography variant="h6" component="h1">
              Student Admissions
            </Typography>
          </LogoContainer>
          {!hideNavigation && (
            <NavContainer>
              {NAV_LINKS.map((link) => (
                <Button key={link.path} color="inherit" component={Link} to={link.path}>
                  {link.text}
                </Button>
              ))}
            </NavContainer>
          )}
        </Toolbar>
      </StyledAppBar>

      {/* Main content area with appropriate padding */}
      <MainContent>
        {title && <PageTitle variant="h4">{title}</PageTitle>}
        {children}
      </MainContent>

      {/* Footer component at the bottom of the layout */}
      <Footer />
    </PublicContainer>
  );
};

export default PublicLayout;