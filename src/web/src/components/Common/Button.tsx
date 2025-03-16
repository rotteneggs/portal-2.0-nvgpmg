import React from 'react';
import styled from '@emotion/styled';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import { 
  colors, 
  spacing, 
  transitions, 
  borderRadius 
} from '../../styles/variables';
import { 
  focusOutline, 
  flexCenter 
} from '../../styles/mixins';

/**
 * Props interface for the Button component
 */
export interface ButtonProps {
  /** Button variant - contained (default), outlined, or text */
  variant?: 'contained' | 'outlined' | 'text';
  
  /** Button color - primary (default), secondary, accent, or error */
  color?: 'primary' | 'secondary' | 'accent' | 'error';
  
  /** Button size - small, medium (default), or large */
  size?: 'small' | 'medium' | 'large';
  
  /** Whether the button should take the full width of its container */
  fullWidth?: boolean;
  
  /** Whether the button is disabled */
  disabled?: boolean;
  
  /** Whether the button is in a loading state */
  loading?: boolean;
  
  /** Icon to display before the button text */
  startIcon?: React.ReactNode;
  
  /** Icon to display after the button text */
  endIcon?: React.ReactNode;
  
  /** Function called when the button is clicked */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** HTML button type - button (default), submit, or reset */
  type?: 'button' | 'submit' | 'reset';
  
  /** Additional CSS class to apply to the button */
  className?: string;
  
  /** Accessibility label for the button */
  ariaLabel?: string;
  
  /** Button content/text */
  children: React.ReactNode;
}

// Helper function to convert hex color to rgba
const hexToRgba = (hex: string, alpha: number = 1): string => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Return rgba value
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Styled Button component
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => !['buttonVariant', 'buttonColor', 'buttonSize'].includes(prop as string),
})<{
  buttonVariant: string;
  buttonColor: string;
  buttonSize: string;
}>`
  /* Base styles */
  font-family: 'Roboto', sans-serif;
  text-transform: none;
  border-radius: ${borderRadius.md};
  transition: all ${transitions.default};
  position: relative;
  line-height: 1.5;
  letter-spacing: 0.02em;
  
  /* Focus state styling for accessibility */
  &:focus-visible {
    ${focusOutline}
  }
  
  /* Custom color styles based on variant */
  ${props => {
    const colorValue = colors[props.buttonColor as keyof typeof colors];
    
    if (props.buttonVariant === 'contained') {
      // For contained buttons
      const textColor = ['primary', 'secondary', 'accent', 'error'].includes(props.buttonColor) 
        ? colors.white 
        : colors.neutralDark;
      
      let hoverColor;
      switch (props.buttonColor) {
        case 'primary': 
          hoverColor = colors.primaryDark;
          break;
        case 'secondary': 
          hoverColor = colors.secondaryDark;
          break;
        case 'accent': 
          hoverColor = '#F50057'; // Darker accent
          break;
        case 'error': 
          hoverColor = '#D32F2F'; // Darker error
          break;
        default:
          hoverColor = colorValue;
      }
      
      return `
        background-color: ${colorValue};
        color: ${textColor};
        box-shadow: none;
        
        &:hover:not(:disabled) {
          background-color: ${hoverColor};
          box-shadow: none;
        }
      `;
    } else if (props.buttonVariant === 'outlined') {
      // For outlined buttons
      return `
        border: 1px solid ${colorValue};
        color: ${colorValue};
        background-color: transparent;
        
        &:hover:not(:disabled) {
          background-color: ${hexToRgba(colorValue, 0.08)};
          border-color: ${colorValue};
        }
      `;
    } else {
      // For text buttons
      return `
        color: ${colorValue};
        background-color: transparent;
        
        &:hover:not(:disabled) {
          background-color: ${hexToRgba(colorValue, 0.08)};
        }
      `;
    }
  }}
  
  /* Size styles */
  ${props => {
    switch (props.buttonSize) {
      case 'small':
        return `
          padding: ${spacing.xs} ${spacing.sm};
          font-size: 0.875rem;
          min-height: 32px;
        `;
      case 'large':
        return `
          padding: ${spacing.sm} ${spacing.md};
          font-size: 1rem;
          min-height: 48px;
        `;
      default: // 'medium'
        return `
          padding: ${spacing.xs} ${spacing.md};
          font-size: 0.875rem;
          min-height: 40px;
        `;
    }
  }}
  
  /* Disabled state styling */
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

// Styled component for button content
const ButtonContent = styled.div`
  ${flexCenter}
  position: relative;
  width: 100%;
`;

// Styled component for loading indicator
const LoadingIndicator = styled(CircularProgress, {
  shouldForwardProp: (prop) => prop !== 'buttonSize',
})<{
  buttonSize: string;
}>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  
  /* Size based on button size */
  ${props => {
    switch (props.buttonSize) {
      case 'small':
        return `
          width: 16px !important;
          height: 16px !important;
        `;
      case 'large':
        return `
          width: 24px !important;
          height: 24px !important;
        `;
      default: // 'medium'
        return `
          width: 20px !important;
          height: 20px !important;
        `;
    }
  }}
`;

// Styled component for text content
const TextContent = styled.span<{
  isLoading: boolean;
}>`
  visibility: ${props => props.isLoading ? 'hidden' : 'visible'};
`;

// Styled component for icons
const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  
  &.start-icon {
    margin-right: ${spacing.xs};
  }
  
  &.end-icon {
    margin-left: ${spacing.xs};
  }
`;

/**
 * Button component that implements the design system's button styles and behaviors.
 * Extends Material-UI's Button component with application-specific styling and features.
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  className,
  ariaLabel,
  children,
  ...rest
}) => {
  // Disable the button when in loading state
  const isDisabled = disabled || loading;
  
  return (
    <StyledButton
      variant={variant}
      buttonVariant={variant}
      buttonColor={color}
      buttonSize={size}
      fullWidth={fullWidth}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      className={className}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...rest}
    >
      <ButtonContent>
        {startIcon && !loading && (
          <IconWrapper className="start-icon">
            {startIcon}
          </IconWrapper>
        )}
        
        {loading && (
          <LoadingIndicator 
            buttonSize={size} 
            color={variant === 'contained' ? 'inherit' : color as any}
            size="small"
          />
        )}
        
        <TextContent isLoading={loading}>
          {children}
        </TextContent>
        
        {endIcon && !loading && (
          <IconWrapper className="end-icon">
            {endIcon}
          </IconWrapper>
        )}
      </ButtonContent>
    </StyledButton>
  );
};

export default Button;