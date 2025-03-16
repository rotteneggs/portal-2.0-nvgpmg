import React, { Component, ErrorInfo } from 'react'; // react ^18.2.0
import { Box, Typography, Button, Alert } from '@mui/material'; // @mui/material ^5.14.0
import { ErrorOutline } from '@mui/icons-material'; // @mui/icons-material ^5.14.0
import { getErrorMessage } from '../../utils/errorUtils';

/**
 * Props interface for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /**
   * Components that will be rendered within the error boundary
   */
  children: React.ReactNode;
  
  /**
   * Optional custom component to render when an error occurs
   */
  FallbackComponent?: React.ComponentType<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }>;
  
  /**
   * Optional callback that will be called when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /**
   * Optional callback that will be called when the error boundary is reset
   */
  onReset?: () => void;
}

/**
 * Default fallback component that is displayed when an error occurs
 */
const DefaultFallbackComponent = ({
  error,
  resetErrorBoundary,
}: {
  error: Error | null;
  resetErrorBoundary: () => void;
}) => {
  const errorMessage = getErrorMessage(error);
  
  return (
    <Box
      sx={{
        padding: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
        borderRadius: 1,
      }}
    >
      <ErrorOutline fontSize="large" color="error" />
      <Typography variant="h5" component="h2" gutterBottom>
        Something went wrong
      </Typography>
      <Alert 
        severity="error" 
        sx={{ 
          width: '100%',
          '& .MuiAlert-message': {
            wordBreak: 'break-word'
          }
        }}
      >
        {errorMessage}
      </Alert>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Please try again or contact support if the problem persists.
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={resetErrorBoundary}
      >
        Try Again
      </Button>
    </Box>
  );
};

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire application.
 * 
 * This is a critical component for graceful error handling in the Student Admissions Enrollment Platform.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean; error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Static method to update state when an error occurs in the component tree
   * This is called during rendering, so side effects are not allowed here
   */
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called after an error has been thrown
   * This is where side effects like logging are allowed
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Here you could also send the error to an error tracking service
    // like Sentry, LogRocket, etc.
  }

  /**
   * Resets the error boundary state, clearing the error and allowing
   * the component tree to re-render
   */
  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
    
    // Call the onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    const { children, FallbackComponent = DefaultFallbackComponent } = this.props;
    
    if (this.state.hasError) {
      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;