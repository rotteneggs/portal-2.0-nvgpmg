import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10

import AdminLayout from '../../layouts/AdminLayout';
import ApplicationReview from '../../components/Admin/ApplicationReview';
import { LoadingSkeleton, ErrorBoundary } from '../../components/Common';
import { getApplicationForReview } from '../../api/admin';
import { useNotification } from '../../hooks/useNotification';

/**
 * Styled component for the container of the ApplicationReviewPage
 */
const Container = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

/**
 * Styled component for the loading container
 */
const LoadingContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
`;

/**
 * Styled component for the error container
 */
const ErrorContainer = styled(Box)`
  margin: ${theme => theme.spacing(3)} 0;
`;

/**
 * Page component for reviewing and managing student applications
 * This page allows admissions staff to view application details, verify documents,
 * add notes, update application status, and make admissions decisions.
 */
const ApplicationReviewPage: React.FC = () => {
  // Extract application ID from URL parameters using useParams hook
  const { applicationId } = useParams<{ applicationId: string }>();

  // Initialize state for application data, loading state, and error state
  const [application, setApplication] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize notification hook for displaying success/error messages
  const { displaySuccess, displayError } = useNotification();

  // Initialize navigation function for redirecting after actions
  const navigate = useNavigate();

  /**
   * Fetch application data from the API
   */
  const fetchApplication = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch application data using the getApplicationForReview API function
      const appData = await getApplicationForReview(Number(applicationId));
      setApplication(appData);
    } catch (e: any) {
      // Handle error state if application data fetch fails
      setError(e.message || 'Failed to fetch application');
    } finally {
      // Set loading state to false after data fetch completes (success or failure)
      setIsLoading(false);
    }
  }, [applicationId]);

  /**
   * Implement status change callback function
   */
  const handleStatusChange = useCallback(() => {
    // Refresh application data after status change
    fetchApplication();
    displaySuccess('Application status updated successfully!');
  }, [fetchApplication, displaySuccess]);

  // Fetch application data when component mounts or applicationId changes
  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    } else {
      // Handle case where application ID is not provided
      setError('Application ID is missing.');
      setIsLoading(false);
    }
  }, [applicationId, fetchApplication]);

  return (
    <AdminLayout title="Application Review">
      <Container>
        {/* Render loading skeleton while data is being fetched */}
        {isLoading && (
          <LoadingContainer>
            <LoadingSkeleton variant="rectangular" width={800} height={600} />
            <Typography variant="body1">Loading application...</Typography>
          </LoadingContainer>
        )}

        {/* Render error message if data fetch fails */}
        {error && (
          <ErrorContainer>
            <Alert severity="error">
              <Typography variant="body1">Error: {error}</Typography>
            </Alert>
          </ErrorContainer>
        )}

        {/* Render ApplicationReview component with application data and callbacks */}
        {application && (
          <ErrorBoundary>
            <ApplicationReview
              applicationId={applicationId!}
              onStatusChange={handleStatusChange}
            />
          </ErrorBoundary>
        )}
      </Container>
    </AdminLayout>
  );
};

export default ApplicationReviewPage;