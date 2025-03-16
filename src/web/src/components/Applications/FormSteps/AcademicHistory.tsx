import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

import TextField from '../../Common/TextField';
import Select from '../../Common/Select';
import DatePicker from '../../Common/DatePicker';
import Button from '../../Common/Button';
import { AcademicHistory as AcademicHistoryType } from '../../../types/application';
import {
  required,
  minLength,
  maxLength,
  min,
  max,
} from '../../../utils/validationUtils';
import {
  isDateAfter,
  isDateBefore,
  formatDate,
} from '../../../utils/dateUtils';
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from '../../../styles/variables';

// Define the props interface for the component
interface AcademicHistoryProps {
  values: any;
  errors: any;
  touched: any;
  handleChange: (e: React.ChangeEvent<any>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  isSubmitting: boolean;
}

// Define the interface for each institution entry
interface Institution {
  name: string;
  city: string;
  state: string;
  country: string;
  start_date: string;
  end_date: string;
  degree: string | null;
  major: string | null;
  gpa: number | null;
}

// Styled components
const SectionTitle = styled(Typography)`
  margin-bottom: ${spacing.md};
  font-weight: ${typography.fontWeights.medium};
  color: ${colors.neutralDark};
`;

const InstitutionCard = styled(Card)`
  margin-bottom: ${spacing.lg};
  border: 1px solid ${colors.border.light};
  box-shadow: ${shadows.sm};
  border-radius: ${borderRadius.md};
`;

const CardHeader = styled(Box)`
  background-color: ${colors.primaryLight};
  padding: ${spacing.sm} ${spacing.md};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: ${borderRadius.md};
  border-top-right-radius: ${borderRadius.md};
`;

const AddButton = styled(Button)`
  margin-top: ${spacing.md};
`;

const RemoveButton = styled(IconButton)`
  color: ${colors.white};
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const InstructionText = styled(Typography)`
  margin-bottom: ${spacing.md};
  color: ${colors.neutralMedium};
  font-size: ${typography.fontSizes.body2};
`;

// Validation functions
const validateDates = (endDate: string, startDate: string): string | undefined => {
  if (!endDate || !startDate) {
    return undefined; // Both dates must be provided for validation
  }
  
  if (!isDateAfter(endDate, startDate)) {
    return 'End date must be after start date';
  }
  
  return undefined;
};

const validateGPA = (gpa: number | string | null): string | undefined => {
  if (gpa === null || gpa === '') {
    return undefined; // GPA is optional
  }
  
  const numGpa = typeof gpa === 'string' ? parseFloat(gpa) : gpa;
  
  if (isNaN(numGpa as number) || numGpa < 0 || numGpa > 4.0) {
    return 'GPA must be between 0 and 4.0';
  }
  
  return undefined;
};

const AcademicHistory: React.FC<AcademicHistoryProps> = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  isSubmitting,
}) => {
  // State for dropdown options
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([
    { value: 'USA', label: 'United States' },
    { value: 'CAN', label: 'Canada' },
    { value: 'GBR', label: 'United Kingdom' },
    { value: 'AUS', label: 'Australia' },
    { value: 'DEU', label: 'Germany' },
    { value: 'FRA', label: 'France' },
    { value: 'JPN', label: 'Japan' },
    { value: 'CHN', label: 'China' },
    { value: 'IND', label: 'India' },
    // Additional countries would be loaded from API or config
  ]);
  
  const [states, setStates] = useState<Array<{ value: string; label: string }>>([
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    // Additional states would be loaded from API or config
  ]);
  
  const [degrees, setDegrees] = useState<Array<{ value: string; label: string }>>([
    { value: 'high_school', label: 'High School Diploma' },
    { value: 'associate', label: 'Associate\'s Degree' },
    { value: 'bachelor', label: 'Bachelor\'s Degree' },
    { value: 'master', label: 'Master\'s Degree' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'certificate', label: 'Certificate/Diploma' },
    { value: 'other', label: 'Other' },
  ]);
  
  // Ensure there's at least one institution entry when component mounts
  useEffect(() => {
    if (!values.academic_history || !values.academic_history.institutions || values.academic_history.institutions.length === 0) {
      setFieldValue('academic_history', {
        institutions: [
          {
            name: '',
            city: '',
            state: '',
            country: 'USA', // Default to USA
            start_date: '',
            end_date: '',
            degree: null,
            major: null,
            gpa: null,
          },
        ],
      });
    }
  }, [values.academic_history, setFieldValue]);
  
  // Handler to add a new institution
  const handleAddInstitution = () => {
    const newInstitution: Institution = {
      name: '',
      city: '',
      state: '',
      country: 'USA', // Default to USA
      start_date: '',
      end_date: '',
      degree: null,
      major: null,
      gpa: null,
    };
    
    const updatedInstitutions = [
      ...values.academic_history.institutions,
      newInstitution,
    ];
    
    setFieldValue('academic_history.institutions', updatedInstitutions);
  };
  
  // Handler to remove an institution
  const handleRemoveInstitution = (index: number) => {
    const updatedInstitutions = [...values.academic_history.institutions];
    updatedInstitutions.splice(index, 1);
    setFieldValue('academic_history.institutions', updatedInstitutions);
  };
  
  // Handler for institution field changes
  const handleInstitutionChange = (index: number, field: string, value: any) => {
    setFieldValue(`academic_history.institutions[${index}].${field}`, value);
  };
  
  return (
    <Box>
      <SectionTitle variant="h5">Academic History</SectionTitle>
      
      <InstructionText>
        Please list all schools you have attended, starting with the most recent.
        Include high school, undergraduate, and graduate institutions.
      </InstructionText>
      
      {values.academic_history && values.academic_history.institutions && values.academic_history.institutions.map((institution: Institution, index: number) => (
        <InstitutionCard key={`institution-${index}`}>
          <CardHeader>
            <Typography variant="subtitle1" color="white">
              {institution.name || `Institution ${index + 1}`}
            </Typography>
            {values.academic_history.institutions.length > 1 && (
              <RemoveButton
                onClick={() => handleRemoveInstitution(index)}
                disabled={isSubmitting}
                aria-label="Remove institution"
              >
                <Delete />
              </RemoveButton>
            )}
          </CardHeader>
          
          <CardContent>
            <Grid container spacing={2}>
              {/* Institution Name */}
              <Grid item xs={12}>
                <TextField
                  id={`academic_history.institutions[${index}].name`}
                  name={`academic_history.institutions[${index}].name`}
                  label="Institution Name"
                  value={institution.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.academic_history?.institutions?.[index]?.name &&
                    errors.academic_history?.institutions?.[index]?.name
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.name &&
                    errors.academic_history?.institutions?.[index]?.name
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              {/* Location Fields */}
              <Grid item xs={12} md={6}>
                <TextField
                  id={`academic_history.institutions[${index}].city`}
                  name={`academic_history.institutions[${index}].city`}
                  label="City"
                  value={institution.city}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.academic_history?.institutions?.[index]?.city &&
                    errors.academic_history?.institutions?.[index]?.city
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.city &&
                    errors.academic_history?.institutions?.[index]?.city
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Select
                  name={`academic_history.institutions[${index}].state`}
                  label="State/Province"
                  value={institution.state}
                  onChange={(e) =>
                    handleInstitutionChange(index, 'state', e.target.value)
                  }
                  onBlur={handleBlur}
                  options={states}
                  error={
                    touched.academic_history?.institutions?.[index]?.state &&
                    Boolean(errors.academic_history?.institutions?.[index]?.state)
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.state &&
                    errors.academic_history?.institutions?.[index]?.state
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12}>
                <Select
                  name={`academic_history.institutions[${index}].country`}
                  label="Country"
                  value={institution.country}
                  onChange={(e) =>
                    handleInstitutionChange(index, 'country', e.target.value)
                  }
                  onBlur={handleBlur}
                  options={countries}
                  error={
                    touched.academic_history?.institutions?.[index]?.country &&
                    Boolean(errors.academic_history?.institutions?.[index]?.country)
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.country &&
                    errors.academic_history?.institutions?.[index]?.country
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              {/* Date Range Fields */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  name={`academic_history.institutions[${index}].start_date`}
                  label="Start Date"
                  value={institution.start_date}
                  onChange={(value) =>
                    handleInstitutionChange(index, 'start_date', value)
                  }
                  onBlur={handleBlur}
                  error={
                    touched.academic_history?.institutions?.[index]?.start_date &&
                    Boolean(errors.academic_history?.institutions?.[index]?.start_date)
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.start_date &&
                    errors.academic_history?.institutions?.[index]?.start_date
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                  disableFuture
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  name={`academic_history.institutions[${index}].end_date`}
                  label="End Date"
                  value={institution.end_date}
                  onChange={(value) =>
                    handleInstitutionChange(index, 'end_date', value)
                  }
                  onBlur={handleBlur}
                  error={
                    (touched.academic_history?.institutions?.[index]?.end_date &&
                      errors.academic_history?.institutions?.[index]?.end_date) ||
                    (touched.academic_history?.institutions?.[index]?.end_date &&
                      institution.start_date &&
                      institution.end_date &&
                      Boolean(validateDates(institution.end_date, institution.start_date)))
                  }
                  helperText={
                    (touched.academic_history?.institutions?.[index]?.end_date &&
                      errors.academic_history?.institutions?.[index]?.end_date) ||
                    (touched.academic_history?.institutions?.[index]?.end_date &&
                      institution.start_date &&
                      institution.end_date &&
                      validateDates(institution.end_date, institution.start_date))
                  }
                  required
                  disabled={isSubmitting}
                  fullWidth
                  disableFuture
                />
              </Grid>
              
              {/* Degree & Major Fields */}
              <Grid item xs={12} md={6}>
                <Select
                  name={`academic_history.institutions[${index}].degree`}
                  label="Degree"
                  value={institution.degree || ''}
                  onChange={(e) =>
                    handleInstitutionChange(index, 'degree', e.target.value)
                  }
                  onBlur={handleBlur}
                  options={degrees}
                  error={
                    touched.academic_history?.institutions?.[index]?.degree &&
                    Boolean(errors.academic_history?.institutions?.[index]?.degree)
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.degree &&
                    errors.academic_history?.institutions?.[index]?.degree
                  }
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  id={`academic_history.institutions[${index}].major`}
                  name={`academic_history.institutions[${index}].major`}
                  label="Major/Field of Study"
                  value={institution.major || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.academic_history?.institutions?.[index]?.major &&
                    errors.academic_history?.institutions?.[index]?.major
                  }
                  helperText={
                    touched.academic_history?.institutions?.[index]?.major &&
                    errors.academic_history?.institutions?.[index]?.major
                  }
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
              
              {/* GPA Field */}
              <Grid item xs={12} md={6}>
                <TextField
                  id={`academic_history.institutions[${index}].gpa`}
                  name={`academic_history.institutions[${index}].gpa`}
                  label="GPA (4.0 Scale)"
                  value={institution.gpa || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    (touched.academic_history?.institutions?.[index]?.gpa &&
                      errors.academic_history?.institutions?.[index]?.gpa) ||
                    (touched.academic_history?.institutions?.[index]?.gpa &&
                      institution.gpa !== null &&
                      institution.gpa !== '' &&
                      Boolean(validateGPA(institution.gpa)))
                  }
                  helperText={
                    (touched.academic_history?.institutions?.[index]?.gpa &&
                      errors.academic_history?.institutions?.[index]?.gpa) ||
                    (touched.academic_history?.institutions?.[index]?.gpa &&
                      institution.gpa !== null &&
                      institution.gpa !== '' &&
                      validateGPA(institution.gpa))
                  }
                  type="number"
                  inputProps={{ step: 0.01, min: 0, max: 4.0 }}
                  disabled={isSubmitting}
                  fullWidth
                />
              </Grid>
            </Grid>
          </CardContent>
          
          {index < values.academic_history.institutions.length - 1 && <Divider />}
        </InstitutionCard>
      ))}
      
      <AddButton
        variant="outlined"
        color="primary"
        startIcon={<Add />}
        onClick={handleAddInstitution}
        disabled={isSubmitting}
        fullWidth
      >
        Add Another Institution
      </AddButton>
    </Box>
  );
};

export default AcademicHistory;