# src/web/src/pages/Applications/EditApplicationPage.tsx
```typescript
import React, { useState, useEffect } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Alert } from '@mui/material'; // @mui/material v5.11.10

import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationForm from '../../components/Applications/ApplicationForm';
import { Breadcrumbs, LoadingSkeleton } from '../../components/Common';
import { getApplication } from '../../api/applications';
import { ApplicationData } from '../../types/application';

// Styled component for the page header
const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// Styled component for the error container
const ErrorContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

/**
 * Page component for editing an existing application
 */
const EditApplicationPage: React.FC = () => {
  // Extract application ID from URL parameters
  const { id } = useParams<{ id: string }>();
  const applicationId = id ? parseInt(id, 10) : null;

  // Initialize state variables
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get navigate function for programmatic navigation
  const navigate = useNavigate();

  // Breadcrumbs configuration
  const breadcrumbs = [
    { label: 'Applications', path: '/applications' },
    { label: 'Edit Application', path: '' },
  ];

  // Function to fetch application data
  const fetchApplicationData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch application data from API
      const response = await getApplication(applicationId);
      setApplication(response.application_data);
    } catch (err: any) {
      console.error('Error fetching application:', err);
      setError(err.message || 'Failed to fetch application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch application data when component mounts
  useEffect(() => {
    if (applicationId) {
      fetchApplicationData();
    } else {
      setError('Application ID is missing.');
      setLoading(false);
    }
  }, [applicationId]);

  // Function to handle successful submission
  const handleSubmitSuccess = (application: any) => {
    navigate(`/applications/${applicationId}/status`);
  };

  // Function to handle cancel action
  const handleCancel = () => {
    navigate('/applications');
  };

  return (
    <DashboardLayout title="Edit Application">
      <PageHeader>
        <Breadcrumbs items={breadcrumbs} />
        <Typography variant="h4">Edit Application</Typography>
      </PageHeader>

      {loading && (
        <LoadingSkeleton variant="rectangular" height={400} />
      )}

      {error && (
        <ErrorContainer>
          <Alert severity="error">{error}</Alert>
        </ErrorContainer>
      )}

      {application && (
        <ApplicationForm
          applicationId={applicationId}
          initialData={application}
          applicationType="undergraduate" // TODO: Get from application data
          academicTerm="fall" // TODO: Get from application data
          academicYear="2024" // TODO: Get from application data
          onSubmitSuccess={handleSubmitSuccess}
          onCancel={handleCancel}
        />
      )}
    </DashboardLayout>
  );
};

export default EditApplicationPage;