import React from 'react'; // react v18.0.0
import { useNavigate, useLocation } from 'react-router-dom'; // react-router-dom v6.8.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Box, Typography } from '@mui/material'; // @mui/material v5.0.0
import { ErrorOutline } from '@mui/icons-material'; // @mui/icons-material v5.0.0
import PublicLayout from '../layouts/PublicLayout';
import { Button, Card } from '../components/Common';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Props interface for the ErrorPage component
 */
interface ErrorPageProps {
  error: unknown;
  title: string;
  message: string;
}

/**
 * Default title for the error page when not provided
 */
const DEFAULT_ERROR_TITLE = 'Something went wrong';

/**
 * Default message for the error page when not provided
 */
const DEFAULT_ERROR_MESSAGE =
  'We encountered an unexpected error. Please try again or contact support if the problem persists.';

/**
 * Flag to determine if application is running in development mode
 */
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Styled container for the error page content
 */
const ErrorContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme => theme.spacing(4),
  minHeight: 'calc(100vh - 200px)',
});

/**
 * Styled card for the error content
 */
const ErrorContent = styled(Card)({
  maxWidth: '600px',
  width: '100%',
  padding: theme => theme.spacing(4),
  textAlign: 'center',
  border: `1px solid ${theme => theme.palette.error.light}`,
});

/**
 * Styled icon for the error page
 */
const ErrorIcon = styled(ErrorOutline)({
  fontSize: 64,
  color: theme => theme.palette.error.main,
  marginBottom: theme => theme.spacing(2),
});

/**
 * Styled title for the error page
 */
const ErrorTitle = styled(Typography)({
  fontWeight: 'bold',
  fontSize: 24,
  marginBottom: theme => theme.spacing(2),
  color: theme => theme.palette.error.main,
});

/**
 * Styled message for the error page
 */
const ErrorMessage = styled(Typography)({
  color: theme => theme.palette.text.secondary,
  marginBottom: theme => theme.spacing(3),
});

/**
 * Styled container for the error details
 */
const ErrorDetails = styled(Box)({
  backgroundColor: theme => theme.palette.grey[100],
  padding: theme => theme.spacing(2),
  borderRadius: 4,
  marginBottom: theme => theme.spacing(3),
  textAlign: 'left',
  maxHeight: 200,
  overflowY: 'auto',
  fontFamily: 'monospace',
  fontSize: 12,
});

/**
 * Styled container for the action buttons
 */
const ActionContainer = styled(Box)({
  display: 'flex',
  gap: theme => theme.spacing(2),
  justifyContent: 'center',
  marginTop: theme => theme.spacing(2),
  flexWrap: 'wrap',
});

/**
 * Component that displays a user-friendly error page with details and recovery options
 */
const ErrorPage: React.FC<ErrorPageProps> = ({ error, title, message }) => {
  // Destructure error, title, and message from props
  // Use useNavigate hook to get navigation function
  const navigate = useNavigate();

  // Use useLocation hook to get current location
  const location = useLocation();

  /**
   * Function to navigate to the previous page
   */
  const handleGoBack = () => {
    navigate(-1);
  };

  /**
   * Function to navigate to the dashboard
   */
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Extract human-readable error message using getErrorMessage utility if error is provided
  const errorMessage = error ? getErrorMessage(error) : DEFAULT_ERROR_MESSAGE;

  return (
    <PublicLayout title={title || DEFAULT_ERROR_TITLE}>
      <ErrorContainer>
        <ErrorContent>
          <ErrorIcon />
          <ErrorTitle variant="h5">{title || DEFAULT_ERROR_TITLE}</ErrorTitle>
          <ErrorMessage variant="body1">{message || errorMessage}</ErrorMessage>
          {IS_DEVELOPMENT && error && (
            <ErrorDetails>
              <Typography component="pre">
                {error instanceof Error ? error.stack : String(error)}
              </Typography>
            </ErrorDetails>
          )}
          <ActionContainer>
            <Button variant="contained" color="primary" onClick={handleGoBack}>
              Go Back
            </Button>
            <Button variant="outlined" color="primary" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          </ActionContainer>
        </ErrorContent>
      </ErrorContainer>
    </PublicLayout>
  );
};

export default ErrorPage;