import React from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Box, Container, Typography, useMediaQuery } from '@mui/material'; // @mui/material v5.11.10
import Footer from '../components/AppShell'; // Footer component with links and copyright information
import Card from '../components/Common'; // Card component to contain authentication forms
import { useThemeContext } from '../contexts/ThemeContext'; // Access current theme for styling

/**
 * Props interface for the AuthLayout component
 */
interface AuthLayoutProps {
  title?: string;
}

// Path to the institution logo image
const INSTITUTION_LOGO = '/logo192.png';

// Support email address for authentication help
const SUPPORT_EMAIL = 'support@institution.edu';

// Styled components using CSS-in-JS
const AuthContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${theme => theme.background.default};
  justify-content: space-between;
`;

const MainContent = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  padding: ${theme => theme.spacing(3)};
  max-width: 500px;
  @media (max-width: 600px) {
    padding: ${theme => theme.spacing(2)};
  }
`;

const LogoContainer = styled(Box)`
  text-align: center;
  margin-bottom: ${theme => theme.spacing(4)};
  @media (max-width: 600px) {
    margin-bottom: ${theme => theme.spacing(3)};
  }
`;

const Logo = styled('img')`
  height: 80px;
  width: auto;
  @media (max-width: 600px) {
    height: 60px;
  }
`;

const Title = styled(Typography)`
  margin-bottom: ${theme => theme.spacing(3)};
  text-align: center;
  color: ${theme => theme.text.primary};
  font-weight: 500;
`;

const SupportText = styled(Typography)`
  margin-top: ${theme => theme.spacing(3)};
  text-align: center;
  color: ${theme => theme.text.secondary};
  font-size: 0.875rem;
`;

const CardWrapper = styled(Box)`
  width: 100%;
  margin-bottom: ${theme => theme.spacing(3)};
`;

/**
 * Layout component for authentication-related pages
 * @param props - React.PropsWithChildren<AuthLayoutProps>
 * @returns Rendered authentication layout with children
 */
const AuthLayout: React.FC<React.PropsWithChildren<AuthLayoutProps>> = (props) => {
  // Destructure children and title from props
  const { children, title } = props;

  // Get current theme and dark mode status using useThemeContext hook
  const { theme } = useThemeContext();

  // Check if viewport is mobile using useMediaQuery
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Render a responsive container with institutional branding
  return (
    <AuthContainer>
      <MainContent>
        {/* Display institution logo at the top */}
        <LogoContainer>
          <Logo src={INSTITUTION_LOGO} alt="Institution Logo" />
        </LogoContainer>

        {/* Render page title if provided */}
        {title && <Title variant="h5" component="h1">{title}</Title>}

        {/* Render Card component containing the children (authentication forms) */}
        <CardWrapper>
          <Card>
            {children}
          </Card>
        </CardWrapper>

        {/* Display support information text */}
        <SupportText variant="body2">
          Need help? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </SupportText>
      </MainContent>

      {/* Render Footer component at the bottom of the layout */}
      <Footer hideSidebar={true} hideFooter={isMobile} />
    </AuthContainer>
  );
};

export default AuthLayout;