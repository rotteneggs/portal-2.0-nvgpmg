import React, { useCallback } from 'react'; // react v18.2.0
import { useDispatch } from 'react-redux'; // react-redux v8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // @mui/material v5.11.10
import { ReceiptOutlined, HistoryOutlined } from '@mui/icons-material'; // @mui/icons-material ^5.11.9

import DashboardLayout from '../../layouts/DashboardLayout';
import Breadcrumbs from '../../components/Common/Breadcrumbs';
import Card from '../../components/Common/Card';
import PaymentHistory from '../../components/Payments/PaymentHistory';
import useModal from '../../hooks/useModal';
import { fetchPaymentReceipt } from '../../redux/slices/paymentsSlice';
import { ID } from '../../types/common';
import { PaymentReceipt } from '../../types/payment';

/**
 * Interface defining the state for the receipt viewing dialog
 */
interface ReceiptDialogState {
  open: boolean;
  receipt: PaymentReceipt | null;
  loading: boolean;
  error: string | null;
}

// Styled components for layout and styling
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PageTitle = styled(Typography)`
  font-size: 1.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ReceiptContent = styled(Box)`
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 16px;
`;

const ReceiptRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ReceiptLabel = styled(Typography)`
  font-weight: 500;
  color: #666;
`;

const ReceiptValue = styled(Typography)`
  font-weight: 400;
`;

const ErrorMessage = styled(Typography)`
  color: #f44336;
  margin: 16px 0;
`;

/**
 * Page component for displaying payment history
 */
const PaymentHistoryPage: React.FC = () => {
  // Initialize Redux dispatch for actions
  const dispatch = useDispatch();

  // Set up state for receipt viewing modal
  const { isOpen: isReceiptOpen, openModal: openReceiptModal, closeModal: closeReceiptModal } = useModal();

  // Set up state for current receipt data
  const [currentReceipt, setCurrentReceipt] = React.useState<PaymentReceipt | null>(null);

  // Set up state for receipt loading status
  const [receiptLoading, setReceiptLoading] = React.useState<boolean>(false);

  // Set up state for receipt error message
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  // Define breadcrumb items for navigation context
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Payments', path: '/payments' },
    { label: 'Payment History', path: '/payments/history' },
  ];

  /**
   * Handle receipt viewing when a receipt is requested
   */
  const handleViewReceipt = useCallback((paymentId: ID) => {
    openReceiptModal();
    setCurrentReceipt(null);
    setReceiptError(null);
    setReceiptLoading(true);

    // Fetch receipt data when a receipt is requested
    dispatch(fetchPaymentReceipt(paymentId))
      .unwrap()
      .then((receipt) => {
        setCurrentReceipt(receipt);
        setReceiptLoading(false);
      })
      .catch((error) => {
        setReceiptError(error.message || 'Failed to fetch receipt.');
        setReceiptLoading(false);
      });
  }, [dispatch, openReceiptModal]);

  /**
   * Handle closing the receipt modal
   */
  const handleCloseReceiptModal = useCallback(() => {
    closeReceiptModal();
    setCurrentReceipt(null);
    setReceiptError(null);
  }, [closeReceiptModal]);

  return (
    <DashboardLayout title="Payment History">
      <PageContainer>
        <PageHeader>
          <PageTitle variant="h5" component="h1">
            <HistoryOutlined fontSize="medium" />
            Payment History
          </PageTitle>
        </PageHeader>

        <Breadcrumbs items={breadcrumbItems} />

        {/* Render PaymentHistory component with onViewReceipt callback */}
        <PaymentHistory onViewReceipt={handleViewReceipt} />

        {/* Render receipt dialog when a receipt is being viewed */}
        <Dialog
          open={isReceiptOpen}
          onClose={handleCloseReceiptModal}
          aria-labelledby="payment-receipt-dialog-title"
        >
          <DialogTitle id="payment-receipt-dialog-title">
            Payment Receipt
          </DialogTitle>
          <DialogContent>
            {receiptLoading && (
              <Box>Loading receipt...</Box>
            )}
            {receiptError && (
              <ErrorMessage>{receiptError}</ErrorMessage>
            )}
            {currentReceipt && (
              <ReceiptContent>
                <ReceiptRow>
                  <ReceiptLabel>Payment ID:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payment_id}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Transaction ID:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.transaction_id}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Payment Type:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payment_type}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Payment Method:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payment_method}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Amount:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.amount} {currentReceipt.currency}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Payment Date:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payment_date}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Payer Name:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payer_name}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Payer Email:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.payer_email}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Receipt Number:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.receipt_number}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Institution Name:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.institution_name}</ReceiptValue>
                </ReceiptRow>
                <ReceiptRow>
                  <ReceiptLabel>Institution Address:</ReceiptLabel>
                  <ReceiptValue>{currentReceipt.institution_address}</ReceiptValue>
                </ReceiptRow>
                {/* Add more receipt details here */}
              </ReceiptContent>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReceiptModal}>Close</Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </DashboardLayout>
  );
};

export default PaymentHistoryPage;