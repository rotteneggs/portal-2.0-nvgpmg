import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Alert, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  Chip 
} from '@mui/material';
import { AddCircleOutline, Delete } from '@mui/icons-material';
import Button from '../../Common/Button';
import TextField from '../../Common/TextField';
import RecommendationRequest from '../../Documents/RecommendationRequest';
import { DocumentType } from '../../../types/document';
import { Recommendation, Recommendations as RecommendationsType } from '../../../types/application';
import { required, email } from '../../../utils/validationUtils';

/**
 * Enum for recommendation status
 */
enum RecommendationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  EXPIRED = 'EXPIRED'
}

/**
 * Props interface for the Recommendations component
 */
interface RecommendationsProps {
  values: RecommendationsType;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onChange: (name: string, value: any) => void;
  onBlur: (name: string) => void;
  applicationId: number;
}

/**
 * Validates the recommendations section of the application form
 * @param recommendations - The recommendations data to validate
 * @returns Object containing any validation errors
 */
export const validateRecommendations = (recommendations: RecommendationsType): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Ensure at least one recommendation is added
  if (!recommendations.recommendations || recommendations.recommendations.length === 0) {
    errors['recommendations'] = 'At least one recommendation is required';
    return errors;
  }
  
  // Validate each recommendation
  recommendations.recommendations.forEach((recommendation, index) => {
    // Check for required fields
    if (!recommendation.recommender_name) {
      errors[`recommendations[${index}].recommender_name`] = 'Recommender name is required';
    }
    
    if (!recommendation.recommender_email) {
      errors[`recommendations[${index}].recommender_email`] = 'Recommender email is required';
    } else if (!email(recommendation.recommender_email)) {
      errors[`recommendations[${index}].recommender_email`] = 'Please enter a valid email address';
    }
    
    if (!recommendation.recommender_title) {
      errors[`recommendations[${index}].recommender_title`] = 'Recommender title is required';
    }
    
    if (!recommendation.recommender_institution) {
      errors[`recommendations[${index}].recommender_institution`] = 'Institution is required';
    }
    
    if (!recommendation.relationship) {
      errors[`recommendations[${index}].relationship`] = 'Relationship is required';
    }
  });
  
  return errors;
};

// Styled components
const Container = styled(Box)`
  margin-bottom: 2rem;
`;

const SectionTitle = styled(Typography)`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.palette.text.primary};
`;

const SectionDescription = styled(Typography)`
  margin-bottom: 1.5rem;
  color: ${props => props.theme.palette.text.secondary};
`;

const RecommendationTable = styled(Table)`
  margin-bottom: 1.5rem;
`;

const ActionButton = styled(Button)`
  margin-top: 1rem;
`;

const StatusChip = styled(Chip)<{ status: string }>`
  font-weight: 500;
  ${props => {
    switch (props.status) {
      case RecommendationStatus.PENDING:
        return `
          background-color: ${props.theme.palette.warning.light};
          color: ${props.theme.palette.warning.contrastText};
        `;
      case RecommendationStatus.SENT:
        return `
          background-color: ${props.theme.palette.info.light};
          color: ${props.theme.palette.info.contrastText};
        `;
      case RecommendationStatus.RECEIVED:
        return `
          background-color: ${props.theme.palette.success.light};
          color: ${props.theme.palette.success.contrastText};
        `;
      case RecommendationStatus.EXPIRED:
        return `
          background-color: ${props.theme.palette.error.light};
          color: ${props.theme.palette.error.contrastText};
        `;
      default:
        return '';
    }
  }}
`;

const FormContainer = styled(Paper)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const FormField = styled(Box)`
  margin-bottom: 1rem;
`;

const ButtonGroup = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
`;

/**
 * Form step component for managing recommendation letter requests in the application process.
 * This component allows applicants to add recommender information, send email requests,
 * and track the status of recommendation submissions.
 */
const Recommendations: React.FC<RecommendationsProps> = ({
  values,
  errors,
  touched,
  onChange,
  onBlur,
  applicationId
}) => {
  // State for showing/hiding the recommendation request form
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // State for editing an existing recommendation
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State for new recommendation form data
  const [newRecommendation, setNewRecommendation] = useState<Recommendation>({
    recommender_name: '',
    recommender_email: '',
    recommender_title: '',
    recommender_institution: '',
    relationship: '',
    status: RecommendationStatus.PENDING,
    requested_at: null,
    received_at: null
  });
  
  // State for form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Initialize recommendations array if it doesn't exist
  useEffect(() => {
    if (!values.recommendations) {
      onChange('recommendations', []);
    }
  }, [values.recommendations, onChange]);
  
  /**
   * Handles showing the recommendation request form
   */
  const handleAddRecommendation = () => {
    setShowRequestForm(true);
  };
  
  /**
   * Handles showing the form to add a new recommendation manually
   */
  const handleShowAddForm = () => {
    setShowAddForm(true);
  };
  
  /**
   * Handles hiding the add recommendation form
   */
  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewRecommendation({
      recommender_name: '',
      recommender_email: '',
      recommender_title: '',
      recommender_institution: '',
      relationship: '',
      status: RecommendationStatus.PENDING,
      requested_at: null,
      received_at: null
    });
    setFormErrors({});
  };
  
  /**
   * Handles removing a recommendation from the list
   * @param index - Index of the recommendation to remove
   */
  const handleRemoveRecommendation = (index: number) => {
    const updatedRecommendations = [...values.recommendations];
    updatedRecommendations.splice(index, 1);
    onChange('recommendations', updatedRecommendations);
  };
  
  /**
   * Handles changes to the new recommendation form fields
   * @param field - The field name being changed
   * @param value - The new value
   */
  const handleRecommendationChange = (field: keyof Recommendation, value: string) => {
    setNewRecommendation(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user types
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  /**
   * Validates the new recommendation form
   * @returns True if form is valid, false otherwise
   */
  const validateNewRecommendation = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newRecommendation.recommender_name) {
      errors.recommender_name = 'Recommender name is required';
    }
    
    if (!newRecommendation.recommender_email) {
      errors.recommender_email = 'Recommender email is required';
    } else if (!email(newRecommendation.recommender_email)) {
      errors.recommender_email = 'Please enter a valid email address';
    }
    
    if (!newRecommendation.recommender_title) {
      errors.recommender_title = 'Recommender title is required';
    }
    
    if (!newRecommendation.recommender_institution) {
      errors.recommender_institution = 'Institution is required';
    }
    
    if (!newRecommendation.relationship) {
      errors.relationship = 'Relationship is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Adds a new recommendation to the list
   */
  const handleSaveRecommendation = () => {
    if (!validateNewRecommendation()) {
      return;
    }
    
    const updatedRecommendations = [...(values.recommendations || [])];
    updatedRecommendations.push({
      ...newRecommendation,
      status: RecommendationStatus.PENDING,
      requested_at: new Date().toISOString()
    });
    
    onChange('recommendations', updatedRecommendations);
    handleCancelAdd();
  };
  
  /**
   * Handles a successful recommendation request sent through email
   * @param recommendation - The recommendation data including email address
   */
  const handleRequestSent = (recommendation: { email: string }) => {
    // Add the new recommendation to the list with SENT status
    const newRecommendations = [...(values.recommendations || [])];
    newRecommendations.push({
      recommender_name: '', // Will be filled when they respond
      recommender_email: recommendation.email,
      recommender_title: '',
      recommender_institution: '',
      relationship: '',
      status: RecommendationStatus.SENT,
      requested_at: new Date().toISOString(),
      received_at: null
    });
    
    onChange('recommendations', newRecommendations);
    setShowRequestForm(false);
  };
  
  /**
   * Returns a styled chip based on recommendation status
   * @param status - The status of the recommendation
   * @returns A styled chip component
   */
  const getStatusChip = (status: string) => {
    let label = '';
    
    switch (status) {
      case RecommendationStatus.PENDING:
        label = 'Pending';
        break;
      case RecommendationStatus.SENT:
        label = 'Request Sent';
        break;
      case RecommendationStatus.RECEIVED:
        label = 'Received';
        break;
      case RecommendationStatus.EXPIRED:
        label = 'Expired';
        break;
      default:
        label = status;
    }
    
    return <StatusChip status={status} label={label} size="small" />;
  };
  
  // Derive error state from props
  const hasRecommendationsError = errors && errors['recommendations'];
  
  return (
    <Container>
      <SectionTitle variant="h5">Recommendations</SectionTitle>
      <SectionDescription variant="body1">
        Most programs require letters of recommendation. You can add recommenders below by providing 
        their contact information or by sending them an email request directly. Your recommenders 
        will receive instructions on how to submit their letters.
      </SectionDescription>
      
      {hasRecommendationsError && touched && touched['recommendations'] && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors['recommendations']}
        </Alert>
      )}
      
      {/* Table of existing recommendations */}
      {values.recommendations && values.recommendations.length > 0 ? (
        <RecommendationTable size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Institution</TableCell>
              <TableCell>Relationship</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {values.recommendations.map((recommendation, index) => (
              <TableRow key={index}>
                <TableCell>{recommendation.recommender_name || '-'}</TableCell>
                <TableCell>{recommendation.recommender_email}</TableCell>
                <TableCell>{recommendation.recommender_title || '-'}</TableCell>
                <TableCell>{recommendation.recommender_institution || '-'}</TableCell>
                <TableCell>{recommendation.relationship || '-'}</TableCell>
                <TableCell>{getStatusChip(recommendation.status)}</TableCell>
                <TableCell align="right">
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => handleRemoveRecommendation(index)}
                    startIcon={<Delete />}
                    aria-label="Remove recommender"
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </RecommendationTable>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          No recommendations added yet. Please add at least one recommender.
        </Alert>
      )}
      
      {/* Controls for adding recommendations */}
      {!showRequestForm && !showAddForm && (
        <Box>
          <ActionButton
            variant="outlined"
            color="primary"
            onClick={handleShowAddForm}
            startIcon={<AddCircleOutline />}
          >
            Add Recommender Manually
          </ActionButton>
          
          <ActionButton
            variant="contained"
            color="primary"
            onClick={handleAddRecommendation}
            startIcon={<AddCircleOutline />}
            sx={{ ml: 2 }}
          >
            Send Email Request
          </ActionButton>
        </Box>
      )}
      
      {/* Form for adding a recommendation manually */}
      {showAddForm && (
        <FormContainer elevation={2}>
          <SectionTitle variant="h6">Add Recommender</SectionTitle>
          <Divider sx={{ mb: 2 }} />
          
          <FormField>
            <TextField
              label="Recommender Name"
              value={newRecommendation.recommender_name}
              onChange={(e) => handleRecommendationChange('recommender_name', e.target.value)}
              error={formErrors.recommender_name}
              fullWidth
              required
            />
          </FormField>
          
          <FormField>
            <TextField
              label="Recommender Email"
              value={newRecommendation.recommender_email}
              onChange={(e) => handleRecommendationChange('recommender_email', e.target.value)}
              error={formErrors.recommender_email}
              fullWidth
              required
            />
          </FormField>
          
          <FormField>
            <TextField
              label="Recommender Title/Position"
              value={newRecommendation.recommender_title}
              onChange={(e) => handleRecommendationChange('recommender_title', e.target.value)}
              error={formErrors.recommender_title}
              fullWidth
              required
            />
          </FormField>
          
          <FormField>
            <TextField
              label="Institution/Organization"
              value={newRecommendation.recommender_institution}
              onChange={(e) => handleRecommendationChange('recommender_institution', e.target.value)}
              error={formErrors.recommender_institution}
              fullWidth
              required
            />
          </FormField>
          
          <FormField>
            <TextField
              label="Relationship to Applicant"
              value={newRecommendation.relationship}
              onChange={(e) => handleRecommendationChange('relationship', e.target.value)}
              error={formErrors.relationship}
              fullWidth
              required
              placeholder="e.g., Professor, Employer, Mentor"
            />
          </FormField>
          
          <ButtonGroup>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleCancelAdd}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveRecommendation}
            >
              Save Recommender
            </Button>
          </ButtonGroup>
        </FormContainer>
      )}
      
      {/* Form for sending recommendation requests via email */}
      {showRequestForm && (
        <RecommendationRequest
          applicationId={applicationId}
          onRequestSent={handleRequestSent}
        />
      )}
    </Container>
  );
};

export default Recommendations;