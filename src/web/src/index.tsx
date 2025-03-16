import React from 'react'; // react v18.2.0
import { createRoot } from 'react-dom/client'; // react-dom/client v18.2.0
import { Provider } from 'react-redux'; // react-redux v8.0.5
import { PersistGate } from 'redux-persist/integration/react'; // redux-persist v6.0.0
import { StrictMode } from 'react'; // react v18.2.0
import { ThemeProvider } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { CssBaseline } from '@mui/material'; // @mui/material v5.11.10
import theme from './styles/themes/default';
import App from './App';
import GlobalStyles from './styles/GlobalStyles';
import store, { persistor } from './redux/store';

/**
 * Function to render the React application to the DOM
 */
const renderApp = (): void => {
  // LD1: Get the root element from the DOM
  const rootElement = document.getElementById('root');

  // LD1: Throw error if root element not found
  if (!rootElement) {
    throw new Error('Failed to find the root element in the DOM.');
  }

  // LD1: Create a React root using createRoot
  const root = createRoot(rootElement);

  // LD1: Render the application with all necessary providers
  root.render(
    // LD1: Wrap the App component with StrictMode for development checks
    <StrictMode>
      {/* LD1: Wrap with Redux Provider to make store available */}
      <Provider store={store}>
        {/* LD1: Wrap with PersistGate to delay rendering until state is rehydrated */}
        <PersistGate loading={null} persistor={persistor}>
          {/* LD1: Wrap with ThemeProvider for Material-UI theming */}
          <ThemeProvider theme={theme}>
            {/* LD1: Include CssBaseline for CSS normalization */}
            <CssBaseline />
            {/* LD1: Include GlobalStyles for application-specific global styling */}
            <GlobalStyles />
            <App />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </StrictMode>
  );
};

// IE1: Render the app
renderApp();

// Conditional logic for Hot Module Replacement (HMR)
if (module.hot) {
  module.hot.accept('./App', () => {
    // IE3: If App.js changes, re-render the app
    console.info('Re-rendering application due to hot module replacement.');
    renderApp();
  });
}