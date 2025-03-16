import React from 'react';
import styled from '@emotion/styled';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  ListSubheader,
  SelectChangeEvent
} from '@mui/material';

import { colors, spacing, typography, transitions } from '../../styles/variables';
import { SelectOption } from '../../types/common';

// Interface for the Select component props
export interface SelectProps {
  name: string;
  label: string;
  value: unknown;
  onChange: (event: SelectChangeEvent<unknown>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  options: SelectOption[];
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  className?: string;
  id?: string;
  multiple?: boolean;
  renderValue?: (value: unknown) => React.ReactNode;
  displayEmpty?: boolean;
  SelectProps?: React.ComponentProps<typeof MuiSelect>;
}

// Interface for grouped options
interface GroupedOptions {
  group: string;
  options: SelectOption[];
}

// Styled components
const StyledFormControl = styled(FormControl)`
  margin-bottom: ${spacing.md};
  width: ${props => (props.fullWidth ? '100%' : 'auto')};
`;

const StyledInputLabel = styled(InputLabel)`
  font-size: ${typography.fontSizes.body1};
  color: ${colors.neutralDark};
  
  &.Mui-focused {
    color: ${colors.primary};
  }
  
  &.Mui-error {
    color: ${colors.error};
  }
  
  &.Mui-disabled {
    color: ${colors.neutralMedium};
  }
`;

const StyledSelect = styled(MuiSelect)`
  .MuiSelect-select {
    font-size: ${typography.fontSizes.body1};
    padding: ${spacing.sm} ${spacing.md};
  }
  
  .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.border.default};
    transition: border-color ${transitions.default};
  }
  
  &:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.neutralDark};
  }
  
  &.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.primary};
    border-width: 2px;
  }
  
  &.Mui-error .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.error};
  }
  
  &.Mui-disabled .MuiOutlinedInput-notchedOutline {
    border-color: ${colors.border.light};
  }
`;

const ErrorText = styled(FormHelperText)`
  color: ${colors.error};
  margin-top: ${spacing.xs};
  font-size: ${typography.fontSizes.small};
`;

const HelperText = styled(FormHelperText)`
  color: ${colors.neutralMedium};
  margin-top: ${spacing.xs};
  font-size: ${typography.fontSizes.small};
`;

const RequiredIndicator = styled.span`
  color: ${colors.error};
  margin-left: ${spacing.xs};
`;

const StyledMenuItem = styled(MenuItem)`
  font-size: ${typography.fontSizes.body1};
  
  &:hover {
    background-color: ${colors.neutralLight};
  }
  
  &.Mui-selected {
    background-color: ${props => `${colors.primary}20`};
    
    &:hover {
      background-color: ${props => `${colors.primary}30`};
    }
  }
`;

const StyledListSubheader = styled(ListSubheader)`
  font-size: ${typography.fontSizes.body2};
  color: ${colors.neutralDark};
  font-weight: 600;
  background-color: ${colors.background.paper};
`;

/**
 * A customized select component that extends Material-UI's Select with application-specific
 * styling and integration with the form validation system.
 */
const Select: React.FC<SelectProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  error = false,
  helperText,
  required = false,
  disabled = false,
  placeholder = "",
  fullWidth = true,
  size = "medium",
  variant = "outlined",
  className,
  id,
  multiple = false,
  renderValue,
  displayEmpty = true,
  SelectProps = {},
  ...rest
}) => {
  // Generate a unique ID if not provided
  const fieldId = id || `select-${name}`;
  
  // Determine if the field has an error
  const hasError = Boolean(error);
  
  // Group options by their group property
  const groupedOptions: { [key: string]: SelectOption[] } = {};
  const ungroupedOptions: SelectOption[] = [];
  
  options.forEach(option => {
    if (option.group) {
      if (!groupedOptions[option.group]) {
        groupedOptions[option.group] = [];
      }
      groupedOptions[option.group].push(option);
    } else {
      ungroupedOptions.push(option);
    }
  });
  
  // Create a custom renderValue function to handle placeholders
  const handleRenderValue = React.useCallback(
    (selected: unknown) => {
      // If there's a custom renderValue provided, use it
      if (renderValue) {
        return renderValue(selected);
      }
      
      // For multiple select
      if (multiple && Array.isArray(selected)) {
        if (selected.length === 0) {
          return placeholder;
        }
        
        return selected
          .map(value => options.find(option => option.value === value)?.label)
          .filter(Boolean)
          .join(', ');
      }
      
      // For single select
      if (selected === '') {
        return placeholder;
      }
      
      // Find the matching option label
      const option = options.find(option => option.value === selected);
      return option ? option.label : '';
    },
    [multiple, options, placeholder, renderValue]
  );
  
  return (
    <StyledFormControl
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      error={hasError}
      disabled={disabled}
      className={className}
    >
      <StyledInputLabel id={`${fieldId}-label`}>
        {label}
        {required && <RequiredIndicator>*</RequiredIndicator>}
      </StyledInputLabel>
      
      <StyledSelect
        labelId={`${fieldId}-label`}
        id={fieldId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur as any}
        displayEmpty={displayEmpty}
        multiple={multiple}
        renderValue={handleRenderValue}
        {...SelectProps}
        {...rest}
        aria-describedby={helperText ? `${fieldId}-helper-text` : undefined}
      >
        {displayEmpty && !multiple && (
          <StyledMenuItem value="">
            {placeholder}
          </StyledMenuItem>
        )}
        
        {/* Render ungrouped options first */}
        {ungroupedOptions.map((option) => (
          <StyledMenuItem
            key={`option-${option.value}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </StyledMenuItem>
        ))}
        
        {/* Render grouped options */}
        {Object.keys(groupedOptions).map(group => (
          <React.Fragment key={`group-${group}`}>
            <StyledListSubheader disableSticky>
              {group}
            </StyledListSubheader>
            
            {groupedOptions[group].map(option => (
              <StyledMenuItem
                key={`option-${option.value}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </StyledMenuItem>
            ))}
          </React.Fragment>
        ))}
      </StyledSelect>
      
      {helperText && (
        hasError ? (
          <ErrorText id={`${fieldId}-helper-text`}>{helperText}</ErrorText>
        ) : (
          <HelperText id={`${fieldId}-helper-text`}>{helperText}</HelperText>
        )
      )}
    </StyledFormControl>
  );
};

export { SelectProps };
export default Select;