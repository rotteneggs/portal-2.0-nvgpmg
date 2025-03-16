import React from 'react';
import styled from '@emotion/styled';
import { Box, Typography, SvgIcon } from '@mui/material';
import { colors, spacing } from '../../styles/variables';
import { flexCenter, flexColumn } from '../../styles/mixins';
import Button from '../Common/Button';

/**
 * Props interface for the EmptyState component
 */
export interface EmptyStateProps {
  /** The main message to display */
  message: string;
  /** Optional secondary description */
  description?: string;
  /** Optional illustration (icon or custom element) */
  illustration?: React.ReactNode;
  /** Label for the action button (if provided) */
  actionLabel?: string;
  /** Function to call when the action button is clicked */
  onAction?: () => void;
  /** Optional class name for custom styling */
  className?: string;
}

// Styled container with centered content in a column layout
const Container = styled(Box)`
  ${flexCenter}
  ${flexColumn}
  padding: ${spacing.lg};
  text-align: center;
  width: 100%;
`;

// Wrapper for the illustration with appropriate spacing
const IllustrationWrapper = styled(Box)`
  margin-bottom: ${spacing.md};
  svg {
    width: 64px;
    height: 64px;
    color: ${colors.neutralMedium};
  }
`;

// Main message styled as prominent text
const MessageText = styled(Typography)`
  font-weight: 500;
  font-size: 1.125rem;
  color: ${colors.neutralDark};
  margin-bottom: ${spacing.sm};
`;

// Optional description with subdued styling
const DescriptionText = styled(Typography)`
  color: ${colors.neutralMedium};
  margin-bottom: ${spacing.md};
  max-width: 480px;
`;

// Wrapper for the action button with appropriate spacing
const ActionWrapper = styled(Box)`
  margin-top: ${spacing.md};
`;

/**
 * A reusable empty state component that displays a message, optional illustration,
 * and action button when content is not available
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  description,
  illustration,
  actionLabel,
  onAction,
  className
}) => {
  return (
    <Container className={className}>
      {illustration && (
        <IllustrationWrapper>
          {illustration}
        </IllustrationWrapper>
      )}
      
      <MessageText variant="h6">
        {message}
      </MessageText>
      
      {description && (
        <DescriptionText variant="body2">
          {description}
        </DescriptionText>
      )}
      
      {actionLabel && onAction && (
        <ActionWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </ActionWrapper>
      )}
    </Container>
  );
};

export default EmptyState;