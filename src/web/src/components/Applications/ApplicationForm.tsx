import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.0
import { Box, Stepper, Step, StepLabel, Typography, Paper, Alert, useMediaQuery, useTheme } from '@mui/material'; // @mui/material ^5.11.0
import PersonalInformation from './FormSteps/PersonalInformation';
import ContactDetails from './FormSteps/ContactDetails';
import AcademicHistory from './FormSteps/AcademicHistory';
import TestScores from './FormSteps/TestScores';
import PersonalStatementForm from './FormSteps/PersonalStatement';
import Recommendations from './FormSteps/Recommendations';
import ReviewSubmit from './FormSteps/ReviewSubmit';
import Button from '../Common/Button';
import ProgressIndicator from '../Common/ProgressIndicator';
import useForm from '../../hooks/useForm';
import { ApplicationFormStep, ApplicationData } from '../../types/application';
import { createApplication, updateApplication, submitApplication } from '../../api/applications';

// Define constants for form steps and auto-save delay
const STEPS = [
  { key: ApplicationFormStep.PERSONAL_INFORMATION, label: 'Personal Information' },
  { key: ApplicationFormStep.CONTACT_DETAILS, label: 'Contact Details' },
  { key: ApplicationFormStep.ACADEMIC_HISTORY, label: 'Academic History' },
  { key: ApplicationFormStep.TEST_SCORES, label: 'Test Scores' },
  { key: ApplicationFormStep.PERSONAL_STATEMENT, label: 'Personal Statement' },
  { key: ApplicationFormStep.RECOMMENDATIONS, label: 'Recommendations' },
  { key: ApplicationFormStep.REVIEW_SUBMIT, label: 'Review & Submit' }
];
const AUTO_SAVE_DELAY = 2000;

// Define styled components for layout and styling
const FormContainer = styled(Box)`
  padding: ${props => props.theme.spacing(3)};
  margin: ${props => props.theme.spacing(2)} auto;
  max-width: 900px;
`;

const FormHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing(3)};
`;

const FormTitle = styled(Typography)`
  font-size: 2rem;
  font-weight: 500;
`;

const FormContent = styled(Paper)`
  padding: ${props => props.theme.spacing(3)};
  elevation: 2;
`;

const StepperContainer = styled(Box)`
  display: flex;
  justify-content: center;
  margin-bottom: ${props => props.theme.spacing(3)};
  ${props => props.theme.breakpoints.down('md')} {
    display: none;
  }
`;

const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-top: ${props => props.theme.spacing(4)};
`;

const SaveIndicator = styled(Typography)`
  font-style: italic;
  color: ${props => props.theme.palette.text.secondary};
`;

// Define the ApplicationFormProps interface
interface ApplicationFormProps {
  applicationId: number | null;
  initialData: ApplicationData | null;
  applicationType: string;
  academicTerm: string;
  academicYear: string;
  onSubmitSuccess: (application: any) => void;
  onCancel: () => void;
}

/**
 * Calculates the current progress percentage based on completed steps
 * @param currentStep The current step in the form
 * @param formValues The current form values
 * @param errors The current form errors
 * @returns Progress percentage (0-100)
 */
const calculateProgress = (
  currentStep: ApplicationFormStep,
  formValues: Record<string, any>,
  errors: Record<string, any>
): number => {
  const totalSteps = STEPS.length - 1; // Exclude Review & Submit step
  const stepIndex = STEPS.findIndex(step => step.key === currentStep);
  let baseProgress = (stepIndex / totalSteps) * 100;

  // Check if current step is complete (no errors in current section)
  const currentStepName = currentStep.replace('ApplicationFormStep.', '').toLowerCase();
  const hasErrorsInCurrentSection = Object.keys(errors).some(errorKey =>
    errorKey.startsWith(currentStepName)
  );

  // Adjust progress based on completion of current step
  if (!hasErrorsInCurrentSection) {
    baseProgress += (1 / totalSteps) * 100;
  }

  // Ensure progress is between 0 and 100
  return Math.min(Math.max(0, baseProgress), 100);
};

/**
 * Returns the validation schema for a specific form step
 * @param step The current form step
 * @returns Validation schema for the specified step
 */
const getStepValidationSchema = (step: ApplicationFormStep): Record<string, Function | Array<Function>> => {
  // Return appropriate validation schema for each step
  switch (step) {
    case ApplicationFormStep.PERSONAL_INFORMATION:
      return {
        'personal_information.first_name': required,
        'personal_information.last_name': required,
        'personal_information.date_of_birth': required,
        'personal_information.gender': required,
        'personal_information.citizenship': required,
      };
    case ApplicationFormStep.CONTACT_DETAILS:
      return {
        'contact_details.email': [required, email],
        'contact_details.phone_number': required,
        'contact_details.address_line1': required,
        'contact_details.city': required,
        'contact_details.state': required,
        'contact_details.postal_code': required,
        'contact_details.country': required,
      };
    case ApplicationFormStep.ACADEMIC_HISTORY:
      return {
        'academic_history.institutions': required,
      };
    case ApplicationFormStep.TEST_SCORES:
      return {
        'test_scores.has_taken_tests': required,
      };
    case ApplicationFormStep.PERSONAL_STATEMENT:
      return {
        'personal_statement.statement': [required],
      };
    case ApplicationFormStep.RECOMMENDATIONS:
      return {
        'recommendations.recommendations': required,
      };
    case ApplicationFormStep.REVIEW_SUBMIT:
      return {};
    default:
      return {};
  }
};

/**
 * Returns initial values for the application form
 * @param existingData The existing application data (if any)
 * @returns Initial form values
 */
const getInitialValues = (existingData: ApplicationData | null): ApplicationData => {
  // Define default empty values for all form sections
  const defaultValues: ApplicationData = {
    personal_information: {
      first_name: '',
      middle_name: null,
      last_name: '',
      date_of_birth: '',
      gender: '',
      citizenship: '',
      ssn: null,
    },
    contact_details: {
      email: '',
      phone_number: '',
      address_line1: '',
      address_line2: null,
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
    academic_history: {
      institutions: [],
    },
    test_scores: {
      has_taken_tests: false,
      scores: [],
    },
    personal_statement: {
      statement: '',
    },
    recommendations: {
      recommendations: [],
    },
  };

  // If existingData is provided, merge it with default values
  return existingData ? {
    ...defaultValues,
    ...existingData,
  } : defaultValues;
};

/**
 * Multi-step form component for application submission
 */
const ApplicationForm: React.FC<ApplicationFormProps> = ({
  applicationId,
  initialData,
  applicationType,
  academicTerm,
  academicYear,
  onSubmitSuccess,
  onCancel,
}) => {
  // Define state variables
  const [currentStep, setCurrentStep] = useState<ApplicationFormStep>(ApplicationFormStep.PERSONAL_INFORMATION);
  const [progress, setProgress] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Get theme and media query for responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Initialize form hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setFieldValue,
    validateForm,
    handleSubmit: handleFormSubmit,
  } = useForm({
    initialValues: getInitialValues(initialData),
    validationSchema: getStepValidationSchema(currentStep),
    onSubmit: handleSubmit,
  });

  // Update progress percentage when values or current step changes
  useEffect(() => {
    setProgress(calculateProgress(currentStep, values, errors));
  }, [values, currentStep, errors]);

  // Auto-save form data when values change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        handleSave();
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [values, touched]);

  /**
   * Advances to the next form step if current step is valid
   */
  const handleNextStep = () => {
    validateForm().then(validationErrors => {
      if (Object.keys(validationErrors).length === 0) {
        const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
        if (currentStepIndex < STEPS.length - 1) {
          setCurrentStep(STEPS[currentStepIndex + 1].key);
        }
      }
    });
  };

  /**
   * Returns to the previous form step
   */
  const handlePrevStep = () => {
    const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].key);
    }
  };

  /**
   * Saves the current form state to the server
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      let applicationIdToUse = applicationId;

      if (applicationId) {
        // Update existing application
        await updateApplication(applicationId, { application_data: values });
      } else {
        // Create new application
        const newApplication = await createApplication({
          application_type: applicationType,
          academic_term: academicTerm,
          academic_year: academicYear,
        });
        applicationIdToUse = newApplication.id;
        setFieldValue('id', newApplication.id);
      }

      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Error saving application:', err);
      setError(err.message || 'Failed to save application. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles final submission of the application
   */
  const handleSubmit = async (formData: ApplicationData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure application is saved before submitting
      if (!applicationId) {
        await handleSave();
      }

      // Submit the application
      await submitApplication(applicationId);

      // Call the success callback
      onSubmitSuccess(formData);
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles cancellation of the application form
   */
  const handleCancel = () => {
    onCancel();
  };

  /**
   * Renders the current form step component
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case ApplicationFormStep.PERSONAL_INFORMATION:
        return (
          <PersonalInformation
            values={values.personal_information}
            errors={errors}
            touched={touched}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
          />
        );
      case ApplicationFormStep.CONTACT_DETAILS:
        return (
          <ContactDetails
            values={values.contact_details}
            errors={errors}
            touched={touched}
            onChange={handleChange}
            handleBlur={handleBlur}
          />
        );
      case ApplicationFormStep.ACADEMIC_HISTORY:
        return (
          <AcademicHistory
            values={values}
            errors={errors}
            touched={touched}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
            isSubmitting={isSubmitting}
          />
        );
      case ApplicationFormStep.TEST_SCORES:
        return (
          <TestScores
            values={values}
            errors={errors}
            touched={touched}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
          />
        );
      case ApplicationFormStep.PERSONAL_STATEMENT:
        return (
          <PersonalStatementForm
            values={values.personal_statement}
            errors={errors}
            touched={touched}
            handleChange={handleChange}
            handleBlur={handleBlur}
            setFieldValue={setFieldValue}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
          />
        );
      case ApplicationFormStep.RECOMMENDATIONS:
        return (
          <Recommendations
            values={values.recommendations}
            errors={errors}
            touched={touched}
            onChange={setFieldValue}
            onBlur={handleBlur}
            applicationId={applicationId}
          />
        );
      case ApplicationFormStep.REVIEW_SUBMIT:
        return (
          <ReviewSubmit
            applicationId={applicationId}
            formData={values}
            onSubmit={handleFormSubmit}
            onBack={handlePrevStep}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <FormContainer>
      <FormHeader>
        <FormTitle variant="h5">
          {STEPS.find(step => step.key === currentStep)?.label}
        </FormTitle>
        {isMobile ? (
          <ProgressIndicator percentage={progress} />
        ) : (
          <StepperContainer>
            <Stepper activeStep={STEPS.findIndex(step => step.key === currentStep)} alternativeLabel>
              {STEPS.map(step => (
                <Step key={step.key}>
                  <StepLabel>{step.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </StepperContainer>
        )}
      </FormHeader>

      <FormContent>
        {renderCurrentStep()}
      </FormContent>

      <ButtonContainer>
        <Box>
          {currentStep !== ApplicationFormStep.PERSONAL_INFORMATION && (
            <Button variant="outlined" color="primary" onClick={handlePrevStep}>
              Back
            </Button>
          )}
        </Box>
        <Box>
          {lastSaved && (
            <SaveIndicator variant="caption">
              Last saved: {lastSaved.toLocaleTimeString()}
            </SaveIndicator>
          )}
          {currentStep !== ApplicationFormStep.REVIEW_SUBMIT ? (
            <Button variant="contained" color="primary" onClick={handleNextStep} disabled={isSubmitting}>
              Next
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleFormSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
          <Button variant="text" color="secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </Box>
      </ButtonContainer>
    </FormContainer>
  );
};

export default ApplicationForm;