import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Grid, Box, Typography, Divider, CircularProgress, Alert } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@emotion/styled'; // @emotion/styled v11.10.0
import ArrowBack from '@mui/icons-material/ArrowBack'; // @mui/icons-material v5.11.9

import DashboardLayout from '../../layouts/DashboardLayout';
import AidApplicationForm from '../../components/FinancialAid/AidApplicationForm';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import useNotification from '../../hooks/useNotification';
import FinancialAidService from '../../services/FinancialAidService';
import { FinancialAidApplication } from '../../types/financialAid';

/**
 * Styled component for the main page container.
 */
const PageContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  max-width: 1200px;
  margin: 0 auto;
`;

/**
 * Styled component for the page header containing the back button and title.
 */
const PageHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: ${theme => theme.spacing(3)};
`;

/**
 * Styled component for the back button.
 */
const BackButton = styled(Button)`
  margin-right: ${theme => theme.spacing(2)};
`;

/**
 * Styled component for the page title.
 */
const PageTitle = styled(Typography)`
  font-weight: 500;
`;

/**
 * Styled component for the content container.
 */
const ContentContainer = styled(Box)`
  margin-top: ${theme => theme.spacing(2)};
`;

/**
 * Main component for applying for financial aid.
 *
 * This page allows students to apply for financial aid by filling out a form
 * with their financial information and uploading required documents.
 *
 * @returns Rendered page component
 */
const ApplyForAidPage: React.FC = () => {
  // Get application ID from URL parameters using useParams
  const { applicationId } = useParams<{ applicationId: string }>();

  // Initialize state for loading, error, and existing application
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<FinancialAidApplication | null>(null);

  // Initialize notification hook for displaying messages
  const { displayError } = useNotification();

  // Initialize navigation function for redirecting after form submission
  const navigate = useNavigate();

  // Use useEffect to check if an application already exists for this application ID
  useEffect(() => {
    const fetchApplication = async () => {
      setLoading(true);
      setError(null);
      try {
        if (applicationId) {
          const parsedApplicationId = parseInt(applicationId, 10);
          const application = await FinancialAidService.fetchFinancialAidApplicationByApplicationId(parsedApplicationId);
          setExistingApplication(application);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load existing application.');
        displayError(e.message || 'Failed to load existing application.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, displayError]);

  // Define handleSubmit function to create a new financial aid application
  const handleSubmit = useCallback((application: FinancialAidApplication) => {
    navigate(`/applications/${applicationId}/financial-aid/status`);
  }, [navigate, applicationId]);

  // Define handleCancel function to navigate back to the financial aid page
  const handleCancel = useCallback(() => {
    navigate(`/applications/${applicationId}`);
  }, [navigate, applicationId]);

  // Render loading state if data is being fetched
  if (loading) {
    return (
      <DashboardLayout title="Apply for Financial Aid">
        <PageContainer>
          <LoadingSkeleton />
        </PageContainer>
      </DashboardLayout>
    );
  }

  // Render error state if there was an error fetching data
  if (error) {
    return (
      <DashboardLayout title="Apply for Financial Aid">
        <PageContainer>
          <Alert severity="error">{error}</Alert>
        </PageContainer>
      </DashboardLayout>
    );
  }

  // Render warning if an application already exists for this application ID
  if (existingApplication) {
    return (
      <DashboardLayout title="Apply for Financial Aid">
        <PageContainer>
          <Alert severity="warning">
            You have already submitted a financial aid application for this application.
            You can view the status of your application <Button onClick={() => navigate(`/applications/${applicationId}/financial-aid/status`)}>here</Button>.
          </Alert>
        </PageContainer>
      </DashboardLayout>
    );
  }

  // Render AidApplicationForm with appropriate props
  return (
    <DashboardLayout title="Apply for Financial Aid">
      <PageContainer>
        <PageHeader>
          <BackButton
            variant="outlined"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={handleCancel}
          >
            Back
          </BackButton>
          <PageTitle variant="h5" component="h1">
            Financial Aid Application
          </PageTitle>
        </PageHeader>
        <ContentContainer>
          <AidApplicationForm
            applicationId={parseInt(applicationId || '0', 10)}
            initialData={null}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </ContentContainer>
      </PageContainer>
    </DashboardLayout>
  );
};

export default ApplyForAidPage;