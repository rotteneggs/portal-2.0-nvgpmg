import React from 'react';
import styled from '@emotion/styled';
import { Grid, Typography, Box } from '@mui/material';

import TextField from '../../Common/TextField';
import DatePicker from '../../Common/DatePicker';
import Select from '../../Common/Select';
import { required, minLength, maxLength, pattern } from '../../../utils/validationUtils';
import { PersonalInformation as PersonalInformationType } from '../../../types/application';
import { SelectOption } from '../../../types/common';

// Props interface for the PersonalInformation component
interface PersonalInformationProps {
  values: PersonalInformationType;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  handleChange: (e: React.ChangeEvent<any>) => void;
  handleBlur: (e: React.FocusEvent<any>) => void;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

// Styled components for form layout and presentation
const FormSection = styled(Box)`
  margin-bottom: 32px;
`;

const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
`;

/**
 * Returns the list of gender options for the dropdown
 * @returns Array of gender options with value and label properties
 */
const getGenderOptions = (): SelectOption[] => {
  return [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];
};

/**
 * Returns the list of country options for the citizenship dropdown
 * @returns Array of country options with value and label properties, organized by region
 */
const getCountryOptions = (): SelectOption[] => {
  return [
    // North America
    { value: 'us', label: 'United States', group: 'North America' },
    { value: 'ca', label: 'Canada', group: 'North America' },
    { value: 'mx', label: 'Mexico', group: 'North America' },
    
    // Europe
    { value: 'gb', label: 'United Kingdom', group: 'Europe' },
    { value: 'fr', label: 'France', group: 'Europe' },
    { value: 'de', label: 'Germany', group: 'Europe' },
    { value: 'es', label: 'Spain', group: 'Europe' },
    { value: 'it', label: 'Italy', group: 'Europe' },
    
    // Asia
    { value: 'cn', label: 'China', group: 'Asia' },
    { value: 'in', label: 'India', group: 'Asia' },
    { value: 'jp', label: 'Japan', group: 'Asia' },
    { value: 'kr', label: 'South Korea', group: 'Asia' },
    
    // Oceania
    { value: 'au', label: 'Australia', group: 'Oceania' },
    { value: 'nz', label: 'New Zealand', group: 'Oceania' },
    
    // South America
    { value: 'ar', label: 'Argentina', group: 'South America' },
    { value: 'br', label: 'Brazil', group: 'South America' },
    
    // Africa
    { value: 'eg', label: 'Egypt', group: 'Africa' },
    { value: 'ng', label: 'Nigeria', group: 'Africa' },
    { value: 'za', label: 'South Africa', group: 'Africa' }
  ];
};

/**
 * Form step component for collecting personal information from applicants
 * as part of the multi-step application process in the Student Admissions Enrollment Platform.
 * This component handles the first step of the application form, collecting essential
 * personal details like name, date of birth, gender, and citizenship.
 */
const PersonalInformation: React.FC<PersonalInformationProps> = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue
}) => {
  // Create a function to handle date picker blur events
  const handleDateBlur = () => {
    const syntheticEvent = {
      target: { name: 'date_of_birth' }
    };
    handleBlur(syntheticEvent as any);
  };

  return (
    <FormSection>
      <SectionTitle variant="h5">Personal Information</SectionTitle>
      <Typography variant="body2" sx={{ marginBottom: 2 }}>
        Please provide your personal information as it appears on official documents.
      </Typography>
      
      <Grid container spacing={2}>
        {/* First Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            id="first_name"
            name="first_name"
            label="First Name"
            value={values.first_name || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.first_name && Boolean(errors.first_name)}
            helperText={touched.first_name && errors.first_name ? errors.first_name : ''}
            required
            fullWidth
          />
        </Grid>
        
        {/* Middle Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            id="middle_name"
            name="middle_name"
            label="Middle Name"
            value={values.middle_name || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.middle_name && Boolean(errors.middle_name)}
            helperText={touched.middle_name && errors.middle_name ? errors.middle_name : ''}
            fullWidth
          />
        </Grid>
        
        {/* Last Name */}
        <Grid item xs={12} sm={6}>
          <TextField
            id="last_name"
            name="last_name"
            label="Last Name"
            value={values.last_name || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.last_name && Boolean(errors.last_name)}
            helperText={touched.last_name && errors.last_name ? errors.last_name : ''}
            required
            fullWidth
          />
        </Grid>
        
        {/* Date of Birth */}
        <Grid item xs={12} sm={6}>
          <DatePicker
            id="date_of_birth"
            name="date_of_birth"
            label="Date of Birth"
            value={values.date_of_birth || ''}
            onChange={(value) => setFieldValue('date_of_birth', value, true)}
            onBlur={handleDateBlur}
            error={touched.date_of_birth && Boolean(errors.date_of_birth)}
            helperText={touched.date_of_birth && errors.date_of_birth ? errors.date_of_birth : ''}
            required
            disableFuture
            fullWidth
          />
        </Grid>
        
        {/* Gender */}
        <Grid item xs={12} sm={6}>
          <Select
            id="gender"
            name="gender"
            label="Gender"
            value={values.gender || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={getGenderOptions()}
            error={touched.gender && Boolean(errors.gender)}
            helperText={touched.gender && errors.gender ? errors.gender : ''}
            required
            fullWidth
          />
        </Grid>
        
        {/* Citizenship */}
        <Grid item xs={12} sm={6}>
          <Select
            id="citizenship"
            name="citizenship"
            label="Citizenship"
            value={values.citizenship || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={getCountryOptions()}
            error={touched.citizenship && Boolean(errors.citizenship)}
            helperText={touched.citizenship && errors.citizenship ? errors.citizenship : ''}
            required
            fullWidth
          />
        </Grid>
        
        {/* SSN (Optional) */}
        <Grid item xs={12} sm={6}>
          <TextField
            id="ssn"
            name="ssn"
            label="Social Security Number (US Citizens Only)"
            value={values.ssn || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.ssn && Boolean(errors.ssn)}
            helperText={touched.ssn && errors.ssn ? errors.ssn : 'Format: XXX-XX-XXXX'}
            placeholder="XXX-XX-XXXX"
            fullWidth
          />
        </Grid>
      </Grid>
    </FormSection>
  );
};

export default PersonalInformation;