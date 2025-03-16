import React from 'react';
import styled from '@emotion/styled';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'; // @mui/x-date-pickers ^5.0.0
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // @mui/x-date-pickers ^5.0.0
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // @mui/x-date-pickers ^5.0.0
import { FormHelperText, InputAdornment } from '@mui/material'; // @mui/material ^5.0.0
import { CalendarToday } from '@mui/icons-material'; // @mui/icons-material ^5.0.0
import TextField from './TextField';
import { formatDate, parseDate, getDefaultDateFormat } from '../../utils/dateUtils';
import { 
  colors, 
  spacing, 
  typography, 
  transitions 
} from '../../styles/variables';

/**
 * Props interface for the DatePicker component
 */
export interface DatePickerProps {
  /** Name attribute for the input element, used for form handling */
  name?: string;
  /** Text label displayed above the input */
  label?: string;
  /** Current date value (string in format MM/dd/yyyy or Date object) */
  value?: string | Date | null;
  /** Function called when the date value changes */
  onChange?: (value: string | null) => void;
  /** Function called when the input loses focus */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether the input has an error */
  error?: boolean;
  /** Helper text or error message displayed below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the input should take up the full width of its container */
  fullWidth?: boolean;
  /** Minimum selectable date */
  minDate?: Date | string;
  /** Maximum selectable date */
  maxDate?: Date | string;
  /** Whether to disable dates before today */
  disablePast?: boolean;
  /** Whether to disable dates after today */
  disableFuture?: boolean;
  /** Date format string (defaults to MM/dd/yyyy) */
  format?: string;
  /** Additional CSS class to apply to the component */
  className?: string;
  /** Props applied to the input element */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /** Props applied to the Input component */
  InputProps?: object;
  /** HTML id attribute for the input element */
  id?: string;
}

/**
 * Styled DatePicker with application design system styles
 */
const StyledDatePicker = styled(MuiDatePicker)`
  .MuiPickersDay-root {
    color: ${colors.neutralDark};
    transition: ${transitions.default};
    
    &.Mui-selected {
      background-color: ${colors.primary};
      color: ${colors.white};
      
      &:hover, &:focus {
        background-color: ${colors.primary};
      }
    }
    
    &:hover {
      background-color: ${colors.neutralLight};
    }
  }
  
  .MuiPickersDay-today {
    border-color: ${colors.primary};
  }
  
  .MuiPickersCalendarHeader-root {
    color: ${colors.neutralDark};
  }
  
  .MuiPickersDay-today:not(.Mui-selected) {
    border-color: ${colors.primary};
    color: ${colors.primary};
  }
  
  .MuiPickersYear-yearButton {
    &.Mui-selected {
      background-color: ${colors.primary};
      color: ${colors.white};
    }
  }
`;

/**
 * A customized date picker component that extends Material-UI's DatePicker
 * with application-specific styling and integration with the form validation system.
 */
const DatePicker: React.FC<DatePickerProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  minDate,
  maxDate,
  disablePast = false,
  disableFuture = false,
  format,
  className,
  inputProps,
  InputProps,
  id,
  ...restProps
}) => {
  // Get default date format if not provided
  const dateFormat = format || getDefaultDateFormat();
  
  // Convert value from string to Date if needed
  const dateValue = typeof value === 'string' && value 
    ? parseDate(value, dateFormat) 
    : value;
  
  // Convert min/max dates from string to Date if needed
  const minDateValue = typeof minDate === 'string' && minDate
    ? parseDate(minDate, dateFormat)
    : minDate;
    
  const maxDateValue = typeof maxDate === 'string' && maxDate
    ? parseDate(maxDate, dateFormat)
    : maxDate;
  
  // Handle date change and convert to string format for form state
  const handleChange = (date: Date | null) => {
    if (onChange) {
      onChange(date ? formatDate(date, dateFormat) : null);
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <StyledDatePicker
        value={dateValue}
        onChange={handleChange}
        inputFormat={dateFormat}
        minDate={minDateValue}
        maxDate={maxDateValue}
        disablePast={disablePast}
        disableFuture={disableFuture}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            id={id}
            name={name}
            label={label}
            error={error}
            helperText={helperText}
            required={required}
            fullWidth={fullWidth}
            onBlur={onBlur}
            className={className}
            InputProps={{
              ...params.InputProps,
              ...InputProps,
              endAdornment: (
                <InputAdornment position="end">
                  <CalendarToday />
                </InputAdornment>
              ),
            }}
            inputProps={{
              ...params.inputProps,
              ...inputProps,
              'aria-required': required,
              'aria-invalid': Boolean(error),
            }}
          />
        )}
        {...restProps}
      />
    </LocalizationProvider>
  );
};

// Default export
export default DatePicker;