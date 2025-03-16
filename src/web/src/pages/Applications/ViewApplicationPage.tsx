import React, { useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import {
  Box,
  Typography,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material'; // @mui/material v5.11.10
import { ArrowBack, UploadFile, Edit, InfoOutlined } from '@mui/icons-material'; // @mui/icons-material v5.11.9

import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationStatus from '../../components/Applications/ApplicationStatus';
import DocumentStatus from '../../components/Dashboard/DocumentStatus';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import Card from '../../components/Common/Card';
import useNotification from '../../hooks/useNotification';
import {
  fetchApplication as fetchApplicationAction,
  fetchRequiredDocuments as fetchRequiredDocumentsAction,
  fetchMissingDocuments as fetchMissingDocumentsAction,
  selectCurrentApplication,
  selectApplicationsLoading,
  selectApplicationsError,
  selectRequiredDocuments,
  selectMissingDocuments,
} from '../../redux/slices/applicationsSlice';
import { Application } from '../../types/application';
import { formatDate } from '../../utils/dateUtils';

/**
 * Main component for viewing application details
 */
const ViewApplicationPage: React.FC = () => {
  // Get application ID from URL parameters using useParams
  const { id } = useParams<{ id: string }>();

  // Initialize Redux dispatch and navigation functions
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Select application data, loading state, and error state from Redux store
  const application = useSelector(selectCurrentApplication);
  const loading = useSelector(selectApplicationsLoading);
  const error = useSelector(selectApplicationsError);

  // Select required and missing documents from Redux store
  const requiredDocuments = useSelector(selectRequiredDocuments);
  const missingDocuments = useSelector(selectMissingDocuments);

  // Initialize notification hook for displaying messages
  const { displaySuccess, displayError } = useNotification();

  /**
   * Define handleUploadClick function to navigate to document upload page
   */
  const handleUploadClick = useCallback(() => {
    navigate(`/applications/${id}/upload`);
  }, [navigate, id]);

  /**
   * Define handleEditClick function to navigate to application edit page
   */
  const handleEditClick = useCallback(() => {
    navigate(`/applications/${id}/edit`);
  }, [navigate, id]);

  /**
   * Define handleBackClick function to navigate back to applications list
   */
  const handleBackClick = useCallback(() => {
    navigate('/applications');
  }, [navigate]);

  /**
   * Define handleRequestInfo function to handle additional information requests
   */
  const handleRequestInfo = useCallback(() => {
    // Implement logic to request additional information
    displaySuccess('Additional information requested from admissions office.');
  }, [displaySuccess]);

  // Use useEffect to fetch application data when component mounts or ID changes
  useEffect(() => {
    if (id) {
      dispatch(fetchApplicationAction(Number(id)));
    }
  }, [dispatch, id]);

  // Use useEffect to fetch required and missing documents when application data is available
  useEffect(() => {
    if (application) {
      dispatch(fetchRequiredDocumentsAction(application.id));
      dispatch(fetchMissingDocumentsAction(application.id));
    }
  }, [dispatch, application]);

  // Render loading state if data is being fetched
  if (loading) {
    return (
      <DashboardLayout title="View Application">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Render error state if there was an error fetching data
  if (error) {
    return (
      <DashboardLayout title="View Application">
        <Alert severity="error">{error}</Alert>
      </DashboardLayout>
    );
  }

  // Render application not found message if no application data is available
  if (!application) {
    return (
      <DashboardLayout title="View Application">
        <Typography variant="h6">Application not found</Typography>
      </DashboardLayout>
    );
  }

  // Render application details with status, documents, and action buttons
  return (
    <DashboardLayout title="View Application">
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBackClick}>
          Back to Applications
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ApplicationStatus
            application={application}
            onRequestInfo={handleRequestInfo}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <DocumentStatus
            applicationId={application.id}
            applicationType={application.application_type}
            onUploadClick={handleUploadClick}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<Edit />} onClick={handleEditClick}>
          Edit Application
        </Button>
      </Box>
    </DashboardLayout>
  );
};

export default ViewApplicationPage;