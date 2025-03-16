import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Checkbox as MuiCheckbox, FormControlLabel, FormHelperText } from '@mui/material';
import { colors, spacing } from '../../styles/variables';
import { focusOutline } from '../../styles/mixins';
import { Size } from '../../types/common';

// Helper function to determine checkbox size based on Size enum
const getCheckboxSize = (size?: Size) => {
  switch (size) {
    case 'small':
      return '16px';
    case 'large':
      return '24px';
    case 'medium':
    default:
      return '20px';
  }
};

// Props interface for the Checkbox component
export interface CheckboxProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  size?: Size;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  className?: string;
}

// Styled components
const StyledCheckbox = styled(MuiCheckbox)<{ $size?: Size; $hasError?: boolean }>`
  &.MuiCheckbox-root {
    padding: ${({ $size }) => ($size === 'small' ? spacing.xs : spacing.sm)};
    
    .MuiSvgIcon-root {
      width: ${({ $size }) => getCheckboxSize($size)};
      height: ${({ $size }) => getCheckboxSize($size)};
    }
    
    &.Mui-checked {
      color: ${({ $hasError }) => ($hasError ? colors.error : colors.primary)};
    }
    
    &.Mui-indeterminate {
      color: ${({ $hasError }) => ($hasError ? colors.error : colors.primary)};
    }
    
    &.Mui-disabled {
      color: ${colors.neutralLight};
    }
    
    &:focus-visible {
      ${focusOutline}
    }
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${spacing.sm};
`;

const StyledFormControlLabel = styled(FormControlLabel)`
  margin-left: 0;
  color: ${colors.neutralDark};
  
  &.Mui-disabled {
    color: ${colors.neutralLight};
  }
`;

const ErrorText = styled(FormHelperText)`
  color: ${colors.error};
  margin-left: ${spacing.sm};
  margin-top: ${spacing.xs};
`;

const HelperText = styled(FormHelperText)`
  color: ${colors.neutralMedium};
  margin-left: ${spacing.sm};
  margin-top: ${spacing.xs};
`;

/**
 * A customizable checkbox component with label, error state, and indeterminate support.
 * Follows the application's design system and provides accessibility features.
 */
const Checkbox: React.FC<CheckboxProps> = ({
  id,
  name,
  label,
  checked = false,
  indeterminate = false,
  disabled = false,
  error = false,
  errorMessage,
  helperText,
  size = 'medium',
  onChange,
  className,
}) => {
  // Reference to the checkbox input element for indeterminate state
  const checkboxRef = useRef<HTMLInputElement>(null);
  
  // Set indeterminate property on the checkbox element
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  
  return (
    <CheckboxContainer className={className}>
      <StyledFormControlLabel
        control={
          <StyledCheckbox
            id={id}
            name={name}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            $size={size}
            $hasError={error}
            inputRef={checkboxRef}
            inputProps={{ 
              'aria-describedby': error && errorMessage 
                ? `${id}-error` 
                : helperText 
                  ? `${id}-helper` 
                  : undefined,
              'aria-invalid': error ? 'true' : 'false'
            }}
          />
        }
        label={label}
        disabled={disabled}
      />
      
      {error && errorMessage && (
        <ErrorText id={`${id}-error`} role="alert">
          {errorMessage}
        </ErrorText>
      )}
      
      {helperText && !error && (
        <HelperText id={`${id}-helper`}>
          {helperText}
        </HelperText>
      )}
    </CheckboxContainer>
  );
};

export default Checkbox;