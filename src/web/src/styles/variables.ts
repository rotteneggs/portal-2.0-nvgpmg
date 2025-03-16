// Design system variables for the Student Admissions Enrollment Platform
// Defines core visual design tokens used throughout the application

// Color palette according to design specifications
export const colors = {
  // Primary brand colors
  primary: '#1976D2',
  secondary: '#03A9F4',
  accent: '#FF4081',

  // Functional colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',

  // Neutral colors
  neutralDark: '#212121',
  neutralMedium: '#757575',
  neutralLight: '#EEEEEE',
  white: '#FFFFFF',

  // Color variations for hover states, backgrounds, etc.
  primaryLight: '#42A5F5',
  primaryDark: '#1565C0',
  secondaryLight: '#4FC3F7',
  secondaryDark: '#0288D1',
  
  // Background colors
  background: {
    default: '#FFFFFF',
    paper: '#FAFAFA',
    disabled: '#F5F5F5',
  },
  
  // Text colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#9E9E9E',
    hint: '#9E9E9E',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },

  // Border colors
  border: {
    light: '#E0E0E0',
    default: '#BDBDBD',
    dark: '#9E9E9E',
  }
};

// Typography system according to design specifications
export const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  
  // Font sizes
  fontSizes: {
    h1: '32px',
    h2: '24px',
    h3: '20px',
    h4: '18px',
    body1: '16px',
    body2: '14px',
    button: '14px',
    caption: '12px',
    small: '12px',
  },
  
  // Font weights
  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  }
};

// Spacing scale for consistent layout spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  
  // Function to multiply base spacing unit
  unit: '8px',
  multiply: (factor: number): string => `${factor * 8}px`,
};

// Transitions for animations and interactive elements
export const transitions = {
  default: '0.3s ease-in-out',
  fast: '0.15s ease-in-out',
  slow: '0.5s ease-in-out',
  
  // Specific transition types
  timing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  
  // Duration in ms
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  }
};

// Shadow definitions for different elevation levels
export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
  lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  xl: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
  
  // No shadow
  none: 'none',
};

// Border radius for consistent corner rounding
export const borderRadius = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  round: '50%',
};

// Z-index values to manage stacking context
export const zIndex = {
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
  dropdown: 1050,
  notification: 1600,
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: '0px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
};

// Media queries for responsive styling
export const mediaQueries = {
  xs: `@media (max-width: ${breakpoints.sm})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
};

// Focus visible outline for accessibility
export const focusVisible = {
  outline: `2px solid ${colors.primary}`,
  outlineOffset: '2px',
};