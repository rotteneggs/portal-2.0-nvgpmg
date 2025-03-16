import React, { useEffect, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { Modal as MuiModal, Backdrop, Fade, IconButton, Typography } from '@mui/material'; // @mui/material ^5.0.0
import { Close } from '@mui/icons-material'; // @mui/icons-material ^5.0.0
import { 
  colors, 
  spacing, 
  transitions, 
  borderRadius, 
  zIndex 
} from '../../styles/variables';
import { 
  flexCenter, 
  flexBetween, 
  responsivePadding 
} from '../../styles/mixins';
import Button from './Button';
import ErrorBoundary from './ErrorBoundary';

/**
 * Props interface for the Modal component
 */
export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  
  /** Function called when the modal is closed */
  onClose: () => void;
  
  /** Title text for the modal header */
  title?: string;
  
  /** Modal content */
  children: React.ReactNode;
  
  /** Action buttons to display in the footer */
  actions?: React.ReactNode;
  
  /** Max width of the modal (xs, sm, md, lg, xl or a custom value) */
  maxWidth?: string;
  
  /** Whether the modal should take full width of its container */
  fullWidth?: boolean;
  
  /** Whether to show the close button in the header */
  showCloseButton?: boolean;
  
  /** Whether clicking the backdrop should close the modal */
  disableBackdropClick?: boolean;
  
  /** Whether pressing escape key should close the modal */
  disableEscapeKeyDown?: boolean;
  
  /** Additional CSS class for the modal */
  className?: string;
  
  /** Additional CSS class for the content area */
  contentClassName?: string;
  
  /** Additional CSS class for the title */
  titleClassName?: string;
  
  /** Additional CSS class for the actions area */
  actionsClassName?: string;
}

// Styled components for the modal
const StyledModal = styled(MuiModal)`
  ${flexCenter}
  z-index: ${zIndex.modal};
  
  // Ensure proper focus management for accessibility
  &:focus {
    outline: none;
  }
`;

const ModalContainer = styled.div<{ maxWidth: string; fullWidth: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: ${colors.white};
  border-radius: ${borderRadius.md};
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  max-height: calc(100vh - 64px);
  outline: none;
  overflow: hidden;
  
  // Width handling based on maxWidth prop
  ${props => {
    if (props.fullWidth) {
      return `
        width: calc(100% - 32px);
        max-width: ${props.maxWidth === 'xs' ? '444px' :
                   props.maxWidth === 'sm' ? '600px' :
                   props.maxWidth === 'md' ? '800px' :
                   props.maxWidth === 'lg' ? '1000px' :
                   props.maxWidth === 'xl' ? '1200px' :
                   props.maxWidth};
      `;
    } else {
      return `
        width: auto;
        max-width: ${props.maxWidth === 'xs' ? '444px' :
                   props.maxWidth === 'sm' ? '600px' :
                   props.maxWidth === 'md' ? '800px' :
                   props.maxWidth === 'lg' ? '1000px' :
                   props.maxWidth === 'xl' ? '1200px' :
                   props.maxWidth};
      `;
    }
  }}
  
  // Responsive sizing
  margin: ${spacing.md};
  
  // Responsive adjustments for mobile
  @media (max-width: 576px) {
    margin: ${spacing.sm};
    width: calc(100% - 16px);
    max-width: calc(100% - 16px);
    max-height: calc(100vh - 32px);
  }
`;

const ModalHeader = styled.div`
  ${flexBetween}
  padding: ${spacing.md} ${spacing.lg};
  border-bottom: 1px solid ${colors.neutralLight};
  
  @media (max-width: 576px) {
    padding: ${spacing.sm} ${spacing.md};
  }
`;

const ModalTitle = styled(Typography)`
  font-weight: 500;
  font-size: 1.25rem;
  color: ${colors.neutralDark};
  flex: 1;
`;

const CloseButton = styled(IconButton)`
  margin: -8px -8px -8px 8px;
  color: ${colors.neutralMedium};
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
    color: ${colors.neutralDark};
  }
`;

const ModalContent = styled.div<{ hasActions: boolean }>`
  flex: 1 1 auto;
  overflow-y: auto;
  ${responsivePadding}
  padding: ${spacing.lg};
  
  @media (max-width: 576px) {
    padding: ${spacing.md};
  }
  
  // Add padding at the bottom if there are no actions
  ${props => !props.hasActions && `
    padding-bottom: ${spacing.lg};
    
    @media (max-width: 576px) {
      padding-bottom: ${spacing.md};
    }
  `}
`;

const ModalActions = styled.div`
  ${flexBetween}
  flex-direction: row-reverse; // Puts primary actions on the right
  padding: ${spacing.md} ${spacing.lg};
  border-top: 1px solid ${colors.neutralLight};
  
  // Stack buttons vertically on very small screens
  @media (max-width: 400px) {
    flex-direction: column-reverse;
    gap: ${spacing.sm};
    
    > button {
      width: 100%;
    }
  }
  
  // Add space between buttons
  > * + * {
    margin-right: ${spacing.md};
    
    @media (max-width: 400px) {
      margin-right: 0;
    }
  }
`;

/**
 * A customizable modal dialog component that implements the design system's modal styles and behaviors.
 * Provides a content container, title, actions area, and close button, following accessibility best practices.
 */
const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  fullWidth = false,
  showCloseButton = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  className,
  contentClassName,
  titleClassName,
  actionsClassName,
}) => {
  // Create ref for modal container to manage focus
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle escape key press
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!disableEscapeKeyDown && event.key === 'Escape') {
      onClose();
    }
  }, [disableEscapeKeyDown, onClose]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (!disableBackdropClick) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);
  
  // Focus management - trap focus within the modal when open
  useEffect(() => {
    if (open && modalRef.current) {
      // Focus the first focusable element inside the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length) {
        (focusableElements[0] as HTMLElement).focus();
      } else {
        // If no focusable elements, focus the modal itself
        modalRef.current.focus();
      }
    }
  }, [open]);
  
  // Add/remove body scroll lock when modal opens/closes
  useEffect(() => {
    if (open) {
      // Save the current overflow style
      const originalOverflow = document.body.style.overflow;
      // Prevent scrolling on the background
      document.body.style.overflow = 'hidden';
      
      // Restore the original overflow style when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);
  
  // If modal is not open, don't render anything
  if (!open) return null;
  
  return (
    <StyledModal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 300,
        onClick: handleBackdropClick,
      }}
      className={className}
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <Fade in={open} timeout={300}>
        <ModalContainer
          ref={modalRef}
          maxWidth={maxWidth}
          fullWidth={fullWidth}
          onKeyDown={handleKeyDown}
          tabIndex={-1} // Make container focusable but not in tab order
          role="dialog"
        >
          {title && (
            <ModalHeader>
              <ModalTitle
                id="modal-title"
                variant="h6"
                component="h2"
                className={titleClassName}
              >
                {title}
              </ModalTitle>
              
              {showCloseButton && (
                <CloseButton
                  aria-label="Close"
                  onClick={onClose}
                  size="medium"
                >
                  <Close />
                </CloseButton>
              )}
            </ModalHeader>
          )}
          
          <ModalContent 
            hasActions={!!actions}
            className={contentClassName}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ModalContent>
          
          {actions && (
            <ModalActions className={actionsClassName}>
              {actions}
            </ModalActions>
          )}
        </ModalContainer>
      </Fade>
    </StyledModal>
  );
};

export default Modal;