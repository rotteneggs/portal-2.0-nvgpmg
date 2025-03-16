import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Typography, Box, Alert } from '@mui/material';
import TextField from '../../Common/TextField';
import Button from '../../Common/Button';
import Card from '../../Common/Card';
import { required, minLength, maxLength } from '../../../utils/validationUtils';
import { PersonalStatement } from '../../../types/application';

// Constants for character limits
const MIN_CHARACTERS = 250;
const MAX_CHARACTERS = 5000;

// Styled components for layout
const FormContainer = styled(Box)`
  margin: ${props => props.theme.spacing.md} 0;
`;

const StatementContainer = styled(Box)`
  margin: ${props => props.theme.spacing.md} 0;
`;

const CounterContainer = styled(Box)`
  text-align: right;
  margin-top: ${props => props.theme.spacing.xs};
  margin-bottom: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.fontSizes.small};
`;

const GuidanceContainer = styled(Box)`
  margin: ${props => props.theme.spacing.md} 0;
`;

const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-top: ${props => props.theme.spacing.lg};
`;

// Props interface
interface PersonalStatementFormProps {
  values: PersonalStatement;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: (field: string, value: any) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

/**
 * Calculates the character count of the personal statement
 * @param text The statement text
 * @returns Number of characters in the text
 */
const getCharacterCount = (text: string): number => {
  return text?.length || 0;
};

/**
 * Calculates the word count of the personal statement
 * @param text The statement text
 * @returns Number of words in the text
 */
const getWordCount = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Form component for the personal statement section of the application
 */
const PersonalStatementForm: React.FC<PersonalStatementFormProps> = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  onNextStep,
  onPrevStep
}) => {
  // State for tracking character and word counts
  const [characterCount, setCharacterCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // Update character and word counts when statement changes
  useEffect(() => {
    if (values.statement) {
      setCharacterCount(getCharacterCount(values.statement));
      setWordCount(getWordCount(values.statement));
    } else {
      setCharacterCount(0);
      setWordCount(0);
    }
  }, [values.statement]);

  // Handle changes to the personal statement
  const handleStatementChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e);
    setCharacterCount(getCharacterCount(e.target.value));
    setWordCount(getWordCount(e.target.value));
  };

  // Navigation handlers
  const handleNextClick = () => {
    onNextStep();
  };

  const handlePrevClick = () => {
    onPrevStep();
  };

  return (
    <Card>
      <FormContainer>
        <Typography variant="h4" component="h1" gutterBottom>
          Personal Statement
        </Typography>
        
        <GuidanceContainer>
          <Alert severity="info">
            Your personal statement is an important part of your application. Please take time to reflect on your academic journey, 
            goals, and what you hope to achieve through your education. Be specific and authentic in your writing.
          </Alert>
        </GuidanceContainer>
        
        <StatementContainer>
          <TextField
            id="statement"
            name="statement"
            label="Personal Statement"
            value={values.statement || ''}
            onChange={handleStatementChange}
            onBlur={handleBlur}
            error={touched.statement && errors.statement}
            multiline
            rows={10}
            fullWidth
            placeholder="Share your story, goals, and aspirations..."
            helperText={`The personal statement should be between ${MIN_CHARACTERS} and ${MAX_CHARACTERS} characters.`}
            required
          />
        </StatementContainer>
        
        <CounterContainer>
          <Typography 
            variant="body2" 
            color={characterCount < MIN_CHARACTERS || characterCount > MAX_CHARACTERS ? 'error' : 'textSecondary'}
          >
            {characterCount} characters | {wordCount} words
            {characterCount < MIN_CHARACTERS && ` (${MIN_CHARACTERS - characterCount} more characters needed)`}
            {characterCount > MAX_CHARACTERS && ` (${characterCount - MAX_CHARACTERS} characters over limit)`}
          </Typography>
        </CounterContainer>
        
        <ButtonContainer>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handlePrevClick}
          >
            Back
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleNextClick}
            disabled={characterCount < MIN_CHARACTERS || characterCount > MAX_CHARACTERS || Boolean(errors.statement)}
          >
            Next
          </Button>
        </ButtonContainer>
      </FormContainer>
    </Card>
  );
};

export default PersonalStatementForm;