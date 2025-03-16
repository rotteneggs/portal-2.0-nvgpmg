import React from 'react'; // react v18.0.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Box, Typography } from '@mui/material'; // @mui/material v5.0.0
import { SentimentDissatisfied } from '@mui/icons-material'; // @mui/icons-material v5.0.0

import PublicLayout from '../layouts/PublicLayout'; // Layout component for the not found page
import Button from '../components/Common'; // Button component for navigation actions

// Constants for the not found page
const NOT_FOUND_TITLE = 'Page Not Found'; // Title for the not found page
const NOT_FOUND_MESSAGE =
  "The page you are looking for doesn't exist or has been moved. Please check the URL or navigate back to a known page."; // Message for the not found page

// Styled components using emotion's styled API
const NotFoundContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme => theme.spacing(4),
  minHeight: 'calc(100vh - 200px)',
});

const NotFoundContent = styled(Box)({
  maxWidth: '600px',
  width: '100%',
  padding: theme => theme.spacing(4),
  textAlign: 'center',
  borderRadius: theme => theme.shape.borderRadius + 'px',
  backgroundColor: theme => theme.palette.background.paper,
  boxShadow: theme => theme.shadows[1],
});

const NotFoundIcon = styled(SentimentDissatisfied)({
  fontSize: '64px',
  color: theme => theme.palette.text.secondary,
  marginBottom: theme => theme.spacing(2),
});

const NotFoundTitle = styled(Typography)({
  fontWeight: 'bold',
  fontSize: '24px',
  marginBottom: theme => theme.spacing(2),
  color: theme => theme.palette.text.primary,
});

const NotFoundMessage = styled(Typography)({
  color: theme => theme.palette.text.secondary,
  marginBottom: theme => theme.spacing(3),
});

const ActionContainer = styled(Box)({
  display: 'flex',
  gap: theme => theme.spacing(2),
  justifyContent: 'center',
  marginTop: theme => theme.spacing(2),
  flexWrap: 'wrap',
});

/**
 * Component that displays a user-friendly 404 not found page with navigation options
 * @returns Rendered not found page component
 */
const NotFoundPage: React.FC = () => {
  // Use useNavigate hook to get navigation function
  const navigate = useNavigate();

  // Define handleGoBack function to navigate to previous page
  const handleGoBack = () => {
    navigate(-1);
  };

  // Define handleGoHome function to navigate to home/dashboard
  const handleGoHome = () => {
    navigate('/');
  };

  // Render PublicLayout with not found content
  return (
    <PublicLayout title="Not Found">
      <NotFoundContainer>
        <NotFoundContent>
          {/* Display not found icon, title, and message */}
          <NotFoundIcon />
          <NotFoundTitle variant="h5" component="h2">
            {NOT_FOUND_TITLE}
          </NotFoundTitle>
          <NotFoundMessage variant="body1">
            {NOT_FOUND_MESSAGE}
          </NotFoundMessage>

          {/* Render action buttons for navigation options */}
          <ActionContainer>
            <Button variant="contained" color="primary" onClick={handleGoBack}>
              Go Back
            </Button>
            <Button variant="outlined" color="primary" onClick={handleGoHome}>
              Go Home
            </Button>
          </ActionContainer>
        </NotFoundContent>
      </NotFoundContainer>
    </PublicLayout>
  );
};

export default NotFoundPage;