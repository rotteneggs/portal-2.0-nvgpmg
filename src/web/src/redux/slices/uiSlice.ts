import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.3
import { ThemeMode, Breakpoint } from '../../types/common';

/**
 * Interface for notification object in UI state
 */
interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

/**
 * Interface for the UI state in Redux store
 */
interface UIState {
  /** Whether the sidebar is open */
  sidebarOpen: boolean;
  /** Current theme mode (light, dark, system) */
  themeMode: ThemeMode;
  /** Current responsive breakpoint */
  currentBreakpoint: Breakpoint;
  /** ID of the currently active modal, or null if no modal is open */
  activeModal: string | null;
  /** Optional data for the active modal */
  modalData: any | null;
  /** Current notification to display, or null if no notification */
  notification: Notification | null;
  /** Whether global loading indicator should be shown */
  globalLoading: boolean;
}

/**
 * Initial state for UI slice
 */
const initialState: UIState = {
  sidebarOpen: true,
  themeMode: ThemeMode.SYSTEM,
  currentBreakpoint: Breakpoint.LG,
  activeModal: null,
  modalData: null,
  notification: null,
  globalLoading: false,
};

/**
 * Redux slice for UI state management
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Toggle the sidebar open/closed state
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    /**
     * Set the sidebar open state explicitly
     */
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    /**
     * Set the theme mode (light, dark, system)
     */
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    
    /**
     * Set the current responsive breakpoint
     */
    setCurrentBreakpoint: (state, action: PayloadAction<Breakpoint>) => {
      state.currentBreakpoint = action.payload;
    },
    
    /**
     * Open a modal with optional data
     */
    openModal: (state, action: PayloadAction<{ modalId: string; data?: any }>) => {
      state.activeModal = action.payload.modalId;
      state.modalData = action.payload.data || null;
    },
    
    /**
     * Close the currently active modal
     */
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    
    /**
     * Show a notification with type, message, and duration
     */
    showNotification: (state, action: PayloadAction<Notification>) => {
      state.notification = {
        type: action.payload.type,
        message: action.payload.message,
        duration: action.payload.duration || 5000, // Default 5 seconds
      };
    },
    
    /**
     * Clear the current notification
     */
    clearNotification: (state) => {
      state.notification = null;
    },
    
    /**
     * Set the global loading state
     */
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
  },
});

// Export action creators as named exports
export const {
  toggleSidebar,
  setSidebarOpen,
  setThemeMode,
  setCurrentBreakpoint,
  openModal,
  closeModal,
  showNotification,
  clearNotification,
  setGlobalLoading,
} = uiSlice.actions;

// Export selectors as named exports
export const selectUi = (state: { ui: UIState }): UIState => state.ui;
export const selectSidebarOpen = (state: { ui: UIState }): boolean => state.ui.sidebarOpen;
export const selectThemeMode = (state: { ui: UIState }): ThemeMode => state.ui.themeMode;
export const selectCurrentBreakpoint = (state: { ui: UIState }): Breakpoint => 
  state.ui.currentBreakpoint;
export const selectIsMobile = (state: { ui: UIState }): boolean => 
  state.ui.currentBreakpoint === Breakpoint.XS || state.ui.currentBreakpoint === Breakpoint.SM;
export const selectActiveModal = (state: { ui: UIState }): string | null => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }): any | null => state.ui.modalData;
export const selectNotification = (state: { ui: UIState }): Notification | null => 
  state.ui.notification;
export const selectGlobalLoading = (state: { ui: UIState }): boolean => state.ui.globalLoading;

// Export the slice as default export
export default uiSlice;