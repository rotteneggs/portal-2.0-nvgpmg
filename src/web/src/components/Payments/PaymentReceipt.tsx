import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from '@emotion/styled';
import { Box, Grid, Typography, Paper, Divider } from '@mui/material';
import { PrintOutlined, GetAppOutlined, CloseOutlined } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';

import Card from '../Common/Card';
import Button from '../Common/Button';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import { PaymentReceipt as PaymentReceiptType } from '../../types/payment';
import { ID } from '../../types/common';
import { 
  fetchPaymentReceipt, 
  selectPaymentLoading, 
  selectPaymentError 
} from '../../redux/slices/paymentsSlice';
import PaymentService from '../../services/PaymentService';
import { formatDate } from '../../utils/dateUtils';

/**
 * Props for the PaymentReceipt component
 */
interface PaymentReceiptProps {
  paymentId: ID;
  onClose: () => void;
  className?: string;
}

// Styled components
const ReceiptContainer = styled(Box)`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const ReceiptPaper = styled(Paper)`
  padding: 24px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
  background-color: #ffffff;
  border-radius: 4px;
`;

const ReceiptHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ReceiptSection = styled(Box)`
  margin-bottom: 24px;
`;

const ReceiptSectionTitle = styled(Typography)`
  font-weight: 500;
  margin-bottom: 16px;
  color: #1976D2;
`;

const ReceiptRow = styled(Grid)`
  margin-bottom: 8px;
`;

const ReceiptLabel = styled(Typography)`
  font-weight: 500;
  color: #212121;
`;

const ReceiptValue = styled(Typography)`
  color: #424242;
`;

const ReceiptAmount = styled(Typography)`
  font-weight: 700;
  font-size: 1.2rem;
  color: #1976D2;
`;

const ReceiptFooter = styled(Box)`
  text-align: center;
  margin-top: 32px;
`;

const ActionButtons = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
`;

const ErrorMessage = styled(Typography)`
  color: #F44336;
  margin: 16px 0;
  text-align: center;
`;

const PrintableContent = styled(Box)`
  @media print {
    padding: 20px;
    
    & button {
      display: none;
    }
  }
`;

/**
 * A component that displays a detailed payment receipt with transaction information and payment details.
 * Allows users to print or download the receipt as PDF.
 * 
 * @param paymentId - ID of the payment to display receipt for
 * @param onClose - Callback function when the receipt is closed
 * @param className - Additional CSS class for styling
 */
const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ paymentId, onClose, className = '' }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const [receipt, setReceipt] = useState<PaymentReceiptType | null>(null);
  
  // Reference for printable content
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch receipt data when component mounts
  useEffect(() => {
    if (paymentId) {
      dispatch(fetchPaymentReceipt(paymentId) as any)
        .then((action: any) => {
          if (action.payload) {
            setReceipt(action.payload);
          }
        });
    }
  }, [dispatch, paymentId]);

  // Handle printing functionality
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Payment_Receipt_${receipt?.receipt_number || ''}`,
    onAfterPrint: () => {
      console.log('Print completed successfully');
    }
  });

  // Handle download as PDF
  const handleDownload = () => {
    if (!receipt) return;
    
    // In a real implementation, this would use a library like jsPDF to generate a PDF
    // or call a backend endpoint to generate and return a PDF file
    // For this example, we'll just print to simulate PDF generation
    
    alert('In a production environment, this would generate and download a PDF file of the receipt.');
    // As a fallback, trigger the print function which can be saved as PDF
    handlePrint();
  };

  // Render loading skeleton while fetching data
  if (isLoading) {
    return (
      <Card title="Payment Receipt" className={className}>
        <LoadingSkeleton variant="rectangular" height={500} />
      </Card>
    );
  }

  // Render error message if data fetching failed
  if (error) {
    return (
      <Card title="Payment Receipt" className={className}>
        <ErrorMessage variant="body1">
          Unable to load receipt: {error}
        </ErrorMessage>
        <ActionButtons>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={onClose}
            startIcon={<CloseOutlined />}
          >
            Close
          </Button>
        </ActionButtons>
      </Card>
    );
  }

  // Render empty state if no receipt data is available
  if (!receipt) {
    return (
      <Card title="Payment Receipt" className={className}>
        <ErrorMessage variant="body1">
          No receipt information available.
        </ErrorMessage>
        <ActionButtons>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={onClose}
            startIcon={<CloseOutlined />}
          >
            Close
          </Button>
        </ActionButtons>
      </Card>
    );
  }

  // Render the receipt with all data
  return (
    <Card title="Payment Receipt" className={className}>
      <ReceiptContainer>
        <PrintableContent ref={printRef}>
          <ReceiptPaper>
            {/* Receipt Header */}
            <ReceiptHeader>
              <Box>
                <Typography variant="h5" component="h2">Payment Receipt</Typography>
                <Typography variant="body2" color="textSecondary">
                  Receipt #: {receipt.receipt_number}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                {/* Institution logo would go here in a real implementation */}
                <Typography variant="h6">{receipt.institution_name}</Typography>
              </Box>
            </ReceiptHeader>

            <Divider />

            {/* Transaction Information */}
            <ReceiptSection sx={{ mt: 3 }}>
              <ReceiptSectionTitle variant="h6">Transaction Information</ReceiptSectionTitle>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Transaction ID:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">{receipt.transaction_id}</ReceiptValue>
                </Grid>
              </ReceiptRow>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Payment Type:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">
                    {PaymentService.getPaymentTypeLabel(receipt.payment_type)}
                  </ReceiptValue>
                </Grid>
              </ReceiptRow>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Payment Date:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">
                    {formatDate(receipt.payment_date, 'MMMM dd, yyyy hh:mm a')}
                  </ReceiptValue>
                </Grid>
              </ReceiptRow>
            </ReceiptSection>

            {/* Payer Information */}
            <ReceiptSection>
              <ReceiptSectionTitle variant="h6">Payer Information</ReceiptSectionTitle>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Name:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">{receipt.payer_name}</ReceiptValue>
                </Grid>
              </ReceiptRow>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Email:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">{receipt.payer_email}</ReceiptValue>
                </Grid>
              </ReceiptRow>
            </ReceiptSection>

            {/* Payment Details */}
            <ReceiptSection>
              <ReceiptSectionTitle variant="h6">Payment Details</ReceiptSectionTitle>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Method:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptValue variant="body2">
                    {PaymentService.getPaymentMethodLabel(receipt.payment_method)}
                  </ReceiptValue>
                </Grid>
              </ReceiptRow>
              <ReceiptRow container>
                <Grid item xs={4}>
                  <ReceiptLabel variant="body2">Amount:</ReceiptLabel>
                </Grid>
                <Grid item xs={8}>
                  <ReceiptAmount variant="body1">
                    {PaymentService.formatPaymentAmount(receipt.amount, receipt.currency)}
                  </ReceiptAmount>
                </Grid>
              </ReceiptRow>
              
              {/* Payment details - show additional details if available */}
              {receipt.payment_details && Object.keys(receipt.payment_details).length > 0 && 
                Object.entries(receipt.payment_details).map(([key, value]) => (
                  <ReceiptRow container key={key}>
                    <Grid item xs={4}>
                      <ReceiptLabel variant="body2">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </ReceiptLabel>
                    </Grid>
                    <Grid item xs={8}>
                      <ReceiptValue variant="body2">{value}</ReceiptValue>
                    </Grid>
                  </ReceiptRow>
                ))
              }
            </ReceiptSection>

            {/* Institution Information */}
            <ReceiptFooter>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary">
                {receipt.institution_name}
              </Typography>
              {receipt.institution_address && (
                <Typography variant="body2" color="textSecondary">
                  {receipt.institution_address}
                </Typography>
              )}
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Thank you for your payment.
              </Typography>
            </ReceiptFooter>
          </ReceiptPaper>
        </PrintableContent>

        {/* Action Buttons */}
        <ActionButtons>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintOutlined />}
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<GetAppOutlined />}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<CloseOutlined />}
            onClick={onClose}
          >
            Close
          </Button>
        </ActionButtons>
      </ReceiptContainer>
    </Card>
  );
};

export default PaymentReceipt;