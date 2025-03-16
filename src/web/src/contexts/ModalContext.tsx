import React, { createContext, useContext, useState, ReactNode } from 'react'; // React ^18.0.0
import useModal from '../hooks/useModal';
import Modal from '../components/Common/Modal';

/**
 * Configuration options for the modal dialog
 */
interface ModalConfig {
  /** Title text for the modal header */
  title?: string;
  /** Action buttons to display in the footer */
  actions?: ReactNode;
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

/**
 * Type definition for modal context value
 */
interface ModalContextType {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Content to be displayed in the modal */
  modalContent: ReactNode;
  /** Configuration options for the modal */
  modalConfig: ModalConfig;
  /** Function to open the modal with content and optional configuration */
  openModal: (content: ReactNode, config?: ModalConfig) => void;
  /** Function to close the modal */
  closeModal: () => void;
}

/**
 * Props for the ModalProvider component
 */
interface ModalProviderProps {
  /** Child components that will have access to the modal context */
  children: ReactNode;
}

// Create the context with an initial undefined value
const ModalContext = createContext<ModalContextType | undefined>(undefined);

/**
 * Provider component for modal context that centralizes modal state and operations.
 * This allows components throughout the application to create, open, close, and manage
 * modal dialogs without prop drilling.
 */
const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  // Use the useModal hook for state management
  // Note: The useModal hook provides its own escape key and outside click handling,
  // which may conflict with the Modal component's handling if disableBackdropClick
  // or disableEscapeKeyDown are set to true.
  const { isOpen, openModal: triggerModal, closeModal: hideModal } = useModal();
  
  // State for modal content and configuration
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});
  
  // Function to open the modal with content and optional configuration
  const openModal = (content: ReactNode, config: ModalConfig = {}) => {
    setModalContent(content);
    setModalConfig(config);
    triggerModal();
  };
  
  // Function to close the modal
  const closeModal = () => {
    hideModal();
    // We don't clear content immediately to avoid a flash during the close animation
    setTimeout(() => {
      setModalContent(null);
      setModalConfig({});
    }, 300); // Match the transition duration
  };
  
  // Context value with modal state and functions
  const contextValue: ModalContextType = {
    isOpen,
    modalContent,
    modalConfig,
    openModal,
    closeModal
  };
  
  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      
      <Modal
        open={isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        actions={modalConfig.actions}
        maxWidth={modalConfig.maxWidth}
        fullWidth={modalConfig.fullWidth}
        showCloseButton={modalConfig.showCloseButton}
        disableBackdropClick={modalConfig.disableBackdropClick}
        disableEscapeKeyDown={modalConfig.disableEscapeKeyDown}
        className={modalConfig.className}
        contentClassName={modalConfig.contentClassName}
        titleClassName={modalConfig.titleClassName}
        actionsClassName={modalConfig.actionsClassName}
      >
        {modalContent}
      </Modal>
    </ModalContext.Provider>
  );
};

/**
 * Custom hook to use the ModalContext
 * @returns Modal context value with isOpen state, content, config, and control functions
 * @throws Error if used outside of ModalProvider
 */
const useModalContext = (): ModalContextType => {
  const context = useContext(ModalContext);
  
  if (context === undefined) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  
  return context;
};

export { ModalProvider, useModalContext, ModalContext };
export type { ModalContextType, ModalConfig, ModalProviderProps };