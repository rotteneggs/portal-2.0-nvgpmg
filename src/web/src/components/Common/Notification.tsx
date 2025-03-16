import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import { Alert, Snackbar, IconButton, Slide, SlideProps } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { NotificationWithRecipient, NotificationType } from '../../types/notification';
import { colors, spacing, borderRadius, shadows, zIndex, transitions } from '../../styles/variables';
import notificationService from '../../services/NotificationService';

/**
 * Props interface for the Notification component
 */
export interface NotificationProps {
  notification: NotificationWithRecipient | null;
  type?: NotificationType | 'success' | 'error' | 'warning' | 'info';
  message?: string;
  autoHideDuration?: number;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
  onRead?: (notificationId: number) => void;
  position?: string;
  open?: boolean;
}

// Slide transition component for animation
function SlideTransition(props: SlideProps) {
  return <Slide {...props} />;
}

// Styled Alert component with custom styling based on type
const StyledAlert = styled(Alert)<{ $severityType: string }>`
  border-radius: ${borderRadius.md};
  box-shadow: ${shadows.md};
  padding: ${spacing.sm} ${spacing.md};
  transition: ${transitions.default};
  
  ${({ $severityType }) => {
    switch ($severityType) {
      case 'success':
        return `
          background-color: ${colors.success};
          color: ${colors.white};
          
          .MuiAlert-icon {
            color: ${colors.white};
          }
        `;
      case 'error':
        return `
          background-color: ${colors.error};
          color: ${colors.white};
          
          .MuiAlert-icon {
            color: ${colors.white};
          }
        `;
      case 'warning':
        return `
          background-color: ${colors.warning};
          color: ${colors.neutralDark};
          
          .MuiAlert-icon {
            color: ${colors.neutralDark};
          }
        `;
      case 'info':
      default:
        return `
          background-color: ${colors.primary};
          color: ${colors.white};
          
          .MuiAlert-icon {
            color: ${colors.white};
          }
        `;
    }
  }}
  
  .MuiAlert-message {
    padding: 0;
  }
`;

// Styled Snackbar with proper z-index
const StyledSnackbar = styled(Snackbar)`
  z-index: ${zIndex.notification};
`;

/**
 * Notification Component
 * 
 * A reusable notification component that displays various types of notifications
 * with appropriate styling and interactive features. This component can be used
 * either with a notification object from the notification system or with simple
 * message and type props for standalone notifications.
 */
const Notification: React.FC<NotificationProps> = ({
  notification,
  type = 'info',
  message = '',
  autoHideDuration = 5000,
  onClose,
  onRead,
  position = 'top-right',
  open = true,
}) => {
  // Convert position string to vertical and horizontal values for Snackbar
  const positionParts = position.split('-');
  const vertical = (positionParts[0] === 'top' || positionParts[0] === 'bottom') 
    ? positionParts[0] as 'top' | 'bottom'
    : 'top';
  const horizontal = (positionParts[1] === 'left' || positionParts[1] === 'center' || positionParts[1] === 'right') 
    ? positionParts[1] as 'left' | 'center' | 'right'
    : 'right';

  // Determine slide direction based on position
  const getSlideDirection = useCallback((): 'left' | 'right' | 'up' | 'down' => {
    if (horizontal === 'right') return 'left';
    if (horizontal === 'left') return 'right';
    if (vertical === 'top') return 'down';
    return 'up';
  }, [horizontal, vertical]);

  // Map notification type to severity
  const getNotificationSeverity = useCallback((): 'success' | 'error' | 'warning' | 'info' => {
    if (notification?.type) {
      switch (notification.type) {
        case NotificationType.DOCUMENT_VERIFIED:
        case NotificationType.PAYMENT_RECEIVED:
        case NotificationType.ADMISSION_DECISION:
          return 'success';
        case NotificationType.DOCUMENT_REJECTED:
        case NotificationType.PAYMENT_FAILED:
          return 'error';
        case NotificationType.DEADLINE_REMINDER:
          return 'warning';
        default:
          return 'info';
      }
    }
    
    // If no notification object, use the type prop
    if (type === 'success' || type === 'error' || type === 'warning' || type === 'info') {
      return type;
    }
    return 'info';
  }, [notification, type]);

  // Get notification content
  const getNotificationContent = useCallback(() => {
    if (notification) {
      return notificationService.formatNotificationContent(notification);
    }
    return message;
  }, [notification, message]);

  // Handle notification close
  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    
    // If onRead is provided and notification has an id, mark as read
    if (onRead && notification?.id) {
      onRead(notification.id);
    }
    
    onClose(event, reason);
  }, [onClose, onRead, notification]);

  const severity = getNotificationSeverity();
  const content = getNotificationContent();
  
  // Get custom icon if notification is provided
  const icon = notification?.type 
    ? <span className="material-icons">{notificationService.getNotificationIcon(notification.type)}</span>
    : undefined;

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical, horizontal }}
      TransitionComponent={SlideTransition}
      TransitionProps={{ direction: getSlideDirection() }}
    >
      <StyledAlert
        severity={severity}
        $severityType={severity}
        variant="filled"
        icon={icon}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        {content}
      </StyledAlert>
    </StyledSnackbar>
  );
};

export default Notification;