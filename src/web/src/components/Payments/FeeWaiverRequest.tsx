import React, { useState, useCallback } from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.5
import { Box, Typography, Paper, Divider, CircularProgress } from '@mui/material'; // @mui/material v5.11.0
import Form from '../Common/Form';
import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Button from '../Common/Button';
import FileUploader from '../Common/FileUploader';
import FinancialAidService from '../../services/FinancialAidService';
import useNotification from '../../hooks/useNotification';
import { FeeWaiverRequestProps, FeeWaiverFormValues } from '../../types/financialAid';
import { FinancialAidType, FinancialAidDocumentType } from '../../types/financialAid';

// Styled Components
const StyledContainer = styled(Box)`
  padding: 24px;
`;

const FormSection = styled(Box)`
  margin-bottom: 24px;
`;

const SectionTitle = styled(Typography)`
  margin-bottom: 12px;
`;

const SectionDescription = styled(Typography)`
  font-size: 0.875rem;
  color: #757575;
`;

const DocumentUploadSection = styled(Box)`
  border: 1px dashed #bdbdbd;
  padding: 16px;
  border-radius: 4px;
`;

/**
 * Component for requesting fee waivers for application fees
 */
const FeeWaiverRequest: React.FC<FeeWaiverRequestProps> = ({
  applicationId,
  onRequestComplete,
  className
}) => {
  // State variables
  const [loading, setLoading] = useState<boolean>(false);
  const [supportedAidTypes, setSupportedAidTypes] = useState<string[]>([]);
  const { showSuccess, showError } = useNotification();

  // Fetch supported aid types on component mount
  React.useEffect(() => {
    const fetchAidTypes = async () => {
      try {
        const aidTypes = await FinancialAidService.fetchSupportedAidTypes();
        setSupportedAidTypes(aidTypes);
      } catch (error: any) {
        showError(`Failed to fetch supported aid types: ${error.message}`);
      }
    };

    fetchAidTypes();
  }, [showError]);

  // Form submission handler
  const handleSubmit = useCallback(async (values: FeeWaiverFormValues) => {
    setLoading(true);
    try {
      // Create financial aid application with NEED_BASED type
      const financialAidApplication = await FinancialAidService.createFinancialAidApplicationWithProgress({
        application_id: applicationId,
        aid_type: FinancialAidType.NEED_BASED,
        financial_data: {
          household_income: values.household_income,
          household_size: values.household_size,
          dependents: values.dependents,
          has_other_financial_aid: values.has_other_financial_aid,
          other_financial_aid_amount: values.other_financial_aid_amount || null,
          special_circumstances: values.special_circumstances,
          additional_information: {}
        }
      });

      // Upload supporting documents if provided
      await handleFileUpload([], FinancialAidDocumentType.TAX_RETURN, financialAidApplication.id);
      await handleFileUpload([], FinancialAidDocumentType.FINANCIAL_STATEMENT, financialAidApplication.id);

      // Show success notification
      showSuccess('Fee waiver request submitted successfully!');

      // Call onRequestComplete callback
      onRequestComplete();
    } catch (error: any) {
      showError(`Failed to submit fee waiver request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [applicationId, onRequestComplete, showSuccess, showError]);

  // File upload handler
  const handleFileUpload = useCallback(async (files: File[], documentType: string, financialAidApplicationId: number) => {
    try {
      for (const file of files) {
        await FinancialAidService.uploadFinancialAidDocumentWithProgress(
          financialAidApplicationId,
          file,
          documentType,
          (progress) => {
            // Track upload progress (optional)
            console.log(`Uploading ${documentType}: ${progress}%`);
          }
        );
      }
    } catch (error: any) {
      showError(`Failed to upload ${documentType}: ${error.message}`);
    }
  }, [showError]);

  return (
    <StyledContainer className={className}>
      <Typography variant="h6" component="h3">
        Request Fee Waiver
      </Typography>
      <Typography variant="body2" color="textSecondary">
        To request a fee waiver, please provide the following information about your household income and size.
      </Typography>
      <Form
        initialValues={{
          household_income: 0,
          household_size: 1,
          dependents: 0,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: ''
        }}
        validationSchema={{
          household_income: ["required('Household income is required')", "number().min(0, 'Income must be a positive number')"],
          household_size: ["required('Household size is required')", "number().min(1, 'Household size must be at least 1').integer('Must be a whole number')"],
          dependents: ["number().min(0, 'Dependents must be a positive number').integer('Must be a whole number')"],
          special_circumstances: ["string().max(1000, 'Limited to 1000 characters')"]
        }}
        onSubmit={handleSubmit}
      >
        <FormSection>
          <SectionTitle variant="subtitle1">Household Information</SectionTitle>
          <SectionDescription variant="body2">
            Please provide information about your household income and size.
          </SectionDescription>
          <TextField
            name="household_income"
            label="Household Income"
            type="number"
            required
          />
          <TextField
            name="household_size"
            label="Household Size"
            type="number"
            required
          />
          <TextField
            name="dependents"
            label="Number of Dependents"
            type="number"
          />
        </FormSection>
        <Divider />
        <FormSection>
          <SectionTitle variant="subtitle1">Special Circumstances</SectionTitle>
          <SectionDescription variant="body2">
            If you have any special circumstances that affect your ability to pay the application fee, please describe them below.
          </SectionDescription>
          <TextField
            name="special_circumstances"
            label="Special Circumstances"
            multiline
            rows={4}
            placeholder="Describe any special circumstances..."
          />
        </FormSection>
        <Divider />
        <FormSection>
          <SectionTitle variant="subtitle1">Supporting Documents</SectionTitle>
          <SectionDescription variant="body2">
            Please upload supporting documents to verify your financial need.
          </SectionDescription>
          <DocumentUploadSection>
            <FileUploader
              onFileSelect={(files) => handleFileUpload(files, FinancialAidDocumentType.TAX_RETURN, 0)}
              acceptedFileTypes={['application/pdf', 'image/jpeg', 'image/png']}
              maxFileSize={10 * 1024 * 1024}
              label="Upload Tax Return"
              helperText="Accepted formats: PDF, JPG, PNG (Max 10MB)"
            />
            <FileUploader
              onFileSelect={(files) => handleFileUpload(files, FinancialAidDocumentType.FINANCIAL_STATEMENT, 0)}
              acceptedFileTypes={['application/pdf', 'image/jpeg', 'image/png']}
              maxFileSize={10 * 1024 * 1024}
              label="Upload Financial Statement"
              helperText="Accepted formats: PDF, JPG, PNG (Max 10MB)"
            />
          </DocumentUploadSection>
        </FormSection>
        <Button type="submit" disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Request'}
        </Button>
      </Form>
    </StyledContainer>
  );
};

export default FeeWaiverRequest;