import React from 'react';
import styled from '@emotion/styled';
import { Box, Typography, LinearProgress } from '@mui/material';
import { colors, spacing, borderRadius, transitions } from '../../styles/variables';

export interface ProgressIndicatorProps {
  /**
   * Number between 0 and 100 representing completion percentage
   * @default 0
   */
  percentage?: number;
  
  /**
   * Boolean to control whether to show percentage text
   * @default true
   */
  showPercentage?: boolean;
  
  /**
   * Number specifying the height of the progress bar in pixels
   * @default 8
   */
  height?: number;
  
  /**
   * Optional custom color for the progress bar (overrides automatic color)
   */
  color?: string;
  
  /**
   * Optional CSS class name for additional styling
   */
  className?: string;
  
  /**
   * Optional text label to display with the progress indicator
   */
  label?: string;
}

/**
 * Determines the color of the progress bar based on the completion percentage
 */
const getProgressColor = (percentage: number): string => {
  if (percentage < 30) {
    return colors.primary; // Early progress
  } else if (percentage >= 30 && percentage < 70) {
    return colors.primary; // Mid progress
  } else if (percentage >= 70) {
    return colors.success; // Near completion
  }
  return colors.primary; // Default
};

const ProgressContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: ${spacing.xs} 0;
`;

const StyledLinearProgress = styled(LinearProgress)<{ height?: number; barColor: string }>`
  height: ${({ height }) => (height ? `${height}px` : '8px')};
  border-radius: ${borderRadius.sm};
  background-color: ${colors.neutralLight};
  
  .MuiLinearProgress-bar {
    background-color: ${({ barColor }) => barColor};
    border-radius: ${borderRadius.sm};
    transition: transform ${transitions.default};
  }
`;

const PercentageText = styled(Typography)`
  margin-top: ${spacing.xs};
  text-align: right;
  font-size: 0.875rem;
  color: ${colors.neutralDark};
`;

const LabelText = styled(Typography)`
  margin-bottom: ${spacing.xs};
  font-size: 0.875rem;
  font-weight: 500;
  color: ${colors.neutralDark};
`;

/**
 * A customizable progress indicator component that visualizes completion percentage
 * Used throughout the application to show progress for multi-step forms,
 * application completion status, and other processes.
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percentage = 0,
  showPercentage = true,
  height = 8,
  color = '',
  className = '',
  label = '',
}) => {
  // Ensure percentage is within valid range
  const validPercentage = Math.min(Math.max(0, percentage), 100);
  
  // Use custom color or get color based on percentage
  const progressColor = color || getProgressColor(validPercentage);

  return (
    <ProgressContainer className={className} role="progressbar" aria-valuenow={validPercentage} aria-valuemin={0} aria-valuemax={100}>
      {label && <LabelText variant="body2">{label}</LabelText>}
      <StyledLinearProgress 
        variant="determinate" 
        value={validPercentage} 
        height={height} 
        barColor={progressColor}
      />
      {showPercentage && (
        <PercentageText variant="body2">
          {validPercentage}%
        </PercentageText>
      )}
    </ProgressContainer>
  );
};

export default ProgressIndicator;