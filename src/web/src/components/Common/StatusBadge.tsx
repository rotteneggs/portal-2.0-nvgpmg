import React from 'react';
import { Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircleOutline,
  ErrorOutline,
  HourglassEmpty,
  InfoOutlined,
  WarningAmber
} from '@mui/icons-material';

/**
 * Enum representing different types of statuses that can be displayed in the badge
 */
export enum StatusType {
  APPLICATION = 'APPLICATION',
  DOCUMENT = 'DOCUMENT',
  PAYMENT = 'PAYMENT',
  FINANCIAL_AID = 'FINANCIAL_AID',
  WORKFLOW = 'WORKFLOW',
  GENERIC = 'GENERIC'
}

/**
 * Props for the StatusBadge component
 */
export interface StatusBadgeProps {
  /** The status value to display */
  status: string;
  /** The type of status being displayed */
  type: StatusType;
  /** Size of the badge */
  size?: 'small' | 'medium';
  /** Whether to show an icon in the badge */
  showIcon?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Helper function to determine the appropriate color, icon, and variant
 * based on the status type and value
 */
const getStatusConfig = (status: string, type: StatusType) => {
  const normalizedStatus = status.toUpperCase();
  
  switch (type) {
    case StatusType.APPLICATION:
      // Configuration for application statuses
      if (['DRAFT', 'INCOMPLETE'].includes(normalizedStatus)) {
        return {
          color: 'default' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'outlined' as const
        };
      } else if (['SUBMITTED', 'PENDING'].includes(normalizedStatus)) {
        return {
          color: 'info' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['IN_REVIEW', 'UNDER_REVIEW', 'REVIEWING'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <HourglassEmpty fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['APPROVED', 'ACCEPTED', 'COMPLETED'].includes(normalizedStatus)) {
        return {
          color: 'success' as const,
          icon: <CheckCircleOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['REJECTED', 'DENIED', 'DECLINED'].includes(normalizedStatus)) {
        return {
          color: 'error' as const,
          icon: <ErrorOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['WAITLISTED'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <WarningAmber fontSize="small" />,
          variant: 'filled' as const
        };
      }
      break;
      
    case StatusType.DOCUMENT:
      // Configuration for document statuses
      if (['PENDING', 'AWAITING_UPLOAD', 'MISSING'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <WarningAmber fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['UPLOADED', 'PROCESSING'].includes(normalizedStatus)) {
        return {
          color: 'info' as const,
          icon: <HourglassEmpty fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['VERIFIED', 'APPROVED', 'ACCEPTED'].includes(normalizedStatus)) {
        return {
          color: 'success' as const,
          icon: <CheckCircleOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['REJECTED', 'INVALID', 'ERROR'].includes(normalizedStatus)) {
        return {
          color: 'error' as const,
          icon: <ErrorOutline fontSize="small" />,
          variant: 'filled' as const
        };
      }
      break;
      
    case StatusType.PAYMENT:
      // Configuration for payment statuses
      if (['PENDING', 'INITIATED', 'PROCESSING'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <HourglassEmpty fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['COMPLETED', 'SUCCEEDED', 'SUCCESSFUL', 'PAID'].includes(normalizedStatus)) {
        return {
          color: 'success' as const,
          icon: <CheckCircleOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['FAILED', 'DECLINED', 'ERROR', 'REJECTED'].includes(normalizedStatus)) {
        return {
          color: 'error' as const,
          icon: <ErrorOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['REFUNDED', 'CANCELLED', 'VOIDED'].includes(normalizedStatus)) {
        return {
          color: 'default' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'outlined' as const
        };
      }
      break;
      
    case StatusType.FINANCIAL_AID:
      // Configuration for financial aid statuses
      if (['DRAFT', 'INCOMPLETE'].includes(normalizedStatus)) {
        return {
          color: 'default' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'outlined' as const
        };
      } else if (['SUBMITTED', 'PENDING'].includes(normalizedStatus)) {
        return {
          color: 'info' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['IN_REVIEW', 'UNDER_REVIEW', 'REVIEWING'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <HourglassEmpty fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['APPROVED', 'GRANTED', 'AWARDED'].includes(normalizedStatus)) {
        return {
          color: 'success' as const,
          icon: <CheckCircleOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['REJECTED', 'DENIED', 'INELIGIBLE'].includes(normalizedStatus)) {
        return {
          color: 'error' as const,
          icon: <ErrorOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['PARTIAL', 'PARTIAL_AWARD'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <WarningAmber fontSize="small" />,
          variant: 'filled' as const
        };
      }
      break;
      
    case StatusType.WORKFLOW:
      // Configuration for workflow statuses
      if (['PENDING', 'WAITING'].includes(normalizedStatus)) {
        return {
          color: 'default' as const,
          icon: <InfoOutlined fontSize="small" />,
          variant: 'outlined' as const
        };
      } else if (['ACTIVE', 'IN_PROGRESS', 'PROCESSING'].includes(normalizedStatus)) {
        return {
          color: 'info' as const,
          icon: <HourglassEmpty fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['COMPLETED', 'FINISHED', 'DONE'].includes(normalizedStatus)) {
        return {
          color: 'success' as const,
          icon: <CheckCircleOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['FAILED', 'ERROR', 'BLOCKED'].includes(normalizedStatus)) {
        return {
          color: 'error' as const,
          icon: <ErrorOutline fontSize="small" />,
          variant: 'filled' as const
        };
      } else if (['PAUSED', 'ON_HOLD', 'SUSPENDED'].includes(normalizedStatus)) {
        return {
          color: 'warning' as const,
          icon: <WarningAmber fontSize="small" />,
          variant: 'filled' as const
        };
      }
      break;
  }
  
  // Default configuration for GENERIC type or any unhandled cases
  // Try to infer the appropriate configuration based on common status patterns
  if (['DRAFT', 'PENDING', 'AWAITING', 'WAITING'].some(s => normalizedStatus.includes(s))) {
    return {
      color: 'default' as const,
      icon: <InfoOutlined fontSize="small" />,
      variant: 'outlined' as const
    };
  } else if (['IN_PROGRESS', 'PROCESSING', 'REVIEWING', 'ACTIVE'].some(s => normalizedStatus.includes(s))) {
    return {
      color: 'info' as const,
      icon: <HourglassEmpty fontSize="small" />,
      variant: 'filled' as const
    };
  } else if (['APPROVED', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'VERIFIED', 'ACCEPTED'].some(s => normalizedStatus.includes(s))) {
    return {
      color: 'success' as const,
      icon: <CheckCircleOutline fontSize="small" />,
      variant: 'filled' as const
    };
  } else if (['REJECTED', 'FAILED', 'ERROR', 'DECLINED', 'DENIED', 'INVALID'].some(s => normalizedStatus.includes(s))) {
    return {
      color: 'error' as const,
      icon: <ErrorOutline fontSize="small" />,
      variant: 'filled' as const
    };
  } else if (['WARNING', 'CAUTION', 'PARTIAL', 'WAITLIST', 'HOLD'].some(s => normalizedStatus.includes(s))) {
    return {
      color: 'warning' as const,
      icon: <WarningAmber fontSize="small" />,
      variant: 'filled' as const
    };
  }
  
  // Final fallback
  return {
    color: 'default' as const,
    icon: <InfoOutlined fontSize="small" />,
    variant: 'outlined' as const
  };
};

// Styled component for conditional padding based on whether icon is shown
const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'showIcon',
})<{ showIcon: boolean }>(({ showIcon }) => ({
  fontWeight: 500,
  textTransform: 'capitalize',
  ...(showIcon === false && {
    paddingLeft: 0,
    '& .MuiChip-label': {
      paddingLeft: 12,
      paddingRight: 12,
    },
  }),
}));

/**
 * A reusable UI component that displays status information with
 * appropriate visual styling based on the status type.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  size = 'medium',
  showIcon = true,
  className,
}) => {
  // Skip rendering if no status is provided
  if (!status) return null;
  
  // Get the appropriate configuration for this status
  const { color, icon, variant } = getStatusConfig(status, type);
  
  // Format the status text for display (e.g. "in_review" -> "In Review")
  const formattedStatus = status
    .toLowerCase()
    .split(/[_-\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return (
    <StyledChip
      label={formattedStatus}
      color={color}
      variant={variant}
      size={size}
      icon={showIcon ? icon : undefined}
      showIcon={showIcon}
      className={className}
    />
  );
};

export default StatusBadge;