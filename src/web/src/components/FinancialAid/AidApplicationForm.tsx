import React, { useState, useEffect, useCallback } from 'react'; // react v18.0.0
import { Grid, Box, Typography, Divider, CircularProgress } from '@mui/material'; // @mui/material v5.11.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0

import Form from '../Common/Form';
import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Button from '../Common/Button';
import FileUploader from '../Common/FileUploader';
import FinancialAidService from '../../services/FinancialAidService';
import useForm from '../../hooks/useForm';
import useNotification from '../../hooks/useNotification';
import {
  FinancialAidType,
  FinancialAidDocumentType,
  FinancialData,
  FinancialAidApplication,
  CreateFinancialAidApplicationRequest,
  UpdateFinancialAidApplicationRequest,
  SelectOption
} from '../../types/financialAid';

/**
 * Interface defining the props for the AidApplicationForm component.
 */
interface AidApplicationFormProps {
  applicationId: number;
  initialData?: FinancialAidApplication | null;
  onSubmit: (application: FinancialAidApplication) => void;
  onCancel: () => void;
}

/**
 * Styled component for a section container within the form.
 */
const FormSection = styled(Box)`
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Styled component for a section title within the form.
 */
const SectionTitle = styled(Typography)`
  font-weight: bold;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Styled component for the document upload section.
 */
const DocumentSection = styled(Box)`
  border: 1px dashed #ccc;
  padding: ${({ theme }) => theme.spacing(2)};
  margin-bottom: ${({ theme }) => theme.spacing(3)};
`;

/**
 * Styled component for the progress indicator container.
 */
const ProgressContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

/**
 * A form component for creating and editing financial aid applications.
 */
const AidApplicationForm: React.FC<AidApplicationFormProps> = ({
  applicationId,
  initialData = null,
  onSubmit,
  onCancel,
}) => {
  // Initialize state variables
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [supportedAidTypes, setSupportedAidTypes] = useState<SelectOption[]>([]);

  // Initialize state for required documents and uploaded documents
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // Define validation schema for form fields
  const validationSchema = {
    aid_type: (value: any) => !value ? 'Aid Type is required' : undefined,
    household_income: (value: any) => !value ? 'Household Income is required' : undefined,
    household_size: (value: any) => !value ? 'Household Size is required' : undefined,
    dependents: (value: any) => !value ? 'Number of Dependents is required' : undefined,
  };

  // Define initial form values
  const initialValues = {
    aid_type: initialData?.aid_type || '',
    household_income: initialData?.financial_data?.household_income || '',
    household_size: initialData?.financial_data?.household_size || '',
    dependents: initialData?.financial_data?.dependents || '',
    has_other_financial_aid: initialData?.financial_data?.has_other_financial_aid || false,
    other_financial_aid_amount: initialData?.financial_data?.other_financial_aid_amount || '',
    special_circumstances: initialData?.financial_data?.special_circumstances || '',
  };

  // Custom hook for form state management and validation
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
  } = useForm({
    initialValues,
    validationSchema,
    onSubmit: async (formValues) => {
      setSubmitting(true);
      try {
        const financialData: FinancialData = {
          household_income: parseFloat(formValues.household_income),
          household_size: parseInt(formValues.household_size, 10),
          dependents: parseInt(formValues.dependents, 10),
          has_other_financial_aid: formValues.has_other_financial_aid,
          other_financial_aid_amount: parseFloat(formValues.other_financial_aid_amount),
          special_circumstances: formValues.special_circumstances,
          additional_information: {},
        };

        const requestData: CreateFinancialAidApplicationRequest | UpdateFinancialAidApplicationRequest = {
          application_id: applicationId,
          aid_type: formValues.aid_type,
          financial_data: financialData,
        };

        let newApplication: FinancialAidApplication;
        if (initialData) {
          newApplication = await FinancialAidService.updateFinancialAidApplicationWithProgress(
            initialData.id,
            requestData as UpdateFinancialAidApplicationRequest,
            (progress) => setUploadProgress(progress)
          );
        } else {
          newApplication = await FinancialAidService.createFinancialAidApplicationWithProgress(
            requestData as CreateFinancialAidApplicationRequest,
            (progress) => setUploadProgress(progress)
          );
        }
        onSubmit(newApplication);
      } catch (error) {
        console.error('Error submitting financial aid application:', error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Custom hook for displaying notifications
  const { displaySuccess, displayError } = useNotification();

  // Fetch supported aid types and required documents on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const aidTypes = await FinancialAidService.fetchSupportedAidTypes();
        setSupportedAidTypes(aidTypes.map(type => ({ value: type, label: type })));

        const documents = await FinancialAidService.fetchRequiredDocuments(applicationId);
        setRequiredDocuments(documents);
      } catch (error) {
        console.error('Error fetching data:', error);
        displayError('Failed to load required data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [applicationId, displayError]);

  // Handle document upload
  const handleDocumentUpload = useCallback(async (files: File[], documentType: string) => {
    if (files && files.length > 0) {
      try {
        setLoading(true);
        const uploadedDocument = await FinancialAidService.uploadFinancialAidDocumentWithProgress(
          initialData?.id || 0,
          files[0],
          documentType,
          (progress) => setUploadProgress(progress)
        );
        displaySuccess(`Document "${uploadedDocument.file_name}" uploaded successfully.`);
      } catch (error) {
        console.error('Error uploading document:', error);
        displayError('Failed to upload document.');
      } finally {
        setLoading(false);
      }
    }
  }, [initialData?.id, displaySuccess, displayError]);

  return (
    <Form title="Financial Aid Application" onSubmit={handleSubmit}>
      {loading && (
        <ProgressContainer>
          <CircularProgress />
        </ProgressContainer>
      )}
      <FormSection>
        <SectionTitle variant="h6">Financial Information</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Select
              name="aid_type"
              label="Aid Type"
              value={values.aid_type}
              onChange={handleChange}
              error={!!errors.aid_type}
              helperText={errors.aid_type}
              required
              options={supportedAidTypes}
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">Household Information</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              name="household_income"
              label="Household Income"
              value={values.household_income}
              onChange={handleChange}
              error={!!errors.household_income}
              helperText={errors.household_income}
              required
              type="number"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="household_size"
              label="Household Size"
              value={values.household_size}
              onChange={handleChange}
              error={!!errors.household_size}
              helperText={errors.household_size}
              required
              type="number"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="dependents"
              label="Number of Dependents"
              value={values.dependents}
              onChange={handleChange}
              error={!!errors.dependents}
              helperText={errors.dependents}
              required
              type="number"
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">Financial Details</SectionTitle>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="other_financial_aid_amount"
              label="Other Financial Aid Amount"
              value={values.other_financial_aid_amount}
              onChange={handleChange}
              type="number"
              helperText="If you receive other financial aid, please enter the amount."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="special_circumstances"
              label="Special Circumstances"
              value={values.special_circumstances}
              onChange={handleChange}
              multiline
              rows={4}
              helperText="Please describe any special circumstances that may affect your ability to pay for college."
            />
          </Grid>
        </Grid>
      </FormSection>

      <FormSection>
        <SectionTitle variant="h6">Document Upload</SectionTitle>
        <Grid container spacing={2}>
          {requiredDocuments.map((docType) => (
            <Grid item xs={12} key={docType}>
              <DocumentSection>
                <Typography variant="subtitle1">{docType}</Typography>
                <FileUploader
                  documentType={docType}
                  onFileSelect={(files) => handleDocumentUpload(files, docType)}
                  label={`Upload ${docType}`}
                  helperText={`Please upload a file for ${docType}.`}
                />
              </DocumentSection>
            </Grid>
          ))}
        </Grid>
      </FormSection>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          style={{ marginLeft: '10px' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </Box>
    </Form>
  );
};

export default AidApplicationForm;

// Define the props for the component
export interface AidApplicationFormProps {
  applicationId: number;
  initialData?: FinancialAidApplication | null;
  onSubmit: (application: FinancialAidApplication) => void;
  onCancel: () => void;
}