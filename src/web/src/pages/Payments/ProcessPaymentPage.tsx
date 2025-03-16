import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import styled from '@emotion/styled'; // @emotion/styled v11.10.6
import { Box, Grid, Typography, Stepper, Step, StepLabel, Alert, CircularProgress } from '@mui/material'; // @mui/material v5.11.10
import { DashboardLayout } from '../../layouts/DashboardLayout'; // src/web/src/layouts/DashboardLayout.tsx
import PaymentForm from '../../components/Payments/PaymentForm'; // src/web/src/components/Payments/PaymentForm.tsx
import PaymentReceipt from '../../components/Payments/PaymentReceipt'; // src/web/src/components/Payments/PaymentReceipt.tsx
import Card from '../../components/Common/Card'; // src/web/src/components/Common/Card.tsx
import Button from '../../components/Common/Button'; // src/web/src/components/Common/Button.tsx
import LoadingSkeleton from '../../components/Common/LoadingSkeleton'; // src/web/src/components/Common/LoadingSkeleton.tsx
import {
  PaymentType,
  PaymentInitialization,
  PaymentProcessingResult,
} from '../../types/payment'; // src/web/src/types/payment.ts
import {
  processPayment,
  selectPaymentInitialization,
  selectPaymentResult,
  selectProcessingPayment,
  selectPaymentError,
  clearPaymentResult,
} from '../../redux/slices/paymentsSlice'; // src/web/src/redux/slices/paymentsSlice.ts
import PaymentService from '../../services/PaymentService'; // src/web/src/services/PaymentService.ts

// Define styled components for layout and styling
const PageContainer = styled(Box)`
  max-width: 800px;
  margin: 0 auto;
  padding: ${theme => theme.spacing(3)};
`;

const StepperContainer = styled(Box)`
  margin-bottom: ${theme => theme.spacing(4)};
`;

const ContentContainer = styled(Box)`
  margin-bottom: ${theme => theme.spacing(3)};
`;

const ProcessingContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme => theme.spacing(4)};
  text-align: center;
`;

const ResultContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${theme => theme.spacing(4)};
  text-align: center;
`;

const ButtonContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-top: ${theme => theme.spacing(3)};
`;

// Define the ProcessPaymentPageProps interface
interface ProcessPaymentPageProps {}

/**
 * Page component that handles the payment processing workflow
 * @returns Rendered ProcessPaymentPage component
 */
const ProcessPaymentPage: React.FC<ProcessPaymentPageProps> = () => {
  // Get route parameters including applicationId
  const { applicationId } = useParams<{ applicationId: string }>();

  // Get location object for extracting query parameters
  const location = useLocation();

  // Set up Redux dispatch and selectors for payment state
  const dispatch = useDispatch();
  const paymentInitialization = useSelector(selectPaymentInitialization);
  const paymentResult = useSelector(selectPaymentResult);
  const isProcessing = useSelector(selectProcessingPayment);
  const paymentError = useSelector(selectPaymentError);

  // Initialize state for current step in payment process
  const [activeStep, setActiveStep] = useState(0);

  // Initialize state for payment initialization data
  const [paymentDetails, setPaymentDetails] = useState<Record<string, any> | null>(null);

  // Initialize state for showing receipt
  const [showReceipt, setShowReceipt] = useState(false);

  // Extract payment details from URL if returning from external payment provider
  useEffect(() => {
    const extractedDetails = PaymentService.extractPaymentDetailsFromUrl(location);
    if (Object.keys(extractedDetails).length > 0) {
      setPaymentDetails(extractedDetails);
    }
  }, [location]);

  // Handle payment initialization callback from PaymentForm
  const handlePaymentInitialized = useCallback((initializationData: PaymentInitialization) => {
    if (initializationData?.redirect_url) {
      // Redirect to external payment provider
      window.location.href = initializationData.redirect_url;
    }
  }, []);

  // Handle payment processing with extracted details or direct processing
  useEffect(() => {
    if (paymentInitialization && paymentDetails) {
      // Process payment with extracted details
      dispatch(
        processPayment({
          paymentId: paymentInitialization.payment_id,
          paymentDetails: paymentDetails,
        }) as any
      );
      setActiveStep(2);
    }
  }, [dispatch, paymentInitialization, paymentDetails]);

  // Handle navigation back to previous page
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Handle closing receipt and navigating to dashboard
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    dispatch(clearPaymentResult());
    setActiveStep(0);
  };

  useEffect(() => {
    if (paymentResult?.success) {
      setShowReceipt(true);
    }
  }, [paymentResult]);

  // Render DashboardLayout with appropriate title
  return (
    <DashboardLayout title="Payment Processing">
      <PageContainer>
        <StepperContainer>
          <Stepper activeStep={activeStep} alternativeLabel>
            <Step key={0}>
              <StepLabel>Enter Payment Details</StepLabel>
            </Step>
            <Step key={1}>
              <StepLabel>Processing Payment</StepLabel>
            </Step>
            <Step key={2}>
              <StepLabel>Payment Result</StepLabel>
            </Step>
          </Stepper>
        </StepperContainer>

        <ContentContainer>
          {activeStep === 0 && (
            <PaymentForm
              applicationId={applicationId}
              onPaymentInitialized={handlePaymentInitialized}
              onCancel={handleBack}
            />
          )}

          {activeStep === 1 && (
            <Card title="Processing Payment">
              <ProcessingContainer>
                <Typography variant="h6" gutterBottom>
                  Processing your payment...
                </Typography>
                <CircularProgress />
              </ProcessingContainer>
            </Card>
          )}

          {activeStep === 2 && (
            <Card title="Payment Result">
              <ResultContainer>
                {paymentError ? (
                  <Alert severity="error">
                    Payment failed: {paymentError}
                  </Alert>
                ) : paymentResult?.success ? (
                  <Alert severity="success">
                    Payment successful!
                  </Alert>
                ) : (
                  <Alert severity="warning">
                    Payment processing is still pending.
                  </Alert>
                )}
                <ButtonContainer>
                  <Button variant="outlined" onClick={handleCloseReceipt}>
                    Return to Dashboard
                  </Button>
                </ButtonContainer>
              </ResultContainer>
            </Card>
          )}
        </ContentContainer>

        {showReceipt && paymentResult?.success && (
          <PaymentReceipt
            paymentId={paymentResult.payment_id}
            onClose={handleCloseReceipt}
          />
        )}
      </PageContainer>
    </DashboardLayout>
  );
};

export default ProcessPaymentPage;