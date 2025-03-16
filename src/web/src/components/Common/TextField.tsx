import React from 'react';
import styled from '@emotion/styled';
import { 
  TextField as MuiTextField, 
  InputAdornment, 
  FormHelperText, 
  IconButton,
  TextFieldProps as MuiTextFieldProps
} from '@mui/material';
import { 
  colors, 
  spacing, 
  transitions, 
  borderRadius, 
  typography 
} from '../../styles/variables';
import { focusOutline, inputStyle } from '../../styles/mixins';

/**
 * Props interface for the TextField component.
 * Extends the Material-UI TextField props with custom properties.
 */
export interface TextFieldProps extends Omit<MuiTextFieldProps, 'error'> {
  /** Unique identifier for the input field */
  id?: string;
  /** Name attribute for the input field */
  name?: string;
  /** Text label for the input field */
  label?: string;
  /** Current value of the input field */
  value?: string | number;
  /** Input type (text, password, email, number, etc.) */
  type?: string;
  /** Placeholder text when field is empty */
  placeholder?: string;
  /** Helper text displayed below the input field */
  helperText?: string;
  /** Boolean or string indicating error state and message */
  error?: boolean | string;
  /** Boolean to disable the input field */
  disabled?: boolean;
  /** Boolean indicating if the field is required */
  required?: boolean;
  /** Boolean to make the field take full width of container */
  fullWidth?: boolean;
  /** HTML autocomplete attribute */
  autoComplete?: string;
  /** Boolean to automatically focus the field on mount */
  autoFocus?: boolean;
  /** Boolean to enable multiline input (textarea) */
  multiline?: boolean;
  /** Number of rows for multiline input */
  rows?: number;
  /** Maximum number of rows for multiline input */
  maxRows?: number;
  /** Content to display at the start of the input */
  startAdornment?: React.ReactNode;
  /** Content to display at the end of the input */
  endAdornment?: React.ReactNode;
  /** Function called when input value changes */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Function called when input loses focus */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Function called when input gains focus */
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Additional CSS class to apply to the field */
  className?: string;
  /** Props applied to the input element */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
  /** Props applied to the Input component */
  InputProps?: object;
}

/**
 * Styled Material-UI TextField with custom design system styles
 */
const StyledTextField = styled(MuiTextField)`
  margin-bottom: ${spacing.sm};

  & .MuiInputBase-root {
    background-color: ${colors.white};
    border-radius: ${borderRadius.sm};
    transition: ${transitions.default};
    
    &.Mui-focused {
      ${focusOutline};
    }
    
    &.Mui-error {
      border-color: ${colors.error};
    }
    
    &.Mui-disabled {
      background-color: ${colors.neutralLight};
      color: ${colors.neutralMedium};
    }
  }
  
  & .MuiInputBase-input {
    padding: ${spacing.xs} ${spacing.sm};
    font-size: ${typography.fontSizes.body1};
    
    &::placeholder {
      color: ${colors.neutralMedium};
      opacity: 0.7;
    }
  }
  
  & .MuiFormLabel-root {
    color: ${colors.neutralDark};
    font-size: ${typography.fontSizes.body2};
    
    &.Mui-focused {
      color: ${colors.primary};
    }
    
    &.Mui-error {
      color: ${colors.error};
    }
    
    &.Mui-disabled {
      color: ${colors.neutralMedium};
    }
  }
  
  & .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.neutralLight};
    transition: ${transitions.default};
  }
  
  & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.neutralMedium};
  }
  
  & .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.primary};
    border-width: 2px;
  }
  
  & .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.error};
  }
`;

/**
 * Container for helper text and error messages
 */
const HelperTextContainer = styled(FormHelperText)`
  margin-left: ${spacing.xs};
  font-size: ${typography.fontSizes.small};
  min-height: 1.25rem; /* Maintain consistent height even when empty */
  
  &.Mui-error {
    color: ${colors.error};
  }
`;

/**
 * Required field indicator (asterisk)
 */
const RequiredIndicator = styled.span`
  color: ${colors.error};
  margin-left: ${spacing.xs};
`;

/**
 * A customizable text input component that implements the design system's form field styles and behaviors.
 * Extends Material-UI's TextField with application-specific styling, validation states, and accessibility features.
 */
const TextField: React.FC<TextFieldProps> = ({
  id,
  name,
  label,
  value,
  type = 'text',
  placeholder,
  helperText,
  error,
  disabled = false,
  required = false,
  fullWidth = true,
  autoComplete = 'off',
  autoFocus = false,
  multiline = false,
  rows,
  maxRows,
  startAdornment,
  endAdornment,
  onChange,
  onBlur,
  onFocus,
  className,
  inputProps,
  InputProps,
  ...restProps
}) => {
  // Convert string error to boolean with message
  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : '';
  
  // Prepare input adornments if provided
  const combinedInputProps = {
    ...InputProps,
    ...(startAdornment && {
      startAdornment: (
        <InputAdornment position="start">
          {startAdornment}
        </InputAdornment>
      )
    }),
    ...(endAdornment && {
      endAdornment: (
        <InputAdornment position="end">
          {endAdornment}
        </InputAdornment>
      )
    }),
  };
  
  return (
    <StyledTextField
      id={id}
      name={name}
      label={label && (
        <>
          {label}
          {required && <RequiredIndicator aria-hidden="true">*</RequiredIndicator>}
        </>
      )}
      value={value}
      type={type}
      placeholder={placeholder}
      error={hasError}
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      multiline={multiline}
      rows={rows}
      maxRows={maxRows}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      className={className}
      inputProps={{
        ...inputProps,
        'aria-invalid': hasError,
        'aria-required': required,
      }}
      InputProps={combinedInputProps}
      helperText={
        <HelperTextContainer error={hasError}>
          {hasError ? errorMessage : helperText}
        </HelperTextContainer>
      }
      {...restProps}
    />
  );
};

export default TextField;
export type { TextFieldProps };