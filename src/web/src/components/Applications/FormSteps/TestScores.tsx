import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TextField from '../../../components/Common/TextField';
import Select from '../../../components/Common/Select';
import DatePicker from '../../../components/Common/DatePicker';
import RadioButton, { RadioButtonGroup } from '../../../components/Common/RadioButton';
import Button from '../../../components/Common/Button';
import { TestScores as TestScoresType, TestScore } from '../../../types/application';
import { required, date, numeric, min, max } from '../../../utils/validationUtils';
import { colors, spacing, typography, shadows } from '../../../styles/variables';

// Interface for the component props
interface TestScoresProps {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  handleChange: (e: React.ChangeEvent<any>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  setFieldValue: (field: string, value: any) => void;
}

// Interface for a new test score being added
interface NewTestScore {
  test_type: string;
  test_date: string;
  scores: Record<string, number>;
}

// Styled components
const Container = styled(Box)`
  margin-bottom: ${spacing.lg};
`;

const SectionTitle = styled(Typography)`
  font-size: ${typography.fontSizes.h3};
  color: ${colors.neutralDark};
  margin-bottom: ${spacing.sm};
`;

const SectionDescription = styled(Typography)`
  font-size: ${typography.fontSizes.body1};
  color: ${colors.neutralMedium};
  margin-bottom: ${spacing.md};
`;

const TestScoreCard = styled(Card)`
  margin-bottom: ${spacing.md};
  background-color: ${colors.background.paper};
  box-shadow: ${shadows.sm};
`;

const ScoreFieldsContainer = styled(Grid)`
  margin-top: ${spacing.md};
`;

const AddButtonContainer = styled(Box)`
  margin-top: ${spacing.md};
  margin-bottom: ${spacing.md};
`;

/**
 * Returns the list of standardized test options for the dropdown
 */
const getTestTypeOptions = () => {
  return [
    { value: 'SAT', label: 'SAT' },
    { value: 'ACT', label: 'ACT' },
    { value: 'GRE', label: 'GRE' },
    { value: 'GMAT', label: 'GMAT' },
    { value: 'TOEFL', label: 'TOEFL' },
    { value: 'IELTS', label: 'IELTS' },
    { value: 'OTHER', label: 'Other' }
  ];
};

/**
 * Returns the appropriate score fields based on the selected test type
 */
const getScoreFields = (testType: string) => {
  switch(testType) {
    case 'SAT':
      return [
        { name: 'evidence_based_reading_writing', label: 'Evidence-Based Reading and Writing', min: 200, max: 800 },
        { name: 'math', label: 'Math', min: 200, max: 800 }
      ];
    case 'ACT':
      return [
        { name: 'english', label: 'English', min: 1, max: 36 },
        { name: 'math', label: 'Math', min: 1, max: 36 },
        { name: 'reading', label: 'Reading', min: 1, max: 36 },
        { name: 'science', label: 'Science', min: 1, max: 36 }
      ];
    case 'GRE':
      return [
        { name: 'verbal', label: 'Verbal Reasoning', min: 130, max: 170 },
        { name: 'quantitative', label: 'Quantitative Reasoning', min: 130, max: 170 },
        { name: 'analytical_writing', label: 'Analytical Writing', min: 0, max: 6 }
      ];
    case 'GMAT':
      return [
        { name: 'verbal', label: 'Verbal', min: 0, max: 60 },
        { name: 'quantitative', label: 'Quantitative', min: 0, max: 60 },
        { name: 'integrated_reasoning', label: 'Integrated Reasoning', min: 1, max: 8 },
        { name: 'analytical_writing', label: 'Analytical Writing', min: 0, max: 6 }
      ];
    case 'TOEFL':
      return [
        { name: 'reading', label: 'Reading', min: 0, max: 30 },
        { name: 'listening', label: 'Listening', min: 0, max: 30 },
        { name: 'speaking', label: 'Speaking', min: 0, max: 30 },
        { name: 'writing', label: 'Writing', min: 0, max: 30 }
      ];
    case 'IELTS':
      return [
        { name: 'reading', label: 'Reading', min: 0, max: 9 },
        { name: 'listening', label: 'Listening', min: 0, max: 9 },
        { name: 'speaking', label: 'Speaking', min: 0, max: 9 },
        { name: 'writing', label: 'Writing', min: 0, max: 9 }
      ];
    default:
      return [
        { name: 'total', label: 'Total Score', min: 0, max: 1000 }
      ];
  }
};

/**
 * Form step component for collecting standardized test scores as part of the application submission process.
 * This component allows applicants to indicate whether they've taken standardized tests,
 * and if so, add details for multiple test scores including test type, date, and section scores.
 */
const TestScores: React.FC<TestScoresProps> = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue
}) => {
  // State for new test score being added
  const [newScore, setNewScore] = useState<NewTestScore>({
    test_type: '',
    test_date: '',
    scores: {}
  });
  
  // State for tracking validation errors in the new score form
  const [newScoreErrors, setNewScoreErrors] = useState<Record<string, string>>({});
  
  // Reset score fields when test type changes
  useEffect(() => {
    if (newScore.test_type) {
      setNewScore(prev => ({
        ...prev,
        scores: {}
      }));
    }
  }, [newScore.test_type]);
  
  // Handle change in the radio button selection for whether the applicant has taken tests
  const handleHasTakenTestsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hasTakenTests = event.target.value === 'true';
    setFieldValue('test_scores.has_taken_tests', hasTakenTests);
    
    // If changing to "No", clear any existing scores
    if (!hasTakenTests && values.test_scores?.scores?.length > 0) {
      setFieldValue('test_scores.scores', []);
    }
  };
  
  // Handle change in the test type dropdown
  const handleTestTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setNewScore(prev => ({
      ...prev,
      test_type: event.target.value,
      scores: {}
    }));
  };
  
  // Handle change in the test date picker
  const handleTestDateChange = (date: string | null) => {
    setNewScore(prev => ({
      ...prev,
      test_date: date || ''
    }));
  };
  
  // Handle change in score input fields
  const handleScoreChange = (fieldName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    setNewScore(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [fieldName]: value ? Number(value) : ''
      }
    }));
  };
  
  // Validates the new test score before adding it to the list
  const validateNewScore = () => {
    const validationErrors: Record<string, string> = {};
    
    // Validate test type
    if (!newScore.test_type) {
      validationErrors.test_type = 'Test type is required';
    }
    
    // Validate test date
    if (!newScore.test_date) {
      validationErrors.test_date = 'Test date is required';
    } else if (date(newScore.test_date)) {
      validationErrors.test_date = date(newScore.test_date) as string;
    }
    
    // Validate score fields
    const scoreFields = getScoreFields(newScore.test_type);
    scoreFields.forEach(field => {
      const scoreValue = newScore.scores[field.name];
      
      // Check if score is provided
      if (scoreValue === undefined || scoreValue === '') {
        validationErrors[`scores.${field.name}`] = `${field.label} score is required`;
      } else {
        // Check if score is numeric and within range
        const numericError = numeric(scoreValue);
        if (numericError) {
          validationErrors[`scores.${field.name}`] = numericError;
        } else {
          const minError = min(scoreValue, field.min);
          if (minError) {
            validationErrors[`scores.${field.name}`] = minError;
          } else {
            const maxError = max(scoreValue, field.max);
            if (maxError) {
              validationErrors[`scores.${field.name}`] = maxError;
            }
          }
        }
      }
    });
    
    setNewScoreErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };
  
  // Adds the new test score to the list of scores
  const handleAddScore = () => {
    if (validateNewScore()) {
      // Get existing scores or initialize empty array
      const currentScores = values.test_scores?.scores || [];
      
      // Add new score to the array
      setFieldValue('test_scores.scores', [
        ...currentScores,
        newScore
      ]);
      
      // Reset the new score form
      setNewScore({
        test_type: '',
        test_date: '',
        scores: {}
      });
      
      // Clear any validation errors
      setNewScoreErrors({});
    }
  };
  
  // Removes a test score from the list of scores
  const handleRemoveScore = (index: number) => {
    const updatedScores = [...(values.test_scores?.scores || [])];
    updatedScores.splice(index, 1);
    setFieldValue('test_scores.scores', updatedScores);
  };
  
  return (
    <Container>
      <SectionTitle variant="h3">Test Scores</SectionTitle>
      <SectionDescription>
        Please indicate if you have taken any standardized tests and provide your scores.
      </SectionDescription>
      
      {/* Radio selection for whether tests have been taken */}
      <RadioButtonGroup
        name="test_scores.has_taken_tests"
        value={values.test_scores?.has_taken_tests ? "true" : "false"}
        onChange={handleChange}
        error={!!(errors['test_scores.has_taken_tests'] && touched['test_scores.has_taken_tests'])}
        errorMessage={touched['test_scores.has_taken_tests'] ? errors['test_scores.has_taken_tests'] : ''}
        helperText="Standardized test scores may be required for some programs."
        row
      >
        <RadioButton
          id="has-taken-tests-yes"
          name="test_scores.has_taken_tests"
          value="true"
          label="Yes"
          checked={values.test_scores?.has_taken_tests === true}
          onChange={handleHasTakenTestsChange}
        />
        <RadioButton
          id="has-taken-tests-no"
          name="test_scores.has_taken_tests"
          value="false"
          label="No"
          checked={values.test_scores?.has_taken_tests === false}
          onChange={handleHasTakenTestsChange}
        />
      </RadioButtonGroup>
      
      {/* Show test score form if "Yes" is selected */}
      {values.test_scores?.has_taken_tests && (
        <>
          {/* Display already added test scores */}
          {values.test_scores?.scores?.length > 0 && (
            <Box sx={{ mt: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Your Test Scores</Typography>
              
              {values.test_scores.scores.map((score: TestScore, index: number) => (
                <TestScoreCard key={index}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1">Test Type</Typography>
                        <Typography>{score.test_type}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="subtitle1">Test Date</Typography>
                        <Typography>{score.test_date}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <IconButton
                          onClick={() => handleRemoveScore(index)}
                          aria-label="Remove test score"
                          color="error"
                          sx={{ float: 'right' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {Object.entries(score.scores).map(([key, value]) => (
                        <Grid item xs={6} sm={3} key={key}>
                          <Typography variant="subtitle2">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography>{value}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </TestScoreCard>
              ))}
            </Box>
          )}
          
          {/* Form for adding a new test score */}
          <Box sx={{ mt: 3, p: 3, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Add Test Score</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Select
                  name="new_test_type"
                  label="Test Type"
                  value={newScore.test_type}
                  onChange={handleTestTypeChange}
                  options={getTestTypeOptions()}
                  error={!!newScoreErrors.test_type}
                  helperText={newScoreErrors.test_type}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  name="new_test_date"
                  label="Test Date"
                  value={newScore.test_date}
                  onChange={handleTestDateChange}
                  error={!!newScoreErrors.test_date}
                  helperText={newScoreErrors.test_date}
                  disableFuture
                  required
                />
              </Grid>
            </Grid>
            
            {/* Score fields based on selected test type */}
            {newScore.test_type && (
              <ScoreFieldsContainer container spacing={3}>
                {getScoreFields(newScore.test_type).map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field.name}>
                    <TextField
                      id={`new-score-${field.name}`}
                      name={`new_score_${field.name}`}
                      label={field.label}
                      value={newScore.scores[field.name] || ''}
                      onChange={(e) => handleScoreChange(field.name, e)}
                      type="number"
                      error={!!newScoreErrors[`scores.${field.name}`]}
                      helperText={
                        newScoreErrors[`scores.${field.name}`] || 
                        `Range: ${field.min}-${field.max}`
                      }
                      required
                      inputProps={{
                        min: field.min,
                        max: field.max
                      }}
                    />
                  </Grid>
                ))}
              </ScoreFieldsContainer>
            )}
            
            <AddButtonContainer>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddScore}
                disabled={!newScore.test_type}
                startIcon={<AddIcon />}
              >
                Add Test Score
              </Button>
            </AddButtonContainer>
          </Box>
        </>
      )}
    </Container>
  );
};

export default TestScores;