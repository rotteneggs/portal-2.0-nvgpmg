import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Divider, Alert, Tabs, Tab } from '@mui/material'; // @mui/material v5.11.10
import { Add, Upload } from '@mui/icons-material'; // @mui/icons-material v5.11.9
import { styled } from '@emotion/styled'; // CSS-in-JS styling solution v11.10.6

import DashboardLayout from '../../layouts/DashboardLayout';
import AidApplicationList from '../../components/FinancialAid/AidApplicationList';
import AidDocumentUpload from '../../components/FinancialAid/AidDocumentUpload';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import EmptyState from '../../components/Common/EmptyState';
import Modal from '../../components/Common/Modal';
import useNotification from '../../hooks/useNotification';
import { useDispatch, useSelector } from '../../redux/store';
import {
  selectFinancialAidApplications,
  selectFinancialAidLoading,
  selectFinancialAidError,
  fetchFinancialAidApplications,
  deleteFinancialAidApplication
} from '../../redux/slices/financialAidSlice';
import { selectApplications, fetchApplications } from '../../redux/slices/applicationsSlice';
import { FinancialAidApplication } from '../../types/financialAid';

// Styled components for consistent styling
const PageContainer = styled(Box)`
  padding: ${theme => theme.spacing(3)};
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled(Box)`
  display: flex;
  justifyContent: space-between;
  alignItems: center;
  marginBottom: ${theme => theme.spacing(3)};
`;

const HeaderTitle = styled(Typography)`
  fontWeight: 500;
`;

const ActionButton = styled(Button)`
  marginLeft: ${theme => theme.spacing(1)};
`;

const TabContainer = styled(Box)`
  marginBottom: ${theme => theme.spacing(3)};
`;

const ContentContainer = styled(Box)`
  marginTop: ${theme => theme.spacing(2)};
`;

const ErrorContainer = styled(Box)`
  marginTop: ${theme => theme.spacing(2)};
`;

/**
 * Main component for the Financial Aid page
 */
const FinancialAidPage: React.FC = () => {
  // Component state
  const [activeTab, setActiveTab] = useState<number>(0); // 0 for Applications, 1 for Documents
  const [documentUploadOpen, setDocumentUploadOpen] = useState<boolean>(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

  // React Router navigation hook
  const navigate = useNavigate();

  // Notification hook for displaying success/error messages
  const notification = useNotification();

  // Redux dispatch hook
  const dispatch = useDispatch();

  // Select financial aid applications, loading state, and error from Redux store
  const financialAidApplications = useSelector(selectFinancialAidApplications);
  const financialAidLoading = useSelector(selectFinancialAidLoading);
  const financialAidError = useSelector(selectFinancialAidError);

  // Select main applications from Redux store
  const mainApplications = useSelector(selectApplications);

  // Fetch financial aid applications and main applications on component mount
  useEffect(() => {
    dispatch(fetchFinancialAidApplications());
    dispatch(fetchApplications());
  }, [dispatch]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle create application button click
  const handleCreateApplication = () => {
    navigate('/financial-aid/create');
  };

  // Handle edit application button click
  const handleEditApplication = (application: FinancialAidApplication) => {
    navigate(`/financial-aid/${application.id}/edit`);
  };

  // Handle view application button click
  const handleViewApplication = (application: FinancialAidApplication) => {
    navigate(`/financial-aid/${application.id}/view`);
  };

  // Handle delete application button click
  const handleDeleteApplication = (id: number) => {
    dispatch(deleteFinancialAidApplication(id))
      .then(() => {
        notification.success('Financial aid application deleted successfully');
      })
      .catch((error: any) => {
        notification.error(error.message || 'Failed to delete financial aid application');
      });
  };

  // Handle open document upload modal
  const handleOpenDocumentUpload = (applicationId: number) => {
    setSelectedApplicationId(applicationId);
    setDocumentUploadOpen(true);
  };

  // Handle close document upload modal
  const handleCloseDocumentUpload = () => {
    setDocumentUploadOpen(false);
    setSelectedApplicationId(null);
  };

  // Handle successful document upload
  const handleDocumentUploadSuccess = () => {
    notification.success('Document uploaded successfully');
    handleCloseDocumentUpload();
    dispatch(fetchFinancialAidApplications()); // Refresh applications list
  };

  // Handle document upload error
  const handleDocumentUploadError = (error: any) => {
    notification.error(error.message || 'Failed to upload document');
  };

  return (
    <DashboardLayout title="Financial Aid">
      <PageContainer>
        <PageHeader>
          <HeaderTitle variant="h5" component="h2">
            Financial Aid Applications
          </HeaderTitle>
          <Box>
            <ActionButton
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleCreateApplication}
            >
              Create Application
            </ActionButton>
          </Box>
        </PageHeader>

        <TabContainer>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="financial aid tabs">
            <Tab label="Applications" id="applications-tab" aria-controls="applications-panel" />
            <Tab label="Documents" id="documents-tab" aria-controls="documents-panel" />
          </Tabs>
        </TabContainer>

        <ContentContainer>
          {financialAidLoading && <LoadingSkeleton />}

          {financialAidError && (
            <ErrorContainer>
              <Alert severity="error">{financialAidError}</Alert>
            </ErrorContainer>
          )}

          {!financialAidLoading && !financialAidError && financialAidApplications.length === 0 && (
            <EmptyState message="No financial aid applications found." />
          )}

          {activeTab === 0 && (
            <AidApplicationList
              onEdit={handleEditApplication}
              onView={handleViewApplication}
              onDelete={handleDeleteApplication}
            />
          )}

          {activeTab === 1 && (
            <Card title="Manage Documents">
              {selectedApplicationId ? (
                <AidDocumentUpload
                  financialAidApplicationId={selectedApplicationId}
                  onUploadSuccess={handleDocumentUploadSuccess}
                  onUploadError={handleDocumentUploadError}
                />
              ) : (
                <Typography variant="body1">Select an application to manage documents.</Typography>
              )}
            </Card>
          )}
        </ContentContainer>

        {/* Document Upload Modal */}
        <Modal
          open={documentUploadOpen}
          onClose={handleCloseDocumentUpload}
          title="Upload Financial Aid Document"
        >
          {selectedApplicationId && (
            <AidDocumentUpload
              financialAidApplicationId={selectedApplicationId}
              onUploadSuccess={handleDocumentUploadSuccess}
              onUploadError={handleDocumentUploadError}
            />
          )}
        </Modal>
      </PageContainer>
    </DashboardLayout>
  );
};

export default FinancialAidPage;