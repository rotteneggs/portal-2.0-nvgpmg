import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  IconButton, 
  Tooltip, 
  CircularProgress 
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Send as SendIcon 
} from '@mui/icons-material';
import Button from '../Common/Button';
import TextField from '../Common/TextField';
import useNotification from '../../hooks/useNotification';
import { validateEmail } from '../../utils/validationUtils';
import { DocumentType } from '../../types/document';

/**
 * Props interface for the RecommendationRequest component
 */
interface RecommendationRequestProps {
  /** ID of the application to request recommendations for */
  applicationId: string | number;
  /** Callback function called when recommendation requests are successfully sent */
  onRequestSent: () => void;
  /** Additional CSS class for styling */
  className?: string;
}

/**
 * Interface for a recommender's email and validation state
 */
interface Recommender {
  email: string;
  error: string | null;
}

// Styled components
const RequestContainer = styled(Paper)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
`;

const Title = styled(Typography)`
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.palette?.text?.primary || '#212121'};
`;

const Description = styled(Typography)`
  margin-bottom: 1.5rem;
  color: ${props => props.theme.palette?.text?.secondary || '#757575'};
`;

const RecommenderRow = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const EmailField = styled(Box)`
  flex-grow: 1;
  margin-right: 1rem;
`;

const ActionButtons = styled(Box)`
  display: flex;
  align-items: center;
`;

const SendButtonContainer = styled(Box)`
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
`;

/**
 * Component for sending recommendation letter requests to recommenders
 * 
 * Allows users to enter email addresses for recommenders, add or remove recommenders,
 * and send formal requests for recommendation letters as part of the document
 * submission process.
 */
const RecommendationRequest: React.FC<RecommendationRequestProps> = ({
  applicationId,
  onRequestSent,
  className = '',
}) => {
  // State for recommenders (array of email addresses)
  const [recommenders, setRecommenders] = useState<Recommender[]>([]);
  // Loading state while sending requests
  const [isLoading, setIsLoading] = useState(false);
  // General form error
  const [formError, setFormError] = useState<string | null>(null);
  
  // Get notification functionality
  const { notifications, unreadCount, loading, error, preferences, 
    fetchNotifications, fetchUnreadCount, markNotificationAsRead, 
    markAllNotificationsAsRead, fetchPreferences, updatePreferences, 
    hasMore, loadMore } = useNotification();

  // Initialize with one empty recommender field
  useEffect(() => {
    if (recommenders.length === 0) {
      setRecommenders([{ email: '', error: null }]);
    }
  }, []);

  // Add a new recommender field
  const addRecommender = useCallback(() => {
    setRecommenders(prev => [...prev, { email: '', error: null }]);
  }, []);

  // Remove a recommender field by index
  const removeRecommender = useCallback((index: number) => {
    setRecommenders(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle email input change and validate
  const handleEmailChange = useCallback((index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = event.target.value;
    setRecommenders(prev => {
      const updated = [...prev];
      updated[index] = { 
        email: newEmail, 
        error: newEmail ? validateEmail(newEmail) ? null : 'Please enter a valid email address' : null 
      };
      return updated;
    });
    
    // Clear general form error when user types
    if (formError) {
      setFormError(null);
    }
  }, [formError]);

  // Validate all recommender emails
  const validateRecommenders = useCallback(() => {
    let isValid = true;
    
    // Check if there are any recommenders
    if (recommenders.length === 0) {
      setFormError('Please add at least one recommender');
      return false;
    }
    
    // Make a copy of recommenders to update validation errors
    const updatedRecommenders = [...recommenders];
    
    // Validate each email
    recommenders.forEach((recommender, index) => {
      if (!recommender.email.trim()) {
        updatedRecommenders[index].error = 'Email address is required';
        isValid = false;
      } else if (!validateEmail(recommender.email)) {
        updatedRecommenders[index].error = 'Please enter a valid email address';
        isValid = false;
      } else {
        updatedRecommenders[index].error = null;
      }
    });
    
    // Check for duplicate emails
    const emails = recommenders.map(r => r.email.toLowerCase().trim());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      setFormError('Duplicate email addresses are not allowed');
      isValid = false;
    }
    
    // Update recommenders with validation errors
    setRecommenders(updatedRecommenders);
    
    return isValid;
  }, [recommenders]);

  // Send recommendation requests
  const sendRequests = useCallback(async () => {
    // Validate emails before sending
    if (!validateRecommenders()) {
      return;
    }
    
    // Reset form error
    setFormError(null);
    
    // Start loading
    setIsLoading(true);
    
    try {
      // Extract valid email addresses
      const emails = recommenders.map(r => r.email.trim());
      
      // Make API call to send recommendation requests
      const response = await fetch('/api/v1/documents/recommendation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          application_id: applicationId,
          emails,
          document_type: DocumentType.RECOMMENDATION
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send recommendation requests');
      }
      
      // Call the callback function to notify parent
      onRequestSent();
      
      // Reset form after successful submission
      setRecommenders([{ email: '', error: null }]);
      
    } catch (error) {
      console.error('Error sending recommendation requests:', error);
      
      // Set form error
      setFormError(error instanceof Error ? error.message : 'An error occurred while sending requests');
    } finally {
      // End loading
      setIsLoading(false);
    }
  }, [applicationId, recommenders, validateRecommenders, onRequestSent]);

  return (
    <RequestContainer className={className}>
      <Title variant="h6">Recommendation Letters</Title>
      <Description variant="body2">
        Enter the email addresses of people who will provide your recommendation letters. 
        We'll send them an email with instructions on how to submit their recommendation.
      </Description>
      
      {/* Display form-level error if any */}
      {formError && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {formError}
        </Typography>
      )}
      
      {/* Recommender email inputs */}
      {recommenders.map((recommender, index) => (
        <RecommenderRow key={index}>
          <EmailField>
            <TextField
              label={`Recommender ${index + 1} Email Address`}
              value={recommender.email}
              onChange={(e) => handleEmailChange(index, e)}
              placeholder="Enter email address"
              error={recommender.error}
              fullWidth
              disabled={isLoading}
              required
            />
          </EmailField>
          <ActionButtons>
            {/* Button to remove this recommender */}
            {recommenders.length > 1 && (
              <Tooltip title="Remove recommender">
                <IconButton 
                  onClick={() => removeRecommender(index)} 
                  disabled={isLoading}
                  aria-label="Remove recommender"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {/* Button to add new recommender (only show on last row) */}
            {index === recommenders.length - 1 && (
              <Tooltip title="Add another recommender">
                <IconButton 
                  onClick={addRecommender} 
                  disabled={isLoading}
                  aria-label="Add recommender"
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            )}
          </ActionButtons>
        </RecommenderRow>
      ))}
      
      {/* Send requests button */}
      <SendButtonContainer>
        <Button
          onClick={sendRequests}
          disabled={isLoading}
          loading={isLoading}
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
        >
          Send Request{recommenders.length > 1 ? 's' : ''}
        </Button>
      </SendButtonContainer>
    </RequestContainer>
  );
};

export default RecommendationRequest;