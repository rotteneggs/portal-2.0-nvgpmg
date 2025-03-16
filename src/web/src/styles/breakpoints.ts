/**
 * Breakpoint definitions for responsive design in the Student Admissions Enrollment Platform.
 * This file establishes the viewport width thresholds that determine different device categories
 * and provides utility functions for responsive design implementation throughout the application.
 */

/**
 * Defines the pixel width thresholds for each breakpoint
 * - xs: < 576px (Mobile phones - portrait)
 * - sm: 576px - 767px (Mobile phones - landscape, small tablets)
 * - md: 768px - 991px (Tablets - portrait)
 * - lg: 992px - 1199px (Tablets - landscape, small desktops)
 * - xl: ≥ 1200px (Large desktops)
 */
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

/**
 * Ready-to-use media query strings for responsive styling
 * Compatible with styled-components, emotion, and other CSS-in-JS libraries
 */
export const mediaQueries = {
  // Exact breakpoint ranges
  xs: `@media (max-width: ${breakpoints.sm - 1}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  md: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  
  // "Up" media queries (for styles that apply from a breakpoint up)
  smUp: `@media (min-width: ${breakpoints.sm}px)`,
  mdUp: `@media (min-width: ${breakpoints.md}px)`,
  lgUp: `@media (min-width: ${breakpoints.lg}px)`,
  xlUp: `@media (min-width: ${breakpoints.xl}px)`,
  
  // "Down" media queries (for styles that apply from a breakpoint down)
  smDown: `@media (max-width: ${breakpoints.md - 1}px)`,
  mdDown: `@media (max-width: ${breakpoints.lg - 1}px)`,
  lgDown: `@media (max-width: ${breakpoints.xl - 1}px)`,
};

/**
 * Semantic device type names for different screen sizes
 */
export const deviceTypes = {
  mobile: 'mobile',
  tablet: 'tablet',
  desktop: 'desktop',
  largeDesktop: 'largeDesktop',
};

/**
 * Determines the current breakpoint based on a given window width.
 * 
 * @param width - The window width in pixels
 * @returns The corresponding breakpoint key (xs, sm, md, lg, or xl)
 */
export const getBreakpointFromWidth = (width: number): string => {
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
};

/**
 * Maps a breakpoint to a semantic device type.
 * 
 * @param breakpoint - The breakpoint key (xs, sm, md, lg, or xl)
 * @returns The corresponding device type (mobile, tablet, desktop, or largeDesktop)
 */
export const getDeviceTypeFromBreakpoint = (breakpoint: string): string => {
  switch (breakpoint) {
    case 'xl':
      return deviceTypes.largeDesktop;
    case 'lg':
      return deviceTypes.desktop;
    case 'md':
      return deviceTypes.tablet;
    case 'sm':
    case 'xs':
    default:
      return deviceTypes.mobile;
  }
};