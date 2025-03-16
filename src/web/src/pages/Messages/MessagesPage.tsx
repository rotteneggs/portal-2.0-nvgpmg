# src/web/src/pages/Messages/MessagesPage.tsx
```typescript
import React, { useState, useEffect } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Divider } from '@mui/material'; // @mui/material v5.0.0
import AddIcon from '@mui/icons-material/Add'; // @mui/icons-material v5.0.0
import DashboardLayout from '../../layouts/DashboardLayout';
import MessageInbox from '../../components/Messages/MessageInbox';
import Button from '../../components/Common/Button';
import Card from '../../components/Common/Card';
import { Message } from '../../types/message';
import useNotification from '../../hooks/useNotification';

/**
 * Styled component for the main container of the messages page
 */
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

/**
 * Styled component for the header section containing the title and compose button
 */
const HeaderContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

/**
 * Styled component for the card containing the message inbox
 */
const InboxCard = styled(Card)`
  width: 100%;
  height: calc(100vh - 200px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

/**
 * Main component for the messaging center page
 * @returns The rendered page component
 */
const MessagesPage: React.FC = () => {
  // Get navigation function from React Router
  const navigate = useNavigate();

  // Get URL parameters to extract applicationId if available
  const { applicationId: applicationIdParam } = useParams<{ applicationId?: string }>();

  // Get current location to track current path
  const location = useLocation();

  // Initialize state for selected message
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Initialize notification hook for displaying success/error messages
  const useNotification = useNotification();

  // Parse applicationId from URL parameters if present
  const applicationId = applicationIdParam ? parseInt(applicationIdParam, 10) : undefined;

  /**
   * Handles navigation to the compose message page
   */
  const handleComposeMessage = () => {
    // Navigate to the compose message page route
    let composePath = '/messages/compose';

    // Include applicationId in the URL if available
    if (applicationId) {
      composePath += `?applicationId=${applicationId}`;
    }

    navigate(composePath);
  };

  /**
   * Handles selection of a message from the inbox
   * @param message - Selected message
   */
  const handleMessageSelect = (message: Message) => {
    // Navigate to the view message page route with the selected message ID
    let messagePath = `/messages/view/${message.id}`;

    // Include applicationId in the URL if available
    if (applicationId) {
      messagePath += `?applicationId=${applicationId}`;
    }

    navigate(messagePath);
  };

  return (
    <DashboardLayout title="Messages">
      <PageContainer>
        <HeaderContainer>
          <Typography variant="h4" component="h1">
            Messages
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleComposeMessage}
          >
            Compose
          </Button>
        </HeaderContainer>
        <InboxCard>
          <MessageInbox
            applicationId={applicationId}
            onMessageSelect={handleMessageSelect}
          />
        </InboxCard>
      </PageContainer>
    </DashboardLayout>
  );
};

export default MessagesPage;