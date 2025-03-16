import { colors } from '../variables';

/**
 * Dark theme configuration for the Student Admissions Enrollment Platform
 * Implements the dark color scheme while maintaining brand consistency
 * Ensures WCAG 2.1 AA compliance for accessibility with proper contrast ratios
 */
export const darkTheme = {
  name: 'dark',
  colors: {
    // Maintain brand identity with primary colors
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    
    // Dark-specific color overrides
    background: '#121212', // Standard dark mode background
    surface: '#1E1E1E',    // Slightly lighter for surfaces
    surfaceVariant: '#2C2C2C', // Even lighter for card surfaces
    divider: 'rgba(255, 255, 255, 0.12)' // Subtle dividers
  },
  
  // Background variations for different UI components
  background: {
    default: '#121212',
    paper: '#1E1E1E',
    card: '#2C2C2C',
    dialog: '#2C2C2C',
    input: '#2C2C2C',
    tableHeader: '#2C2C2C',
    tableRow: '#1E1E1E',
    tableRowAlt: '#262626'
  },
  
  // Text colors optimized for readability on dark backgrounds
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
    hint: 'rgba(255, 255, 255, 0.5)',
    link: '#90CAF9', // Lighter blue for links in dark mode
    error: '#F48FB1'  // Lighter error color for better visibility
  },
  
  // Border colors for dark mode with appropriate opacity
  border: {
    light: 'rgba(255, 255, 255, 0.12)',
    medium: 'rgba(255, 255, 255, 0.23)',
    dark: 'rgba(255, 255, 255, 0.38)'
  },
  
  // Shadows adjusted for dark mode visibility
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
    md: '0 4px 8px rgba(0, 0, 0, 0.6)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.7)'
  }
};

export default darkTheme;