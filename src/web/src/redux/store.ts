import { configureStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'; // redux-persist ^6.0.0
import storage from 'redux-persist/lib/storage'; // redux-persist/lib/storage ^6.0.0
import rootReducer, { RootState } from './rootReducer';

/**
 * Configuration object for Redux Persist.
 * Defines how the Redux store should be persisted across browser sessions.
 *
 * Requirements Addressed:
 *   - Session Persistence (Technical Specifications/6.6 CACHING AND PERFORMANCE/6.6.2 Session Management)
 */
const persistConfig = {
  key: 'root', // Key for the root of the persisted state
  storage, // Storage engine to use (localStorage in this case)
  whitelist: ['auth', 'ui'], // List of slice names to persist
  blacklist: [], // List of slice names to NOT persist
};

/**
 * Enhances the root reducer with persistence capabilities using Redux Persist.
 * This allows the selected slices of the Redux store to be saved to localStorage
 * and rehydrated when the application is reloaded.
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configures the Redux store using Redux Toolkit's configureStore.
 * Includes middleware configuration, Redux DevTools setup, and the persisted reducer.
 *
 * Requirements Addressed:
 *   - State Management (Technical Specifications/6.3 FRONTEND ARCHITECTURE/6.3.2 State Management)
 *   - Development Tools (Technical Specifications/8.5 CI/CD PIPELINE/8.5.1 Build Pipeline)
 */
const store = configureStore({
  reducer: persistedReducer, // Use the persisted reducer
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER], // Ignore Redux Persist actions
      },
    }),
    
  // Enable Redux DevTools with specific configurations
  devTools: process.env.NODE_ENV !== 'production' ? {
    name: 'Student Admissions Platform', // Custom name for the DevTools
    trace: true, // Enable stack trace for dispatched actions
    traceLimit: 25, // Limit the length of the stack trace
  } : false,
});

/**
 * Creates a Redux Persist persistor based on the configured store.
 * The persistor is used to rehydrate the Redux store from the persisted state
 * when the application is loaded.
 */
export const persistor = persistStore(store);

/**
 * TypeScript type definition for the store's dispatch function.
 * Used for type-safe dispatching of actions throughout the application.
 */
export type AppDispatch = typeof store.dispatch;

// Export the configured Redux store as the default export
export default store;

// Export the Redux Persist persistor for use in the application's entry point
export { persistor };

// Export the AppDispatch type for use throughout the application
export type { AppDispatch };