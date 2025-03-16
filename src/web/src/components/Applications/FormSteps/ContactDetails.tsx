import React from 'react';
import styled from '@emotion/styled';
import { Grid, Typography } from '@mui/material';
import countryList from 'country-list'; // country-list ^2.3.0
import statesList from 'states-list'; // states-list ^1.0.0

import TextField from '../../Common/TextField';
import Select from '../../Common/Select';
import Card from '../../Common/Card';
import { ContactDetails } from '../../../types/application';
import { SelectOption } from '../../../types/common';
import { 
  required, 
  email, 
  phoneNumber, 
  composeValidators 
} from '../../../utils/validationUtils';

// Define props interface for the ContactDetails component
interface ContactDetailsProps {
  values: ContactDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: any } }) => void;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// Generate country options for the dropdown
const getCountryOptions = (): SelectOption[] => {
  const countries = countryList.getData();
  return countries
    .map(country => ({
      value: country.code,
      label: country.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Generate state options for the dropdown
const getStateOptions = (): SelectOption[] => {
  const states = statesList.getStates();
  return states
    .map(state => ({
      value: state.abbreviation,
      label: state.name
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

// Format phone number as user types (XXX-XXX-XXXX)
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format as XXX-XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

// Styled components
const FormContainer = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled(Typography)`
  font-weight: 500;
  margin-bottom: 16px;
`;

const FieldsContainer = styled.div`
  padding: 16px;
`;

const AddressNote = styled(Typography)`
  color: #757575;
  font-size: 12px;
  margin-top: 8px;
  margin-bottom: 16px;
`;

/**
 * Form step component for collecting contact information from applicants
 * Implements the contact details section of the multi-step application form
 */
const ContactDetails: React.FC<ContactDetailsProps> = ({
  values,
  onChange,
  errors,
  touched,
  onBlur
}) => {
  // Handle phone number formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange({
      target: {
        name: e.target.name,
        value: formatted
      }
    });
  };

  return (
    <FormContainer>
      <Card>
        <FieldsContainer>
          <Grid container spacing={2}>
            {/* Email and Phone */}
            <Grid item xs={12} sm={6}>
              <TextField
                id="email"
                name="email"
                label="Email Address"
                value={values.email || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.email ? errors.email : ''}
                required
                fullWidth
                autoComplete="email"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="phone_number"
                name="phone_number"
                label="Phone Number"
                value={values.phone_number || ''}
                onChange={handlePhoneChange}
                onBlur={onBlur}
                error={touched.phone_number ? errors.phone_number : ''}
                required
                fullWidth
                placeholder="XXX-XXX-XXXX"
                autoComplete="tel"
              />
            </Grid>
            
            {/* Address Information */}
            <Grid item xs={12}>
              <SectionTitle variant="h6">Mailing Address</SectionTitle>
              <AddressNote variant="body2">
                Please provide your current mailing address. This will be used for all official correspondence.
              </AddressNote>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                id="address_line1"
                name="address_line1"
                label="Address Line 1"
                value={values.address_line1 || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.address_line1 ? errors.address_line1 : ''}
                required
                fullWidth
                autoComplete="address-line1"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                id="address_line2"
                name="address_line2"
                label="Address Line 2 (Optional)"
                value={values.address_line2 || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.address_line2 ? errors.address_line2 : ''}
                fullWidth
                autoComplete="address-line2"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                id="city"
                name="city"
                label="City"
                value={values.city || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.city ? errors.city : ''}
                required
                fullWidth
                autoComplete="address-level2"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Select
                id="state"
                name="state"
                label="State/Province"
                value={values.state || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.state && !!errors.state}
                helperText={errors.state || ''}
                options={getStateOptions()}
                required
                fullWidth
                autoComplete="address-level1"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                id="postal_code"
                name="postal_code"
                label="Postal Code"
                value={values.postal_code || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.postal_code ? errors.postal_code : ''}
                required
                fullWidth
                autoComplete="postal-code"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Select
                id="country"
                name="country"
                label="Country"
                value={values.country || ''}
                onChange={onChange}
                onBlur={onBlur}
                error={touched.country && !!errors.country}
                helperText={errors.country || ''}
                options={getCountryOptions()}
                required
                fullWidth
                autoComplete="country"
              />
            </Grid>
          </Grid>
        </FieldsContainer>
      </Card>
    </FormContainer>
  );
};

export default ContactDetails;