import React, { useState, useEffect, useCallback } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Typography, Avatar, Divider, Box, CircularProgress, Paper } from '@mui/material'; // @mui/material v5.0.0
import { ReplyOutlined, PersonOutline } from '@mui/icons-material'; // @mui/icons-material v5.0.0
import MessageService from '../../services/MessageService';
import { Message, MessageThreadProps as MessageType } from '../../types/message';
import MessageComposer from './MessageComposer';
import MessageAttachment from './MessageAttachment';
import Card from '../Common/Card';
import Button from '../Common/Button';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import EmptyState from '../Common/EmptyState';
import useNotification from '../../hooks/useNotification';
import { colors, spacing } from '../../styles/variables';

/**
 * Interface for the props that the MessageThread component will receive.
 * Includes messageId, an optional callback for when a message is sent, and an optional className.
 */
interface MessageThreadProps {
  messageId?: number;
  onMessageSent?: () => void;
  className?: string;
}

/**
 * Styled component for the main container of the message thread.
 * Provides padding and a maximum width for readability.
 */
const ThreadContainer = styled.div`
  padding: ${spacing.md};
`;

/**
 * Styled component for the header of each message in the thread.
 * Displays sender information and timestamp.
 */
const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.sm};
`;

/**
 * Styled component for the sender's information, including avatar and name.
 * Uses flex layout for horizontal alignment.
 */
const SenderInfo = styled.div`
  display: flex;
  align-items: center;
`;

/**
 * Styled component for the main content of the message, including subject and body.
 * Provides spacing between the subject and body.
 */
const MessageContent = styled.div`
  margin-bottom: ${spacing.md};
`;

/**
 * Styled component for the message subject.
 * Uses Typography from Material-UI with a bold font weight.
 */
const MessageSubject = styled(Typography)`
  font-weight: 500;
`;

/**
 * Styled component for the message body.
 * Uses Typography from Material-UI with appropriate spacing.
 */
const MessageBody = styled(Typography)`
  margin-top: ${spacing.sm};
`;

/**
 * Styled component for the container of message attachments.
 * Uses a grid layout to display attachments in a structured manner.
 */
const AttachmentsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${spacing.md};
`;

/**
 * Styled component for the container of the reply button and form.
 * Provides spacing and layout for the reply functionality.
 */
const ReplyContainer = styled.div`
  margin-top: ${spacing.md};
`;

/**
 * Styled component for the container of the error message and retry button.
 * Provides layout and styling for error handling.
 */
const ErrorContainer = styled.div`
  text-align: center;
  padding: ${spacing.md};
`;

/**
 * Fetches message data by ID and marks it as read if needed.
 * @param messageId The ID of the message to fetch.
 */
const fetchMessageData = async (messageId: number) => {
  // Set loading state to true
  setLoading(true);
  try {
    // Call MessageService.fetchMessage with the provided messageId
    const messageData = await MessageService.fetchMessage(messageId);
    // If successful, update message state with the response data
    setMessage(messageData);
    // If the message is unread, mark it as read using MessageService.markMessageAsRead
    if (!messageData.is_read) {
      await MessageService.markMessageAsRead(messageId);
    }
  } catch (error: any) {
    // If there's an error, set error state and show error notification
    setError(error.message);
    showError(`Failed to load message: ${error.message}`);
  } finally {
    // Finally, set loading state to false
    setLoading(false);
  }
};

/**
 * Handles the reply to a message.
 */
const handleReply = () => {
  // Set showReplyForm state to true to display the reply composer
  setShowReplyForm(true);
};

/**
 * Handles successful message sending.
 */
const handleMessageSent = () => {
  // Set showReplyForm state to false to hide the reply composer
  setShowReplyForm(false);
  // Refresh the message thread by fetching the message data again
  if (message?.id) {
    fetchMessageData(message.id);
  }
  // If onMessageSent callback is provided, call it to notify parent components
  onMessageSent?.();
};

/**
 * Handles retry action when fetching message fails.
 */
const handleRetry = () => {
  // Reset error state
  setError(null);
  // Fetch message data again with current messageId
  if (messageId) {
    fetchMessageData(messageId);
  }
};

/**
 * Component that displays a message thread with reply functionality.
 * @param props The properties for the MessageThread component.
 */
const MessageThread: React.FC<MessageThreadProps> = ({ messageId, onMessageSent, className }) => {
  // Extract messageId, onMessageSent, and className from props
  // Initialize state for message, loading, error, and showReplyForm
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);

  // Initialize notification hook for displaying success/error messages
  const { showError } = useNotification();

  // Implement useEffect to fetch message data when messageId changes
  useEffect(() => {
    if (messageId) {
      fetchMessageData(messageId);
    }
  }, [messageId]);

  // Implement handlers for reply, message sent, and retry actions
  // Render loading skeleton while data is being fetched
  if (loading) {
    return <LoadingSkeleton variant="text" height={200} />;
  }

  // Render error state if message couldn't be loaded
  if (error) {
    return (
      <ErrorContainer>
        <Typography variant="body1" color="error">
          {error}
        </Typography>
        <Button onClick={handleRetry}>Retry</Button>
      </ErrorContainer>
    );
  }

  // Render empty state if no message is selected (no messageId)
  if (!messageId) {
    return <EmptyState message="No message selected" />;
  }

  // Render message header with sender information and timestamp
  // Render message subject and body content
  // Render message attachments if present
  // Render reply button and conditionally show reply form
  // Implement responsive design for different screen sizes
  return (
    <ThreadContainer className={className}>
      <Card>
        {message && (
          <>
            <MessageHeader>
              <SenderInfo>
                <Avatar>
                  <PersonOutline />
                </Avatar>
                <Typography variant="subtitle2">{message.sender.profile?.first_name} {message.sender.profile?.last_name}</Typography>
              </SenderInfo>
              <Typography variant="caption">{message.formatted_created_at}</Typography>
            </MessageHeader>
            <Divider />
            <MessageContent>
              <MessageSubject variant="h6">{message.subject}</MessageSubject>
              <MessageBody variant="body1">{message.message_body}</MessageBody>
            </MessageContent>
            {message.attachments && message.attachments.length > 0 && (
              <>
                <Typography variant="subtitle1">Attachments</Typography>
                <AttachmentsContainer>
                  {message.attachments.map(attachment => (
                    <MessageAttachment key={attachment.id} attachment={attachment} />
                  ))}
                </AttachmentsContainer>
              </>
            )}
            <ReplyContainer>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<ReplyOutlined />}
                onClick={handleReply}
              >
                Reply
              </Button>
              {showReplyForm && (
                <MessageComposer
                  recipientId={message.sender_user_id}
                  applicationId={message.application_id}
                  replyToMessageId={message.id}
                  onMessageSent={handleMessageSent}
                />
              )}
            </ReplyContainer>
          </>
        )}
      </Card>
    </ThreadContainer>
  );
};

export default MessageThread;
export type { MessageThreadProps };