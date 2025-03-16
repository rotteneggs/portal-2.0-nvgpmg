import React, { useState, useEffect } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.0
import { CheckCircleOutline, ErrorOutline } from '@mui/icons-material'; // @mui/icons-material v5.11.0
import { CircularProgress, Typography, Box } from '@mui/material'; // @mui/material v5.11.0
import { Card, Button } from '../Common';
import { verifyEmail } from '../../services/AuthService';
import { VerifyEmailRequest } from '../../types/auth';

/**
 * Interface defining the props for the VerifyEmail component.
 * Currently, it's an empty interface as this component doesn't receive any props directly.
 */
interface VerifyEmailProps {}

/**
 * Component that handles email verification process.
 * It extracts the verification token from the URL, calls the verification API,
 * and displays a success or error message to the user.
 */
const VerifyEmail: React.FC<VerifyEmailProps> = () => {
  // Extract the 'id' and 'hash' parameters from the URL using the useParams hook.
  const { id, hash } = useParams<{ id: string; hash: string }>();

  // Initialize the navigate function using the useNavigate hook for programmatic navigation.
  const navigate = useNavigate();

  // Define state variables to manage the verification status:
  // - loading: indicates if the verification process is in progress.
  // - success: indicates if the verification was successful.
  // - error: stores any error message that occurs during verification.
  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use the useEffect hook to perform the email verification process when the component mounts.
  useEffect(() => {
    // Define an async function to handle the verification process.
    const verify = async () => {
      try {
        // Ensure that 'id' and 'hash' are available before proceeding.
        if (id && hash) {
          // Call the verifyEmail service function to verify the email address.
          await verifyEmail({ id, hash } as VerifyEmailRequest);

          // If the verification is successful, update the state to reflect success.
          setSuccess(true);
        } else {
          // If 'id' or 'hash' are missing, set an error message.
          setError('Invalid verification link.');
        }
      } catch (err: any) {
        // If an error occurs during verification, update the state to reflect the error.
        setError(err.message || 'Email verification failed.');
      } finally {
        // After the verification process (success or failure), set loading to false.
        setLoading(false);
      }
    };

    // Call the verify function to start the verification process.
    verify();
  }, [id, hash, navigate]); // The effect depends on 'id', 'hash', and 'navigate'.

  return (
    <Card title="Email Verification">
      {loading ? (
        // Display a loading indicator while the verification is in progress.
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : success ? (
        // Display a success message if the verification was successful.
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CheckCircleOutline color="success" sx={{ fontSize: 60 }} />
          <Typography variant="h6" align="center">
            Email Verified!
          </Typography>
          <Typography variant="body1" align="center">
            Your email has been successfully verified. You can now proceed to login.
          </Typography>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Box>
      ) : (
        // Display an error message if the verification failed.
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <ErrorOutline color="error" sx={{ fontSize: 60 }} />
          <Typography variant="h6" align="center" color="error">
            Email Verification Failed
          </Typography>
          <Typography variant="body1" align="center" color="textSecondary">
            {error || 'Failed to verify your email. Please try again or contact support.'}
          </Typography>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Box>
      )}
    </Card>
  );
};

export default VerifyEmail;