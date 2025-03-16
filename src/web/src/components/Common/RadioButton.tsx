import React from 'react';
import styled from '@emotion/styled';
import { Radio as MuiRadio, FormControlLabel, FormHelperText, RadioGroup } from '@mui/material';
import { colors, spacing } from '../../styles/variables';
import { focusOutline } from '../../styles/mixins';
import { Size } from '../../types/common';

// Helper function to determine radio button size based on Size enum
const getRadioSize = (size?: Size): string => {
  if (!size) return spacing.md; // Default to medium if not specified
  
  switch (size) {
    case 'xs':
      return spacing.xs;
    case 'sm':
      return spacing.sm;
    case 'lg':
      return spacing.lg;
    case 'xl':
      return spacing.xl;
    case 'md':
    default:
      return spacing.md;
  }
};

// Styled components
const StyledRadio = styled(MuiRadio)<{ size?: Size; error?: boolean }>`
  &.MuiRadio-root {
    color: ${({ error }) => (error ? colors.error : colors.neutralMedium)};
    
    &.Mui-checked {
      color: ${({ error }) => (error ? colors.error : colors.primary)};
    }
    
    &.Mui-disabled {
      color: ${colors.neutralLight};
    }
    
    padding: ${({ size }) => getRadioSize(size)};
  }
  
  &:focus-visible {
    ${focusOutline}
  }
`;

const RadioButtonContainer = styled.div`
  margin-bottom: ${spacing.sm};
  display: flex;
  flex-direction: column;
`;

const RadioGroupContainer = styled.div`
  margin-bottom: ${spacing.md};
`;

const StyledFormControlLabel = styled(FormControlLabel)`
  .MuiFormControlLabel-label {
    color: ${colors.neutralDark};
    
    &.Mui-disabled {
      color: ${colors.neutralMedium};
    }
  }
`;

const ErrorText = styled(FormHelperText)`
  color: ${colors.error};
  margin-top: ${spacing.xs};
  margin-left: ${spacing.sm};
`;

const HelperText = styled(FormHelperText)`
  color: ${colors.neutralMedium};
  margin-top: ${spacing.xs};
  margin-left: ${spacing.sm};
`;

// Interface definitions
export interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  size?: Size;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export interface RadioButtonGroupProps {
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  className?: string;
  row?: boolean;
}

/**
 * A customizable radio button component with label, error state, and accessibility support
 */
const RadioButton: React.FC<RadioButtonProps> = ({
  id,
  name,
  value,
  label,
  checked,
  disabled = false,
  error = false,
  errorMessage,
  helperText,
  size,
  onChange,
  className,
}) => {
  const hasError = error && !!errorMessage;
  
  return (
    <RadioButtonContainer className={className}>
      <StyledFormControlLabel
        control={
          <StyledRadio
            id={id}
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            size={size}
            error={error}
          />
        }
        label={label}
        disabled={disabled}
      />
      {hasError && <ErrorText error>{errorMessage}</ErrorText>}
      {!hasError && helperText && <HelperText>{helperText}</HelperText>}
    </RadioButtonContainer>
  );
};

/**
 * A component for grouping related radio buttons with shared name and onChange handler
 */
export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  name,
  value,
  onChange,
  children,
  error = false,
  errorMessage,
  helperText,
  className,
  row = false,
}) => {
  const hasError = error && !!errorMessage;
  
  return (
    <RadioGroupContainer className={className}>
      <RadioGroup
        name={name}
        value={value}
        onChange={onChange}
        row={row}
      >
        {children}
      </RadioGroup>
      {hasError && <ErrorText error>{errorMessage}</ErrorText>}
      {!hasError && helperText && <HelperText>{helperText}</HelperText>}
    </RadioGroupContainer>
  );
};

export default RadioButton;