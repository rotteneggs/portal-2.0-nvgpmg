import React from 'react';
import styled from '@emotion/styled';
import { Box, Paper, Typography, Alert } from '@mui/material';
import useForm from '../../hooks/useForm';
import { FormErrors } from '../../types/common';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the Form component
 */
export interface FormProps {
  initialValues: Record<string, any>;
  validationSchema?: Record<string, Function | Array<Function>>;
  onSubmit: (values: any, formHelpers: { setSubmitting: (isSubmitting: boolean) => void }) => void | Promise<void>;
  children: React.ReactNode | ((formProps: FormContextProps) => React.ReactNode);
  title?: string;
  className?: string;
  id?: string;
  noValidate?: boolean;
  autoComplete?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showErrorSummary?: boolean;
}

/**
 * Context props passed to form children
 */
export interface FormContextProps {
  values: Record<string, any>;
  errors: FormErrors<any>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string | undefined) => void;
  setFieldTouched: (field: string, isTouched?: boolean) => void;
  resetForm: () => void;
}

// Styled components
const FormContainer = styled(Paper)`
  padding: ${spacing.lg};
  margin-bottom: ${spacing.lg};
  border-radius: 4px;
  background-color: ${colors.white};
  border: 1px solid ${colors.neutralLight};
`;

const FormTitle = styled(Typography)`
  margin-bottom: ${spacing.md};
  font-weight: 500;
  color: ${colors.neutralDark};
`;

const FormContent = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${spacing.md};
`;

const ErrorSummary = styled(Alert)`
  margin-bottom: ${spacing.md};
  color: ${colors.text.onPrimary};
  background-color: ${colors.error};
`;

/**
 * A reusable form component that provides consistent styling and behavior for forms across the application
 * 
 * Features:
 * - Integrates with useForm hook for form state management and validation
 * - Provides consistent styling and layout following the design system
 * - Handles accessible error display and form validation
 * - Supports both direct children and render prop pattern
 */
const Form: React.FC<FormProps> = ({
  initialValues = {},
  validationSchema,
  onSubmit,
  children,
  title,
  className,
  id,
  noValidate = true,
  autoComplete = 'off',
  validateOnChange = true,
  validateOnBlur = true,
  showErrorSummary = true,
  ...props
}) => {
  // Use the useForm hook to manage form state and validation
  const formMethods = useForm({
    initialValues,
    validationSchema,
    onSubmit,
    validateOnChange,
    validateOnBlur,
  });

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    handleSubmit,
  } = formMethods;

  // Form context to pass to children
  const formContext: FormContextProps = {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
  };

  // Get visible errors (only for touched fields)
  const touchedFieldErrors = Object.entries(errors)
    .filter(([field]) => touched[field])
    .map(([field, error]) => ({ field, error }));
  
  const hasVisibleErrors = touchedFieldErrors.length > 0;

  // Generate a unique ID for the error summary
  const errorSummaryId = id ? `${id}-errors` : 'form-errors';

  // Render children either as a function with form context or directly
  const renderChildren = () => {
    if (typeof children === 'function') {
      return children(formContext);
    }

    // Clone React elements to pass form context as props
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }
      
      // Pass form context props to the child element
      return React.cloneElement(child, formContext);
    });
  };

  return (
    <FormContainer className={className} elevation={1}>
      {title && (
        <FormTitle variant="h5" component="h2" id={id ? `${id}-title` : undefined}>
          {title}
        </FormTitle>
      )}
      
      {/* Display error summary if enabled and there are visible errors */}
      {showErrorSummary && hasVisibleErrors && (
        <ErrorSummary 
          severity="error"
          role="alert"
          aria-live="polite"
          id={errorSummaryId}
        >
          <Typography variant="body2" component="div">
            Please correct the following errors:
          </Typography>
          <ul>
            {touchedFieldErrors.map(({ field, error }, index) => (
              <li key={field || index}>
                <span id={`error-${field}`}>{error}</span>
              </li>
            ))}
          </ul>
        </ErrorSummary>
      )}
      
      <form
        id={id}
        onSubmit={handleSubmit}
        noValidate={noValidate}
        autoComplete={autoComplete}
        aria-labelledby={title && id ? `${id}-title` : undefined}
        aria-describedby={hasVisibleErrors && showErrorSummary ? errorSummaryId : undefined}
        {...props}
      >
        <FormContent>
          {renderChildren()}
        </FormContent>
      </form>
    </FormContainer>
  );
};

export default Form;