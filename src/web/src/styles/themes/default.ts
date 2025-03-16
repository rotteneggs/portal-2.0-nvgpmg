import { colors, shadows } from '../variables';

/**
 * Default (light) theme configuration for the Student Admissions Enrollment Platform
 * This theme follows the design system specifications and ensures WCAG 2.1 AA compliance
 * for color contrast and visual accessibility.
 */
export const defaultTheme = {
  name: 'light',
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceVariant: '#EEEEEE',
    divider: 'rgba(0, 0, 0, 0.12)'
  },
  background: {
    default: '#FFFFFF',
    paper: '#F5F5F5',
    card: '#FFFFFF',
    dialog: '#FFFFFF',
    input: '#F5F5F5',
    tableHeader: '#F5F5F5',
    tableRow: '#FFFFFF',
    tableRowAlt: '#F9F9F9'
  },
  text: {
    primary: colors.neutralDark,
    secondary: colors.neutralMedium,
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)',
    link: colors.primary,
    error: colors.error
  },
  border: {
    light: colors.neutralLight,
    medium: 'rgba(0, 0, 0, 0.23)',
    dark: 'rgba(0, 0, 0, 0.42)'
  },
  shadows: {
    sm: shadows.sm,
    md: shadows.md,
    lg: shadows.lg
  }
};

export default defaultTheme;