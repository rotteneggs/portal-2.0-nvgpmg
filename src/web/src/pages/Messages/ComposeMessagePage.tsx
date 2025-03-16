import React, { useState, useEffect, useCallback } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.0.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Divider, IconButton } from '@mui/material'; // @mui/material v5.0.0
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // @mui/icons-material v5.0.0
import DashboardLayout from '../../layouts/DashboardLayout';
import MessageComposer, { MessageComposerProps } from '../../components/Messages/MessageComposer';
import Card from '../../components/Common/Card';
import useNotification from '../../hooks/useNotification';
import UserService from '../../services/UserService';

/**
 * Styled component for the page container with appropriate width and padding
 */
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

/**
 * Styled component for the header container with flex layout and spacing
 */
const HeaderContainer = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
`;

/**
 * Styled component for the composer card with width and padding
 */
const ComposerCard = styled(Card)`
  width: 100%;
  padding: 24px;
`;

/**
 * Styled component for the back button with margin
 */
const BackButton = styled(IconButton)`
  margin-right: 8px;
`;

/**
 * Main component for the message composition page
 * @returns The rendered page component
 */
const ComposeMessagePage: React.FC = () => {
  // Get navigation function from React Router
  const navigate = useNavigate();

  // Get URL parameters and location state from React Router
  const { recipientId: recipientIdParam, applicationId: applicationIdParam, replyToMessageId: replyToMessageIdParam } = useParams();
  const location = useLocation();

  // Extract recipientId, applicationId, and replyToMessageId from URL parameters if available
  const recipientId = recipientIdParam ? parseInt(recipientIdParam, 10) : null;
  const applicationId = applicationIdParam ? parseInt(applicationIdParam, 10) : null;
  const replyToMessageId = replyToMessageIdParam ? parseInt(replyToMessageIdParam, 10) : null;

  // Extract subject and initialMessage from location state if available (for forwarding)
  const subject = location.state?.subject as string | undefined;
  const initialMessage = location.state?.initialMessage as string | undefined;

  // Initialize state for recipient information
  const [recipient, setRecipient] = useState(null);

  // Initialize notification hook for displaying success/error messages
  const { showSuccess, showError } = useNotification();

  /**
   * Fetches information about the message recipient
   * @param userId
   */
  const fetchRecipientInfo = useCallback(async (userId: number) => {
    try {
      // Call UserService.fetchUserById with the provided userId
      const userService = new UserService();
      const user = await userService.getUserById(userId);

      // Update the recipient state with the returned user information
      setRecipient(user);
    } catch (error: any) {
      // Handle any errors with appropriate error notification
      showError(`Failed to fetch recipient information: ${error.message}`);
    }
  }, [showError]);

  // Fetch recipient information if recipientId is provided
  useEffect(() => {
    if (recipientId) {
      fetchRecipientInfo(recipientId);
    }
  }, [recipientId, fetchRecipientInfo]);

  /**
   * Handles click on the back button
   */
  const handleBackClick = useCallback(() => {
    // Navigate back to the messages page
    // Include applicationId in the URL if available
    const backUrl = applicationId ? `/messages?applicationId=${applicationId}` : '/messages';
    navigate(backUrl);
  }, [navigate, applicationId]);

  /**
   * Handles successful sending of a message
   */
  const handleMessageSent = useCallback(() => {
    // Show success notification
    showSuccess('Message sent successfully!');

    // Navigate back to the messages page
    // Include applicationId in the URL if available
    const backUrl = applicationId ? `/messages?applicationId=${applicationId}` : '/messages';
    navigate(backUrl);
  }, [navigate, showSuccess, applicationId]);

  // Render the page with DashboardLayout wrapper
  return (
    <DashboardLayout title={replyToMessageId ? 'Reply' : 'New Message'}>
      <PageContainer>
        {/* Render page header with back button and appropriate title (New Message or Reply) */}
        <HeaderContainer>
          <BackButton color="primary" aria-label="back" onClick={handleBackClick}>
            <ArrowBackIcon />
          </BackButton>
          <Typography variant="h5">
            {replyToMessageId ? 'Reply' : 'New Message'}
          </Typography>
        </HeaderContainer>
        {/* Render Card containing the MessageComposer component */}
        <ComposerCard>
          <MessageComposer
            recipientId={recipientId}
            applicationId={applicationId}
            replyToMessageId={replyToMessageId}
            onMessageSent={handleMessageSent}
          />
        </ComposerCard>
      </PageContainer>
    </DashboardLayout>
  );
};

export default ComposeMessagePage;