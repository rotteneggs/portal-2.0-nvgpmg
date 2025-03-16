import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Typography, Box, Chip, Divider } from '@mui/material';
import { Lightbulb, ArrowForward, CheckCircle } from '@mui/icons-material';

import Card from '../Common/Card';
import Button from '../Common/Button';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import AIService from '../../services/AIService';
import useFetch, { useApiQuery } from '../../hooks/useFetch';
import { ID, AsyncStatus } from '../../types/common';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the RecommendationCard component
 */
interface RecommendationCardProps {
  /** The ID of the application to get recommendations for */
  applicationId: ID;
  /** Optional callback for when an action button is clicked */
  onActionClick?: ((action: string, url?: string) => void);
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of recommendations to display (default: 3) */
  maxRecommendations?: number;
}

/**
 * Interface for a single recommendation item
 */
interface Recommendation {
  /** Type of recommendation (e.g., 'document', 'deadline', 'completion') */
  type: string;
  /** The recommendation message to display */
  message: string;
  /** Priority level (1=high, 2=medium, 3=low) */
  priority: number;
  /** Action identifier (optional) */
  action?: string;
  /** Action button label (optional) */
  actionLabel?: string;
  /** URL to navigate to when action is clicked (optional) */
  actionUrl?: string;
}

// Styled components
const StyledCard = styled(Card)`
  margin-bottom: ${spacing.md};
`;

const CardHeader = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: ${spacing.sm};
`;

const CardTitle = styled(Typography)`
  font-weight: 500;
  margin-left: ${spacing.xs};
`;

const RecommendationList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: ${spacing.sm};
`;

const RecommendationItem = styled(Box)<{ $priority: number }>`
  padding: ${spacing.sm};
  border-left: 3px solid ${({ $priority }) => {
    if ($priority === 1) return colors.warning;
    if ($priority === 2) return colors.primary;
    if ($priority === 3) return colors.success;
    return colors.neutralLight;
  }};
  background-color: ${colors.white};
  border-radius: 4px;
`;

const RecommendationContent = styled(Box)`
  display: flex;
  flex-direction: column;
`;

const RecommendationMessage = styled(Typography)`
  color: ${colors.text.primary};
`;

const ActionButton = styled(Button)`
  align-self: flex-end;
  margin-top: ${spacing.xs};
`;

const PriorityChip = styled(Chip)<{ $priority: number }>`
  background-color: ${({ $priority }) => {
    if ($priority === 1) return colors.warning;
    if ($priority === 2) return colors.primary;
    if ($priority === 3) return colors.success;
    return colors.neutralLight;
  }};
  color: ${colors.white};
  height: 20px;
  font-size: 0.75rem;
  margin-right: ${spacing.xs};
`;

const EmptyState = styled(Box)`
  padding: ${spacing.md};
  text-align: center;
  color: ${colors.text.secondary};
`;

const ErrorState = styled(Box)`
  padding: ${spacing.md};
  text-align: center;
  color: ${colors.error};
`;

/**
 * A component that displays AI-generated recommendations for application completion
 * 
 * This card component shows personalized recommendations to help students complete
 * their application process, prioritized by importance.
 */
const RecommendationCard: React.FC<RecommendationCardProps> = ({
  applicationId,
  onActionClick,
  className,
  maxRecommendations = 3
}) => {
  // Fetch recommendations using React Query
  const { data, status, error } = useApiQuery(
    ['recommendations', applicationId],
    `ai/applications/${applicationId}/recommendations`
  );
  
  /**
   * Determines the color to use based on recommendation priority
   */
  const getPriorityColor = (priority: number): string => {
    if (priority === 1) return colors.warning;
    if (priority === 2) return colors.primary;
    if (priority === 3) return colors.success;
    return colors.neutralLight;
  };
  
  /**
   * Handles clicks on recommendation action buttons
   */
  const handleActionClick = (action: string, url?: string) => {
    if (onActionClick) {
      onActionClick(action, url);
    } else {
      // Default action handling if no handler is provided
      if (url) {
        window.location.href = url;
      }
    }
  };
  
  /**
   * Returns the appropriate icon based on recommendation type
   */
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <Lightbulb />;
      case 'deadline':
        return <Lightbulb />;
      case 'completion':
        return <CheckCircle />;
      default:
        return <Lightbulb />;
    }
  };
  
  // Show loading skeleton while fetching recommendations
  if (status === AsyncStatus.LOADING) {
    return (
      <StyledCard className={className}>
        <LoadingSkeleton variant="card" />
      </StyledCard>
    );
  }
  
  // Show error state if recommendations couldn't be loaded
  if (status === AsyncStatus.ERROR) {
    return (
      <StyledCard className={className}>
        <ErrorState>
          <Typography>Unable to load recommendations. Please try again later.</Typography>
        </ErrorState>
      </StyledCard>
    );
  }
  
  // Get and sort recommendations by priority (lower number = higher priority)
  const recommendations = data?.recommendations || [];
  const sortedRecommendations = [...recommendations]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxRecommendations);
  
  // Show empty state if no recommendations are available
  if (sortedRecommendations.length === 0) {
    return (
      <StyledCard className={className}>
        <CardHeader>
          <Lightbulb color="primary" />
          <CardTitle variant="h6">Recommendations</CardTitle>
        </CardHeader>
        <EmptyState>
          <Typography>You're on track! No recommendations at this time.</Typography>
        </EmptyState>
      </StyledCard>
    );
  }
  
  // Render recommendations
  return (
    <StyledCard className={className}>
      <CardHeader>
        <Lightbulb color="primary" />
        <CardTitle variant="h6">Recommendations</CardTitle>
      </CardHeader>
      <RecommendationList>
        {sortedRecommendations.map((recommendation, index) => (
          <RecommendationItem key={index} $priority={recommendation.priority}>
            <RecommendationContent>
              <RecommendationMessage variant="body2">
                {recommendation.message}
              </RecommendationMessage>
              {recommendation.action && recommendation.actionLabel && (
                <ActionButton 
                  variant="text" 
                  color="primary" 
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => handleActionClick(recommendation.action!, recommendation.actionUrl)}
                >
                  {recommendation.actionLabel}
                </ActionButton>
              )}
            </RecommendationContent>
          </RecommendationItem>
        ))}
      </RecommendationList>
    </StyledCard>
  );
};

export default RecommendationCard;