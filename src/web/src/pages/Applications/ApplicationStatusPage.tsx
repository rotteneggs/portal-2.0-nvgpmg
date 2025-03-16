import React, { useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Alert } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@emotion/styled'; // @emotion/styled v11.10.6
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // @mui/icons-material v5.11.11
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // @mui/icons-material v5.11.11
import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationStatus from '../../components/Applications/ApplicationStatus';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import { Breadcrumbs } from '../../components/Common';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import { getApplication } from '../../api/applications';
import { Application } from '../../types/application';
import useFetch from '../../hooks/useFetch';

/**
 * Styled component for the page container
 */
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

/**
 * Styled component for the header container
 */
const HeaderContainer = styled(Box)`
  display: flex;
  justifyContent: space-between;
  alignItems: center;
  marginBottom: ${theme => theme.spacing(3)};
  flexDirection: row;

  @media (max-width: 600px) {
    flexDirection: column;
    alignItems: flex-start;
    gap: ${theme => theme.spacing(2)};
  }
`;

/**
 * Styled component for the back button
 */
const BackButton = styled(Button)`
  marginBottom: ${theme => theme.spacing(2)};
`;

/**
 * Styled component for the action container
 */
const ActionContainer = styled(Box)`
  display: flex;
  justifyContent: flex-end;
  gap: ${theme => theme.spacing(2)};
  marginTop: ${theme => theme.spacing(3)};
`;

/**
 * Styled component for the status container
 */
const StatusContainer = styled(Box)`
  marginTop: ${theme => theme.spacing(3)};
`;

/**
 * Page component that displays detailed status information for a specific application
 */
const ApplicationStatusPage: React.FC = () => {
  // Extract application ID from URL parameters using useParams hook from react-router-dom v6.8.1
  const { applicationId } = useParams<{ applicationId: string }>();

  // Use useNavigate hook for programmatic navigation from react-router-dom v6.8.1
  const navigate = useNavigate();

  // Use useFetch hook to fetch application data with loading and error states from src/web/src/hooks/useFetch.ts
  const { data: application, loading, error } = useFetch<Application>(
    ['application', applicationId],
    `/applications/${applicationId}`,
  );

  /**
   * Handles navigation back to the applications list
   */
  const handleBack = () => {
    navigate('/applications');
  };

  /**
   * Handles requests for additional information
   */
  const handleRequestInfo = () => {
    // Implement logic to request additional information
    alert('Request for additional information submitted!');
  };

  // Define breadcrumbs configuration for navigation
  const breadcrumbs = [
    { label: 'Applications', path: '/applications' },
    { label: 'Status', path: `/applications/${applicationId}/status` },
  ];

  return (
    <DashboardLayout title="Application Status" showBreadcrumbs>
      <PageContainer>
        <BackButton variant="outlined" color="primary" onClick={handleBack} startIcon={<ArrowBackIcon />}>
          Back to Applications
        </BackButton>

        {loading && <LoadingSkeleton variant="card" />}

        {error && (
          <Alert severity="error">
            Error: {error}
          </Alert>
        )}

        {application && (
          <StatusContainer>
            <HeaderContainer>
              <Typography variant="h4" component="h2">
                {application.application_type} - {application.academic_term} {application.academic_year}
              </Typography>
              <Button variant="outlined" color="primary" startIcon={<HelpOutlineIcon />}>
                Help
              </Button>
            </HeaderContainer>

            <ApplicationStatus application={application} />

            <ActionContainer>
              <Button variant="contained" color="primary" onClick={handleRequestInfo}>
                Request More Information
              </Button>
            </ActionContainer>
          </StatusContainer>
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default ApplicationStatusPage;