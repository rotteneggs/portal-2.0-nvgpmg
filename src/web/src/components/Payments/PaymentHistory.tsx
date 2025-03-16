import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { 
  Box, 
  Grid, 
  Typography, 
  Chip, 
  Tooltip, 
  IconButton 
} from '@mui/material'; // @mui/material ^5.11.10
import { 
  ReceiptOutlined, 
  FilterListOutlined, 
  ClearOutlined 
} from '@mui/icons-material'; // @mui/icons-material ^5.11.9

import Card from '../Common/Card';
import Table from '../Common/Table';
import Button from '../Common/Button';
import Select from '../Common/Select';
import DatePicker from '../Common/DatePicker';
import StatusBadge from '../Common/StatusBadge';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import EmptyState from '../Common/EmptyState';
import { 
  Payment, 
  PaymentType, 
  PaymentMethod, 
  PaymentStatus, 
  PaymentFilterOptions 
} from '../../types/payment';
import { ID } from '../../types/common';
import { 
  fetchPayments, 
  selectPayments, 
  selectPaymentLoading, 
  selectPaymentError, 
  selectPaymentPagination,
  selectPaymentFilters 
} from '../../redux/slices/paymentsSlice';
import PaymentService from '../../services/PaymentService';
import { formatDate } from '../../utils/dateUtils';

/**
 * Props for the PaymentHistory component
 */
export interface PaymentHistoryProps {
  /** Optional ID of the application to filter payments for */
  applicationId?: ID | undefined;
  /** Callback function when a receipt is requested */
  onViewReceipt: (paymentId: ID) => void;
  /** Additional CSS class for styling */
  className?: string;
}

/**
 * State for payment history filters
 */
interface PaymentHistoryFilters {
  paymentType: PaymentType | null;
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

// Styled components for layout and styling
const HistoryContainer = styled(Box)`
  padding: 16px;
`;

const FiltersContainer = styled(Box)`
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const FilterGroup = styled(Box)`
  display: flex;
  flex-direction: column;
  min-width: 200px;
`;

const FilterActions = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TableContainer = styled(Box)`
  margin-top: 16px;
`;

const PaginationContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;

const StatusBadgeWrapper = styled(Box)`
  display: inline-block;
`;

const ErrorMessage = styled(Typography)`
  color: red;
  margin-top: 8px;
`;

/**
 * Component that displays a paginated table of payment history with filtering options
 */
const PaymentHistory: React.FC<PaymentHistoryProps> = ({ 
  applicationId, 
  onViewReceipt, 
  className = '' 
}) => {
  // Initialize Redux dispatch and selectors for payment data
  const dispatch = useDispatch();
  const payments = useSelector(selectPayments);
  const loading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const pagination = useSelector(selectPaymentPagination);
  const filters = useSelector(selectPaymentFilters);

  // Set up state for pagination (page, perPage)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Set up state for filters (payment type, payment method, status, date range)
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // Create memoized filter options object
  const filterOptions = useMemo<PaymentFilterOptions>(() => ({
    payment_type: paymentType,
    payment_method: paymentMethod,
    status: status,
    date_from: dateFrom ? formatDate(dateFrom, 'yyyy-MM-dd') : null,
    date_to: dateTo ? formatDate(dateTo, 'yyyy-MM-dd') : null,
    application_id: applicationId || null
  }), [paymentType, paymentMethod, status, dateFrom, dateTo, applicationId]);

  // Fetch payments data on component mount and when filters or pagination change
  useEffect(() => {
    dispatch(fetchPayments({ page, perPage, filters: filterOptions }));
  }, [dispatch, page, perPage, filterOptions]);

  // Handle pagination change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage + 1); // Material UI Pagination component is 0-indexed
  }, []);

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing rows per page
  }, []);

  // Handle filter changes
  const handlePaymentTypeChange = useCallback((event: any) => {
    setPaymentType(event.target.value || null);
  }, []);

  const handlePaymentMethodChange = useCallback((event: any) => {
    setPaymentMethod(event.target.value || null);
  }, []);

  const handleStatusChange = useCallback((event: any) => {
    setStatus(event.target.value || null);
  }, []);

  const handleDateFromChange = useCallback((date: Date | null) => {
    setDateFrom(date);
  }, []);

  const handleDateToChange = useCallback((date: Date | null) => {
    setDateTo(date);
  }, []);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    setPaymentType(null);
    setPaymentMethod(null);
    setStatus(null);
    setDateFrom(null);
    setDateTo(null);
  }, []);

  // Define table columns with appropriate headers and cell renderers
  const columns = useMemo(() => [
    {
      id: 'paid_at',
      label: 'Date',
      render: (value: string) => formatDate(value, 'MM/dd/yyyy'),
      sortable: true,
      width: '12%'
    },
    {
      id: 'payment_type',
      label: 'Type',
      render: (value: PaymentType) => PaymentService.getPaymentTypeLabel(value),
      sortable: false,
      width: '15%'
    },
    {
      id: 'amount',
      label: 'Amount',
      render: (value: number, row: Payment) => PaymentService.formatPaymentAmount(value, row.currency),
      sortable: false,
      align: 'right',
      width: '12%'
    },
    {
      id: 'status',
      label: 'Status',
      render: (value: PaymentStatus) => (
        <StatusBadgeWrapper>
          <StatusBadge status={value} type="PAYMENT" />
        </StatusBadgeWrapper>
      ),
      sortable: false,
      width: '15%'
    },
    {
      id: 'payment_method',
      label: 'Method',
      render: (value: PaymentMethod) => PaymentService.getPaymentMethodLabel(value),
      sortable: false,
      width: '15%'
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (_: any, row: Payment) => (
        <Tooltip title="View Receipt">
          <IconButton onClick={() => onViewReceipt(row.id)}>
            <ReceiptOutlined />
          </IconButton>
        </Tooltip>
      ),
      sortable: false,
      align: 'center',
      width: '8%'
    }
  ], [onViewReceipt]);

  // Payment type options for the select component
  const paymentTypeOptions = useMemo(() => {
    return [
      { value: '', label: 'All Payment Types' },
      { value: PaymentType.APPLICATION_FEE, label: PaymentService.getPaymentTypeLabel(PaymentType.APPLICATION_FEE) },
      { value: PaymentType.ENROLLMENT_DEPOSIT, label: PaymentService.getPaymentTypeLabel(PaymentType.ENROLLMENT_DEPOSIT) },
      { value: PaymentType.TUITION, label: PaymentService.getPaymentTypeLabel(PaymentType.TUITION) },
      { value: PaymentType.OTHER, label: PaymentService.getPaymentTypeLabel(PaymentType.OTHER) },
    ];
  }, []);

  // Payment method options for the select component
  const paymentMethodOptions = useMemo(() => {
    return [
      { value: '', label: 'All Payment Methods' },
      { value: PaymentMethod.CREDIT_CARD, label: PaymentService.getPaymentMethodLabel(PaymentMethod.CREDIT_CARD) },
      { value: PaymentMethod.DEBIT_CARD, label: PaymentService.getPaymentMethodLabel(PaymentMethod.DEBIT_CARD) },
      { value: PaymentMethod.BANK_TRANSFER, label: PaymentService.getPaymentMethodLabel(PaymentMethod.BANK_TRANSFER) },
      { value: PaymentMethod.WIRE_TRANSFER, label: PaymentService.getPaymentMethodLabel(PaymentMethod.WIRE_TRANSFER) },
      { value: PaymentMethod.INTERNATIONAL_PAYMENT, label: PaymentService.getPaymentMethodLabel(PaymentMethod.INTERNATIONAL_PAYMENT) },
    ];
  }, []);

  // Payment status options for the select component
  const paymentStatusOptions = useMemo(() => {
    return [
      { value: '', label: 'All Statuses' },
      { value: PaymentStatus.PENDING, label: PaymentService.getPaymentStatusLabel(PaymentStatus.PENDING) },
      { value: PaymentStatus.PROCESSING, label: PaymentService.getPaymentStatusLabel(PaymentStatus.PROCESSING) },
      { value: PaymentStatus.COMPLETED, label: PaymentService.getPaymentStatusLabel(PaymentStatus.COMPLETED) },
      { value: PaymentStatus.FAILED, label: PaymentService.getPaymentStatusLabel(PaymentStatus.FAILED) },
      { value: PaymentStatus.REFUNDED, label: PaymentService.getPaymentStatusLabel(PaymentStatus.REFUNDED) },
      { value: PaymentStatus.PARTIALLY_REFUNDED, label: PaymentService.getPaymentStatusLabel(PaymentStatus.PARTIALLY_REFUNDED) },
    ];
  }, []);

  return (
    <Card title="Payment History" className={className}>
      <FiltersContainer>
        <FilterGroup>
          <Typography variant="subtitle2">Payment Type</Typography>
          <Select
            name="paymentType"
            label="Payment Type"
            value={paymentType || ''}
            onChange={handlePaymentTypeChange}
            options={paymentTypeOptions}
            fullWidth={false}
          />
        </FilterGroup>
        <FilterGroup>
          <Typography variant="subtitle2">Payment Method</Typography>
          <Select
            name="paymentMethod"
            label="Payment Method"
            value={paymentMethod || ''}
            onChange={handlePaymentMethodChange}
            options={paymentMethodOptions}
            fullWidth={false}
          />
        </FilterGroup>
        <FilterGroup>
          <Typography variant="subtitle2">Status</Typography>
          <Select
            name="status"
            label="Status"
            value={status || ''}
            onChange={handleStatusChange}
            options={paymentStatusOptions}
            fullWidth={false}
          />
        </FilterGroup>
        <FilterGroup>
          <Typography variant="subtitle2">Date Range</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <DatePicker
                label="From"
                value={dateFrom}
                onChange={handleDateFromChange}
                format="MM/dd/yyyy"
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="To"
                value={dateTo}
                onChange={handleDateToChange}
                format="MM/dd/yyyy"
              />
            </Grid>
          </Grid>
        </FilterGroup>
        <FilterActions>
          <Button
            variant="outlined"
            startIcon={<FilterListOutlined />}
            onClick={() => { /* Apply Filters */ }}
          >
            Apply Filters
          </Button>
          <Button
            variant="text"
            color="primary"
            startIcon={<ClearOutlined />}
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
        </FilterActions>
      </FiltersContainer>

      <TableContainer>
        {loading ? (
          <LoadingSkeleton variant="table" count={5} />
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : payments.length > 0 ? (
          <Table
            columns={columns}
            data={payments}
            pagination={pagination}
            totalCount={pagination.total}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        ) : (
          <EmptyState message="No payment history available." />
        )}
      </TableContainer>

      {pagination && (
        <PaginationContainer>
          {/* Pagination controls will be rendered here */}
        </PaginationContainer>
      )}
    </Card>
  );
};

export default PaymentHistory;