import React, { useState, useEffect } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Divider } from '@mui/material'; // @mui/material v5.0.0
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // @mui/icons-material v5.0.0
import DashboardLayout from '../../layouts/DashboardLayout';
import MessageThread from '../../components/Messages/MessageThread';
import Button from '../../components/Common/Button';
import Card from '../../components/Common/Card';
import useNotification from '../../hooks/useNotification';

/**
 * Styled component for the main container of the page.
 * Provides a maximum width and centers the content.
 */
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

/**
 * Styled component for the header section of the page.
 * Includes the back button and the title.
 */
const HeaderContainer = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
`;

/**
 * Styled component for the message card.
 * Contains the message thread and takes up the remaining height of the viewport.
 */
const MessageCard = styled(Card)`
  width: 100%;
  height: calc(100vh - 200px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

/**
 * Styled component for the back button.
 * Overrides default button styles for a smaller size and no minimum width.
 */
const BackButton = styled(Button)`
  min-width: auto;
  padding: 8px;
`;

/**
 * Main component for the message detail view page
 */
const ViewMessagePage: React.FC = () => {
  // Get navigation function from React Router
  const navigate = useNavigate();

  // Get URL parameters to extract messageId and applicationId
  const { messageId: messageIdParam, applicationId: applicationIdParam } = useParams();

  // Get current location to track current path
  const location = useLocation();

  // Initialize notification hook for displaying success/error messages
  const { showSuccess } = useNotification();

  // Parse messageId and applicationId from URL parameters
  const messageId = messageIdParam ? parseInt(messageIdParam, 10) : null;
  const applicationId = applicationIdParam ? parseInt(applicationIdParam, 10) : null;

  /**
   * Handles navigation back to the messages inbox
   */
  const handleBackToInbox = () => {
    // Navigate to the messages list page route
    let route = '/messages';

    // Include applicationId in the URL if available
    if (applicationId) {
      route = `/applications/${applicationId}/messages`;
    }

    navigate(route, { state: { from: location } });
  };

  /**
   * Handles successful message reply
   */
  const handleMessageSent = () => {
    // Show success notification to the user
    showSuccess('Message sent successfully!');

    // Optionally refresh the current message thread
    // fetchMessage();
  };

  // Render the page with DashboardLayout wrapper
  return (
    <DashboardLayout title="View Message">
      <PageContainer>
        {/* Render page header with back button and title */}
        <HeaderContainer>
          <BackButton
            variant="outlined"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToInbox}
          >
            Back to Inbox
          </BackButton>
          <Typography variant="h5" component="h2">
            View Message
          </Typography>
        </HeaderContainer>

        {/* Render Card containing the MessageThread component */}
        <MessageCard>
          <MessageThread
            messageId={messageId || undefined}
            onMessageSent={handleMessageSent}
          />
        </MessageCard>
      </PageContainer>
    </DashboardLayout>
  );
};

export default ViewMessagePage;