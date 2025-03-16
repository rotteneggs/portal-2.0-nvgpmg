/**
 * CSS-in-JS mixins for the Student Admissions Enrollment Platform
 * 
 * This file contains reusable styling patterns that can be composed and reused
 * across components to ensure consistent styling and reduce code duplication.
 */

import { css } from '@emotion/react'; // @emotion/react ^11.10.0
import { colors, transitions, spacing, shadows, borderRadius } from './variables';
import { mediaQueries } from './breakpoints';

/**
 * Centers content using flexbox
 */
export const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/**
 * Aligns content with space-between using flexbox
 */
export const flexBetween = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

/**
 * Creates a flex column layout
 */
export const flexColumn = css`
  display: flex;
  flex-direction: column;
`;

/**
 * Provides consistent focus outlines that meet accessibility standards (WCAG 2.1 AA)
 */
export const focusOutline = css`
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Visually hides content while keeping it accessible to screen readers
 * Important for accessibility features like skip links and screen reader-only content
 */
export const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

/**
 * Truncates text with ellipsis when it overflows its container
 */
export const truncateText = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * Consistent card styling across the application
 */
export const cardStyle = css`
  background-color: ${colors.white};
  border-radius: ${borderRadius.md};
  box-shadow: ${shadows.sm};
  padding: ${spacing.md};
`;

/**
 * Resets button styles for custom button implementations
 */
export const buttonReset = css`
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  outline: inherit;
`;

/**
 * Consistent form input styling
 */
export const inputStyle = css`
  width: 100%;
  padding: ${spacing.sm} ${spacing.md};
  border: 1px solid ${colors.border.light};
  border-radius: ${borderRadius.md};
  transition: border-color ${transitions.default};
  
  &:focus {
    border-color: ${colors.primary};
    outline: none;
    ${focusOutline}
  }
  
  &::placeholder {
    color: ${colors.text.hint};
  }
`;

/**
 * Responsive padding that adjusts based on screen size
 */
export const responsivePadding = css`
  padding: ${spacing.sm};
  
  ${mediaQueries.smUp} {
    padding: ${spacing.md};
  }
  
  ${mediaQueries.mdUp} {
    padding: ${spacing.lg};
  }
`;

/**
 * Responsive margins that adjust based on screen size
 */
export const responsiveMargin = css`
  margin: ${spacing.sm};
  
  ${mediaQueries.smUp} {
    margin: ${spacing.md};
  }
  
  ${mediaQueries.mdUp} {
    margin: ${spacing.lg};
  }
`;

/**
 * Fade-in animation effect
 */
export const fadeIn = css`
  opacity: 0;
  animation: fadeIn ${transitions.default};
  animation-fill-mode: forwards;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/**
 * Slide-in animation effect
 */
export const slideIn = css`
  transform: translateY(20px);
  opacity: 0;
  animation: slideIn ${transitions.default};
  animation-fill-mode: forwards;
  
  @keyframes slideIn {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

/**
 * Returns shadow styling based on elevation level
 * @param level - The elevation level for the shadow (none, sm, md, lg, xl)
 */
export const elevationShadow = (level: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'sm') => {
  return css`
    box-shadow: ${shadows[level]};
  `;
};

/**
 * Hides elements on mobile devices
 */
export const hideOnMobile = css`
  display: none;
  
  ${mediaQueries.mdUp} {
    display: block;
  }
`;

/**
 * Shows elements only on mobile devices
 */
export const showOnMobile = css`
  display: block;
  
  ${mediaQueries.mdUp} {
    display: none;
  }
`;

/**
 * Returns CSS grid layout styling with responsive columns
 * @param columns - Object defining the number of columns at different breakpoints
 */
export const gridLayout = (columns: { xs?: number; sm?: number; md?: number; lg?: number }) => css`
  display: grid;
  grid-template-columns: repeat(${columns.xs || 1}, 1fr);
  gap: ${spacing.md};
  
  ${mediaQueries.sm} {
    grid-template-columns: repeat(${columns.sm || 2}, 1fr);
  }
  
  ${mediaQueries.md} {
    grid-template-columns: repeat(${columns.md || 3}, 1fr);
  }
  
  ${mediaQueries.lg} {
    grid-template-columns: repeat(${columns.lg || 4}, 1fr);
  }
`;