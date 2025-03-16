import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import { useNavigate, useParams } from 'react-router-dom'; // react-router-dom v6.8.1
import styled from '@emotion/styled'; // @emotion/styled v11.10.6
import { Box, Grid, Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // @mui/material v5.11.10
import { PaymentOutlined, HistoryOutlined, ReceiptOutlined } from '@mui/icons-material'; // @mui/icons-material v5.11.9

import DashboardLayout from '../../layouts/DashboardLayout';
import Breadcrumbs from '../../components/Common/Breadcrumbs';
import Card from '../../components/Common/Card';
import Tabs from '../../components/Common/Tabs';
import Button from '../../components/Common/Button';
import { PaymentForm, PaymentHistory, FeeWaiverRequest } from '../../components/Payments';
import useModal from '../../hooks/useModal';
import useNotification from '../../hooks/useNotification';
import {
  fetchPaymentTypes,
  fetchApplicationPayments,
  selectPaymentTypes,
  selectPaymentLoading,
  selectPaymentError,
  selectPaymentInitialization,
} from '../../redux/slices/paymentsSlice';
import { PaymentType, PaymentTypeInfo, PaymentInitialization } from '../../types/payment';
import { ID } from '../../types/common';
import PaymentService from '../../services/PaymentService';

/**
 * Interface defining the structure for outstanding fee data
 */
interface OutstandingFee {
  paymentType: PaymentTypeInfo;
  dueDate: string;
}

// Styled Components
const PageContainer = styled(Box)`
  padding: 24px;
`;

const SectionTitle = styled(Typography)`
  margin-bottom: 16px;
  font-weight: 500;
  color: #212121;
`;

const FeesContainer = styled(Box)`
  margin-bottom: 24px;
`;

const FeeItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #EEEEEE;
  border-radius: 4px;
  margin-bottom: 8px;
`;

const FeeDetails = styled(Box)`
  display: flex;
  flex-direction: column;
`;

const FeeTitle = styled(Typography)`
  font-weight: 500;
  color: #212121;
`;

const FeeAmount = styled(Typography)`
  font-weight: 700;
  font-size: 1.2rem;
  color: #1976D2;
`;

const FeeDueDate = styled(Typography)`
  color: #757575;
`;

const ActionButtons = styled(Box)`
  display: flex;
  gap: 8px;
`;

const TotalSection = styled(Box)`
  text-align: right;
  margin-top: 24px;
`;

const HistorySection = styled(Box)`
  margin-top: 24px;
`;

/**
 * Main payments page component that displays outstanding fees, payment options, and payment history
 */
const PaymentsPage: React.FC = () => {
  // Initialize Redux dispatch for actions
  const dispatch = useDispatch();

  // Get application ID from URL parameters if available
  const { applicationId } = useParams<{ applicationId: string }>();

  // Set up navigation for redirecting after payment
  const navigate = useNavigate();

  // Initialize notification hook for displaying messages
  const { showSuccess, showError } = useNotification();

  // Set up state for active tab index
  const [activeTab, setActiveTab] = useState(0);

  // Set up state for payment form modal
  const { isOpen: isPaymentFormOpen, openModal: openPaymentForm, closeModal: closePaymentForm } = useModal();

  // Set up state for fee waiver request modal
  const { isOpen: isFeeWaiverOpen, openModal: openFeeWaiver, closeModal: closeFeeWaiver } = useModal();

  // Set up state for selected payment type
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentTypeInfo | null>(null);

  // Select payment types, loading state, error state, and payment initialization from Redux
  const paymentTypes = useSelector(selectPaymentTypes);
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const paymentInitialization = useSelector(selectPaymentInitialization);

  // Fetch payment types on component mount
  useEffect(() => {
    dispatch(fetchPaymentTypes());
  }, [dispatch]);

  // Fetch application payments if application ID is provided
  useEffect(() => {
    if (applicationId) {
      dispatch(fetchApplicationPayments(parseInt(applicationId)));
    }
  }, [dispatch, applicationId]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle opening payment form for a specific payment type
  const handleOpenPaymentForm = (paymentType: PaymentTypeInfo) => {
    setSelectedPaymentType(paymentType);
    openPaymentForm();
  };

  // Handle opening fee waiver request form
  const handleOpenFeeWaiver = () => {
    openFeeWaiver();
  };

  // Handle payment initialization success
  const handlePaymentInitialized = useCallback((paymentInitialization: PaymentInitialization) => {
    // Redirect to payment processing page with payment ID
    navigate(`/payments/process/${paymentInitialization.payment_id}`);
  }, [navigate]);

  // Handle payment form cancellation
  const handlePaymentFormCancel = () => {
    closePaymentForm();
    setSelectedPaymentType(null);
  };

  // Handle fee waiver request submission
  const handleFeeWaiverSubmit = () => {
    closeFeeWaiver();
    showSuccess('Fee waiver request submitted successfully!');
  };

  // Handle fee waiver request cancellation
  const handleFeeWaiverCancel = () => {
    closeFeeWaiver();
  };

  // Define breadcrumb items for navigation context
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Payment Center', path: '/payments' },
  ];

  // Outstanding fees data
  const outstandingFees: OutstandingFee[] = paymentTypes.map(paymentType => ({
    paymentType: paymentType,
    dueDate: 'April 15, 2024', // Replace with actual due date from API
  }));

  return (
    <DashboardLayout title="Payment Center">
      <Breadcrumbs items={breadcrumbItems} />
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        tabs={[
          {
            label: (
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentOutlined />
                Outstanding Fees
              </Box>
            ),
            content: (
              <FeesContainer>
                {outstandingFees.map((fee, index) => (
                  <FeeItem key={index}>
                    <FeeDetails>
                      <FeeTitle variant="subtitle1">{fee.paymentType.name}</FeeTitle>
                      <FeeAmount variant="h6">{PaymentService.formatPaymentAmount(fee.paymentType.amount, fee.paymentType.currency)}</FeeAmount>
                      <FeeDueDate variant="body2">Due Date: {fee.dueDate}</FeeDueDate>
                    </FeeDetails>
                    <ActionButtons>
                      <Button variant="contained" color="primary" onClick={() => handleOpenPaymentForm(fee.paymentType)}>
                        Pay Now
                      </Button>
                      <Button variant="outlined" onClick={handleOpenFeeWaiver}>
                        Request Fee Waiver
                      </Button>
                    </ActionButtons>
                  </FeeItem>
                ))}
                <TotalSection>
                  <Typography variant="h6">Total Due: $575.00</Typography>
                </TotalSection>
              </FeesContainer>
            ),
          },
          {
            label: (
              <Box display="flex" alignItems="center" gap={1}>
                <HistoryOutlined />
                Payment History
              </Box>
            ),
            content: (
              <HistorySection>
                <PaymentHistory applicationId={applicationId} onViewReceipt={() => {}} />
              </HistorySection>
            ),
          },
        ]}
      />

      {/* Payment Form Modal */}
      <Dialog open={isPaymentFormOpen} onClose={closePaymentForm} fullWidth maxWidth="sm">
        <DialogTitle>Payment Form</DialogTitle>
        <DialogContent>
          {selectedPaymentType && (
            <PaymentForm
              applicationId={applicationId}
              initialPaymentType={selectedPaymentType.code as PaymentType}
              initialAmount={selectedPaymentType.amount}
              onPaymentInitialized={handlePaymentInitialized}
              onCancel={handlePaymentFormCancel}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePaymentFormCancel} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fee Waiver Request Modal */}
      <Dialog open={isFeeWaiverOpen} onClose={closeFeeWaiver} fullWidth maxWidth="sm">
        <DialogTitle>Fee Waiver Request</DialogTitle>
        <DialogContent>
          <FeeWaiverRequest
            applicationId={applicationId}
            onRequestComplete={handleFeeWaiverSubmit}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFeeWaiverCancel} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default PaymentsPage;