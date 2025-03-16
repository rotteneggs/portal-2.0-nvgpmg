import React from 'react';
import styled from '@emotion/styled';
import { Card as MuiCard, CardContent, CardHeader, CardActions } from '@mui/material';
import { colors, shadows, borderRadius, spacing, transitions } from '../../styles/variables';
import { focusOutline, cardStyle } from '../../styles/mixins';

/**
 * Props interface for the Card component
 */
export interface CardProps {
  /** Controls the shadow depth of the card */
  elevation?: 'sm' | 'md' | 'lg';
  /** Controls the card appearance style */
  variant?: 'outlined' | 'elevation' | 'flat';
  /** Whether the card is interactive (adds hover effects) */
  clickable?: boolean;
  /** Function called when clickable card is clicked */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Additional CSS class for the card */
  className?: string;
  /** Card title to display in header */
  title?: string;
  /** Card subtitle to display in header */
  subheader?: string;
  /** Action element to display in header */
  headerAction?: React.ReactNode;
  /** Action elements to display in footer */
  actions?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Accessibility label for clickable cards */
  ariaLabel?: string;
}

// Styled components with design system styling
const StyledCard = styled(MuiCard)<{
  $elevation: 'sm' | 'md' | 'lg';
  $variant: 'outlined' | 'elevation' | 'flat';
  $clickable: boolean;
}>`
  ${cardStyle}
  border-radius: ${borderRadius.md};
  background-color: ${colors.white};
  ${({ $variant }) => $variant === 'outlined' && `
    border: 1px solid ${colors.border.light};
    box-shadow: none;
  `}
  ${({ $variant }) => $variant === 'elevation' && `
    border: none;
  `}
  ${({ $variant }) => $variant === 'flat' && `
    border: none;
    box-shadow: none;
    background-color: ${colors.neutralLight};
  `}
  ${({ $elevation, $variant }) => $variant === 'elevation' && `
    box-shadow: ${shadows[$elevation]};
  `}
  ${({ $clickable }) => $clickable && `
    cursor: pointer;
    transition: transform ${transitions.default}, box-shadow ${transitions.default};
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${shadows.md};
    }
    &:active {
      transform: translateY(0);
    }
  `}
  
  ${focusOutline}
  
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0; /* Override cardStyle padding since we're using CardContent */
`;

const StyledCardContent = styled(CardContent)`
  padding: ${spacing.md};
  flex-grow: 1;
  &:last-child {
    padding-bottom: ${spacing.md};
  }
`;

const StyledCardHeader = styled(CardHeader)`
  padding: ${spacing.md};
  padding-bottom: 0;
`;

const StyledCardActions = styled(CardActions)`
  padding: ${spacing.md};
  justify-content: flex-end;
`;

/**
 * A customizable card component that implements the design system's card styles and behaviors.
 * Extends Material-UI's Card component with application-specific styling and additional features.
 */
const Card: React.FC<CardProps> = ({
  elevation = 'md',
  variant = 'outlined',
  clickable = false,
  onClick,
  className,
  title,
  subheader,
  headerAction,
  actions,
  children,
  ariaLabel,
  ...rest
}) => {
  // Handle keyboard navigation for clickable cards
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };
  
  // Determine the click handler if card is clickable
  const handleClick = clickable && onClick ? onClick : undefined;

  // Props for the card
  const cardProps = {
    $elevation: elevation,
    $variant: variant,
    $clickable: clickable,
    onClick: handleClick,
    onKeyDown: clickable ? handleKeyDown : undefined,
    className,
    tabIndex: clickable ? 0 : undefined,
    role: clickable ? 'button' : undefined,
    'aria-label': clickable ? ariaLabel : undefined,
    ...rest
  };

  return (
    <StyledCard {...cardProps}>
      {/* Render header if title or subheader is provided */}
      {(title || subheader) && (
        <StyledCardHeader
          title={title}
          subheader={subheader}
          action={headerAction}
        />
      )}
      
      {/* Card content */}
      <StyledCardContent>
        {children}
      </StyledCardContent>
      
      {/* Render actions if provided */}
      {actions && (
        <StyledCardActions>
          {actions}
        </StyledCardActions>
      )}
    </StyledCard>
  );
};

export default Card;
export { CardProps };