import { useState, useRef, useCallback, useEffect } from 'react'; // React 18.x
import useClickOutside from './useClickOutside';

/**
 * Return type for the useModal hook
 */
interface UseModalReturn {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Ref to attach to the modal DOM element */
  modalRef: React.RefObject<HTMLDivElement>;
  /** Function to open the modal */
  openModal: () => void;
  /** Function to close the modal */
  closeModal: () => void;
  /** Function to toggle the modal's open state */
  toggleModal: () => void;
}

/**
 * A custom hook that provides modal dialog management functionality.
 * This hook encapsulates the state and behavior of modal dialogs, allowing
 * components to easily open, close, and toggle modals without managing the state themselves.
 * 
 * Features:
 * - Modal open/close state management
 * - Escape key detection to close the modal
 * - Click outside detection to dismiss the modal
 * - Ref to attach to the modal DOM element
 * 
 * @param initialState - Optional initial state of the modal (default: false)
 * @returns Object containing isOpen state, modalRef, and control functions
 */
const useModal = (initialState: boolean = false): UseModalReturn => {
  // State to track whether the modal is open
  const [isOpen, setIsOpen] = useState<boolean>(initialState);
  
  // Function to open the modal
  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  // Function to close the modal
  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Function to toggle the modal's open state
  const toggleModal = useCallback(() => {
    setIsOpen(prevState => !prevState);
  }, []);
  
  // Create a callback for handling clicks outside the modal
  const handleClickOutside = useCallback(() => {
    if (isOpen) {
      closeModal();
    }
  }, [isOpen, closeModal]);
  
  // Use the useClickOutside hook to get a ref that detects clicks outside
  const modalRef = useClickOutside<HTMLDivElement>(handleClickOutside);
  
  // Handle keyboard events (Escape key) to close the modal for accessibility
  useEffect(() => {
    // Only add the event listener if the modal is open
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener when modal closes or component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);
  
  // Return the modal state and control functions
  return {
    isOpen,
    modalRef,
    openModal,
    closeModal,
    toggleModal
  };
};

export default useModal;