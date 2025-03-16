import { combineReducers } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import authSlice from './slices/authSlice';
import applicationsSlice from './slices/applicationsSlice';
import { documentsReducer } from './slices/documentsSlice';
import uiSlice from './slices/uiSlice';
import workflowsReducer from './slices/workflowsSlice';
import messagesSlice from './slices/messagesSlice';
import { paymentsReducer } from './slices/paymentsSlice';
import financialAidSlice from './slices/financialAidSlice';

/**
 * Root reducer for the Student Admissions Enrollment Platform.
 * Combines all slice reducers into a single reducer function.
 *
 * Requirements Addressed:
 *   - State Management (Technical Specifications/6.3 FRONTEND ARCHITECTURE/6.3.2 State Management)
 *   - TypeScript Integration (Technical Specifications/3.1 PROGRAMMING LANGUAGES)
 */
const rootReducer = combineReducers({
  auth: authSlice.reducer, // Authentication state (user data, tokens, login status)
  applications: applicationsSlice.reducer, // Application management state (forms, statuses, tracking)
  documents: documentsReducer, // Document management state (uploads, verification, status)
  ui: uiSlice.reducer, // UI state (theme, sidebar, modals, notifications)
  workflows: workflowsReducer, // Workflow state (stages, transitions, editor state)
  messages: messagesSlice.reducer, // Messaging state (conversations, notifications, unread counts)
  payments: paymentsReducer, // Payment processing state (transactions, history, methods)
  financialAid: financialAidSlice.reducer // Financial aid state (applications, documents, status)
});

/**
 * TypeScript type definition for the global Redux state.
 * Derived from ReturnType of the rootReducer for type-safe state access.
 */
export type RootState = ReturnType<typeof rootReducer>;

// Export the combined reducer as the default export
export default rootReducer;

// Export the RootState type for use throughout the application
export type { RootState };