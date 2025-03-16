import React, { useState, useEffect, useCallback } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import { Box, CircularProgress, LinearProgress } from '@mui/material'; // @mui/material v5.0.0
import { AttachFileOutlined, SendOutlined } from '@mui/icons-material'; // @mui/icons-material v5.0.0
import MessageService from '../../services/MessageService';
import { MessageCreateRequest, MessageReplyRequest } from '../../types/message';
import TextField from '../Common/TextField';
import Button from '../Common/Button';
import FileUploader from '../Common/FileUploader';
import useNotification from '../../hooks/useNotification';
import { colors, spacing } from '../../styles/variables';

/**
 * Interface for form validation errors
 */
interface FormErrors {
  subject: string | null;
  messageBody: string | null;
  attachments: string | null;
}

/**
 * Props for the MessageComposer component
 */
interface MessageComposerProps {
  recipientId: number;
  applicationId: number | null;
  replyToMessageId: number | null;
  onMessageSent: () => void;
  className?: string;
}

/**
 * Container for the entire message composer with appropriate spacing and borders
 */
const ComposerContainer = styled(Box)`
  padding: ${spacing.md};
  border: 1px solid ${colors.border.light};
  border-radius: ${spacing.sm};
`;

/**
 * Form element with proper layout and spacing
 */
const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

/**
 * Container for file attachment functionality with appropriate spacing
 */
const AttachmentSection = styled(Box)`
  margin-top: ${spacing.md};
`;

/**
 * Container for upload progress indicator with appropriate spacing and styling
 */
const ProgressContainer = styled(Box)`
  margin-top: ${spacing.sm};
`;

/**
 * Container for action buttons with flex layout and proper alignment
 */
const ActionContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: ${spacing.md};
`;

/**
 * Component for composing and sending messages
 */
const MessageComposer: React.FC<MessageComposerProps> = ({
  recipientId,
  applicationId,
  replyToMessageId,
  onMessageSent,
  className,
}) => {
  // State variables for form inputs and validation
  const [subject, setSubject] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({
    subject: null,
    messageBody: null,
    attachments: null,
  });
  const [sending, setSending] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Use the useNotification hook for displaying notifications
  const { showSuccess, showError } = useNotification();

  /**
   * Handles changes to the message subject input
   * @param event - The change event from the input
   */
  const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(event.target.value);
    setErrors({ ...errors, subject: null });
  };

  /**
   * Handles changes to the message body input
   * @param event - The change event from the input
   */
  const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageBody(event.target.value);
    setErrors({ ...errors, messageBody: null });
  };

  /**
   * Handles file selection for attachments
   * @param files - An array of selected files
   */
  const handleFileSelect = (files: File[]) => {
    setAttachments(files);
    setErrors({ ...errors, attachments: null });
  };

  /**
   * Validates the message form before submission
   * @returns Whether the form is valid
   */
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors: FormErrors = {
      subject: null,
      messageBody: null,
      attachments: null,
    };

    // Subject is required for new messages (not replies)
    if (!replyToMessageId && !subject) {
      newErrors.subject = 'Subject is required';
      isValid = false;
    }

    if (!messageBody) {
      newErrors.messageBody = 'Message body is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handles the message sending process
   */
  const handleSendMessage = async () => {
    // Prevent sending if already in progress
    if (sending) return;

    // Validate the form before proceeding
    if (!validateForm()) return;

    // Set sending state to true to show loading indicator
    setSending(true);

    try {
      // Prepare message data based on whether it's a new message or reply
      const messageData: MessageCreateRequest | MessageReplyRequest = replyToMessageId
        ? {
            message_body: messageBody,
            attachments: attachments.length > 0 ? attachments : null,
          }
        : {
            recipient_id: recipientId,
            subject: subject,
            message_body: messageBody,
            application_id: applicationId || null,
            attachments: attachments.length > 0 ? attachments : null,
          };

      // Call the appropriate MessageService method (createMessage or replyToExistingMessage)
      const sendMessageFn = replyToMessageId
        ? MessageService.replyToExistingMessage
        : MessageService.createMessage;

      const message = await sendMessageFn(
        replyToMessageId || recipientId, // Use recipientId for new messages
        messageData,
        handleUploadProgress
      );

      // Handle successful message sending with notification
      showSuccess('Message sent successfully!');

      // Call onMessageSent callback if provided
      onMessageSent();

      // Reset form fields after successful sending
      setSubject('');
      setMessageBody('');
      setAttachments([]);
      setErrors({ subject: null, messageBody: null, attachments: null });
    } catch (error: any) {
      // Handle errors with appropriate error notification
      showError(`Failed to send message: ${error.message}`);
    } finally {
      // Set sending state to false when complete
      setSending(false);
      setUploadProgress(0);
    }
  };

  /**
   * Tracks file upload progress
   * @param progressEvent - The progress event from the upload
   */
  const handleUploadProgress = (progressEvent: ProgressEvent) => {
    const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
    setUploadProgress(progress);
  };

  return (
    <ComposerContainer className={className}>
      <FormContainer onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}>
        {!replyToMessageId && (
          <TextField
            label="Subject"
            value={subject}
            onChange={handleSubjectChange}
            error={errors.subject}
            required
          />
        )}
        <TextField
          label="Message"
          multiline
          rows={4}
          maxRows={10}
          value={messageBody}
          onChange={handleMessageChange}
          error={errors.messageBody}
          required
        />
        <AttachmentSection>
          <FileUploader
            onFileSelect={handleFileSelect}
            multiple
          />
          {errors.attachments && (
            <Box mt={1}>
              <Typography variant="caption" color="error">
                {errors.attachments}
              </Typography>
            </Box>
          )}
        </AttachmentSection>
        {uploadProgress > 0 && (
          <ProgressContainer>
            <Typography variant="caption">
              Uploading: {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </ProgressContainer>
        )}
        <ActionContainer>
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendOutlined />}
            onClick={handleSendMessage}
            disabled={sending}
          >
            Send Message
            {sending && <CircularProgress size={24} />}
          </Button>
        </ActionContainer>
      </FormContainer>
    </ComposerContainer>
  );
};

export default MessageComposer;
export type { MessageComposerProps };