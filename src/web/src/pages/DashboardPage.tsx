import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Grid, Typography, Box, Button, Fab } from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { QuestionAnswer } from '@mui/icons-material'; // @mui/icons-material v5.11.10

import DashboardLayout from '../layouts/DashboardLayout';
import StatusCard from '../components/Dashboard/StatusCard';
import NextSteps from '../components/Dashboard/NextSteps';
import ImportantDates from '../components/Dashboard/ImportantDates';
import RecentMessages from '../components/Dashboard/RecentMessages';
import DocumentStatus from '../components/Dashboard/DocumentStatus';
import ApplicationTimeline from '../components/Dashboard/ApplicationTimeline';
import Chatbot from '../components/AIAssistant/Chatbot';
import LoadingSkeleton from '../components/Common/LoadingSkeleton';
import {
  selectCurrentApplication,
  selectApplicationsLoading,
  fetchApplication as fetchApplicationAction,
} from '../redux/slices/applicationsSlice';
import { selectUserProfile } from '../redux/slices/userSlice';

// Styled components for consistent UI
const WelcomeMessage = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
  variant: h4;
`;

const DashboardGrid = styled(Grid)`
  spacing: 3;
  width: 100%;
`;

const GridItem = styled(Grid)`
  xs={12};
  md={6};
  lg={4};
`;

const EmptyStateContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
`;

const ChatbotFab = styled(Fab)`
  position: fixed;
  bottom: 20px;
  right: 20px;
`;

/**
 * Main dashboard page component that displays personalized information for the student
 */
const DashboardPage: React.FC = () => {
  // Initialize navigate function from useNavigate hook
  const navigate = useNavigate();

  // Initialize dispatch function from useDispatch hook
  const dispatch = useDispatch();

  // Get current application data using useSelector with selectCurrentApplication
  const currentApplication = useSelector(selectCurrentApplication);

  // Get application loading state using useSelector with selectApplicationsLoading
  const applicationsLoading = useSelector(selectApplicationsLoading);

  // Get user profile data using useSelector with selectUserProfile
  const userProfile = useSelector(selectUserProfile);

  // Initialize chatbot visibility state with useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Define handleStatusCardClick function to navigate to application status page
  const handleStatusCardClick = useCallback(() => {
    navigate('/applications/status');
  }, [navigate]);

  // Define handleCompleteProfile function to navigate to profile page
  const handleCompleteProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  // Define handleUploadDocuments function to navigate to document upload page
  const handleUploadDocuments = useCallback(() => {
    if (currentApplication) {
      navigate(`/applications/${currentApplication.id}/documents`);
    }
  }, [navigate, currentApplication]);

  // Define handlePayFee function to navigate to payment page
  const handlePayFee = useCallback(() => {
    navigate('/payments');
  }, [navigate]);

  // Define handleProvideInfo function to navigate to application edit page
  const handleProvideInfo = useCallback(() => {
    if (currentApplication) {
      navigate(`/applications/${currentApplication.id}/edit`);
    }
  }, [navigate, currentApplication]);

  // Define handleViewAllMessages function to navigate to messages page
  const handleViewAllMessages = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  // Define toggleChatbot function to show/hide the AI assistant
  const toggleChatbot = useCallback(() => {
    setIsChatbotOpen((prev) => !prev);
  }, []);

  // Use useEffect to fetch application data when component mounts
  useEffect(() => {
    dispatch(fetchApplicationAction(1)); // Fetch the first application
  }, [dispatch]);

  return (
    <DashboardLayout title="Dashboard">
      {/* If loading, render LoadingSkeleton components in the dashboard layout */}
      {applicationsLoading ? (
        <>
          <LoadingSkeleton variant="text" width="30%" />
          <DashboardGrid container spacing={3}>
            <GridItem item xs={12} md={6} lg={4}>
              <LoadingSkeleton variant="card" height={300} />
            </GridItem>
            <GridItem item xs={12} md={6} lg={4}>
              <LoadingSkeleton variant="card" height={300} />
            </GridItem>
            <GridItem item xs={12} md={6} lg={4}>
              <LoadingSkeleton variant="card" height={300} />
            </GridItem>
            <GridItem item xs={12}>
              <LoadingSkeleton variant="rectangular" height={200} />
            </GridItem>
          </DashboardGrid>
        </>
      ) : currentApplication ? (
        <>
          {/* Render WelcomeMessage with user's name */}
          <WelcomeMessage variant="h4">
            Welcome back, {userProfile?.first_name || 'Applicant'}!
          </WelcomeMessage>

          {/* Render DashboardGrid with dashboard components */}
          <DashboardGrid container spacing={3}>
            <GridItem item xs={12} md={6} lg={4}>
              <StatusCard
                status={currentApplication.current_status?.status || 'N/A'}
                completionPercentage={80} // Replace with actual completion percentage
                updatedAt={currentApplication.updated_at}
                onClick={handleStatusCardClick}
              />
            </GridItem>
            <GridItem item xs={12} md={6} lg={4}>
              <NextSteps
                onCompleteProfile={handleCompleteProfile}
                onUploadDocuments={handleUploadDocuments}
                onPayFee={handlePayFee}
                onProvideInfo={handleProvideInfo}
              />
            </GridItem>
            <GridItem item xs={12} md={6} lg={4}>
              <ImportantDates />
            </GridItem>
            <GridItem item xs={12}>
              <RecentMessages onViewAll={handleViewAllMessages} />
            </GridItem>
            <GridItem item xs={12}>
              <DocumentStatus
                applicationId={currentApplication.id}
                applicationType={currentApplication.application_type}
                onUploadClick={handleUploadDocuments}
              />
            </GridItem>
            <GridItem item xs={12}>
              <ApplicationTimeline />
            </GridItem>
          </DashboardGrid>
        </>
      ) : (
        // If no application exists, render empty state with create application button
        <EmptyStateContainer>
          <Typography variant="h6">No application found</Typography>
          <Typography variant="body2">
            Click the button below to start a new application.
          </Typography>
          <Button onClick={() => navigate('/applications/create')}>
            Create Application
          </Button>
        </EmptyStateContainer>
      )}

      {/* Render Chatbot component (visible based on state) */}
      <ChatbotFab
        color="primary"
        aria-label="open chatbot"
        onClick={toggleChatbot}
      >
        <QuestionAnswer />
      </ChatbotFab>
      <Chatbot
        isOpen={isChatbotOpen}
        onClose={toggleChatbot}
        applicationId={currentApplication?.id}
      />
    </DashboardLayout>
  );
};

export default DashboardPage;