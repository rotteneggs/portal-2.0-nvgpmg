import React from 'react';
import styled from '@emotion/styled';
import { Skeleton, Box } from '@mui/material';
import { colors, borderRadius } from '../../styles/variables';

/**
 * Props interface for the LoadingSkeleton component
 */
export interface LoadingSkeletonProps {
  /**
   * Variant of the skeleton. Controls the shape and layout.
   */
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'list' | 'table';
  
  /**
   * Width of the skeleton.
   */
  width?: string | number;
  
  /**
   * Height of the skeleton.
   */
  height?: string | number;
  
  /**
   * Number of skeleton elements to render (for list and table variants).
   */
  count?: number;
  
  /**
   * Additional CSS class for the skeleton.
   */
  className?: string;
  
  /**
   * Spacing between multiple skeleton elements.
   */
  spacing?: number;
}

// Styled Skeleton component with customized styling
const StyledSkeleton = styled(Skeleton)`
  background-color: ${colors.neutralLight};
  border-radius: ${borderRadius.sm};
`;

// Container for multiple skeleton elements
const SkeletonContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

// Card-like skeleton layout
const CardSkeleton = styled(Box)`
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: ${borderRadius.md};
  background-color: ${colors.white};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

// Table-like skeleton layout
const TableSkeleton = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

/**
 * A customizable loading skeleton component that provides visual feedback during data loading.
 * This component creates animated placeholder elements that mimic the shape and size
 * of the content being loaded, improving perceived performance and user experience.
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height = 'auto',
  count = 1,
  className = '',
  spacing = 1,
}) => {
  // Helper to determine appropriate dimensions
  const getSkeletonDimensions = () => {
    let skeletonWidth = width;
    let skeletonHeight = height;
    
    // Default height based on variant if not specified
    if (height === 'auto') {
      switch (variant) {
        case 'text':
          skeletonHeight = '1.2em';
          break;
        case 'rectangular':
          skeletonHeight = '100px';
          break;
        case 'circular':
          skeletonHeight = width === '100%' ? '40px' : width;
          break;
        case 'card':
          skeletonHeight = '200px';
          break;
        default:
          skeletonHeight = '1.2em';
      }
    }
    
    // Adjust width for circular variant if using default width
    if (variant === 'circular' && width === '100%') {
      skeletonWidth = '40px';
    }
    
    return { width: skeletonWidth, height: skeletonHeight };
  };
  
  const { width: skeletonWidth, height: skeletonHeight } = getSkeletonDimensions();

  // Basic skeleton variants (text, rectangular, circular)
  if (['text', 'rectangular', 'circular'].includes(variant)) {
    return (
      <StyledSkeleton 
        variant={variant as 'text' | 'rectangular' | 'circular'}
        width={skeletonWidth}
        height={skeletonHeight}
        className={className}
        animation="wave"
        data-testid={`loading-skeleton-${variant}`}
        aria-label="Loading content"
      />
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <SkeletonContainer 
        className={className} 
        data-testid="loading-skeleton-list"
        aria-label="Loading list"
      >
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} mb={index < count - 1 ? spacing : 0}>
            <StyledSkeleton 
              variant="text" 
              width={skeletonWidth}
              height={skeletonHeight}
              animation="wave"
            />
          </Box>
        ))}
      </SkeletonContainer>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <CardSkeleton 
        className={className} 
        data-testid="loading-skeleton-card"
        aria-label="Loading card"
      >
        <StyledSkeleton 
          variant="rectangular" 
          width="100%" 
          height={skeletonHeight}
          animation="wave"
        />
        <Box mt={2}>
          <StyledSkeleton variant="text" width="70%" animation="wave" />
        </Box>
        <Box mt={1}>
          <StyledSkeleton variant="text" width="90%" animation="wave" />
        </Box>
        <Box mt={1}>
          <StyledSkeleton variant="text" width="80%" animation="wave" />
        </Box>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <StyledSkeleton variant="rectangular" width="60px" height="36px" animation="wave" />
        </Box>
      </CardSkeleton>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <TableSkeleton 
        className={className} 
        data-testid="loading-skeleton-table"
        aria-label="Loading table"
      >
        {/* Header row */}
        <Box display="flex" width="100%" mb={1}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Box key={`header-${index}`} flex={1} mr={index < 2 ? 1 : 0}>
              <StyledSkeleton variant="rectangular" width="100%" height="24px" animation="wave" />
            </Box>
          ))}
        </Box>
        
        {/* Data rows */}
        {Array.from({ length: count }).map((_, rowIndex) => (
          <Box key={`row-${rowIndex}`} display="flex" width="100%" mb={rowIndex < count - 1 ? 1 : 0}>
            {Array.from({ length: 3 }).map((_, cellIndex) => (
              <Box key={`cell-${rowIndex}-${cellIndex}`} flex={1} mr={cellIndex < 2 ? 1 : 0}>
                <StyledSkeleton variant="text" width="100%" animation="wave" />
              </Box>
            ))}
          </Box>
        ))}
      </TableSkeleton>
    );
  }

  // Default fallback
  return (
    <StyledSkeleton 
      variant="text"
      width={skeletonWidth}
      height={skeletonHeight}
      className={className}
      animation="wave"
      data-testid="loading-skeleton-default"
      aria-label="Loading content"
    />
  );
};

export default LoadingSkeleton;