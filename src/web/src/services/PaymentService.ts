/**
 * Service layer for payment processing in the Student Admissions Enrollment Platform.
 * This service provides methods for handling payment operations, including payment initialization,
 * processing, receipt generation, and payment history management. It abstracts the payment API calls
 * and provides a clean interface for components to interact with payment functionality.
 */

import {
  getPayments,
  getPayment,
  getApplicationPayments,
  getPaymentTypes,
  getPaymentMethods,
  initializePayment,
  processPayment,
  getPaymentReceipt,
  requestRefund
} from '../api/payments';

import {
  Payment,
  PaymentFormData,
  PaymentInitialization,
  PaymentProcessingResult,
  PaymentReceipt,
  PaymentMethodInfo,
  PaymentTypeInfo,
  PaymentFilterOptions,
  RefundRequest,
  PaymentType,
  PaymentMethod,
  Currency,
  PaymentStatus
} from '../types/payment';

import { ID } from '../types/common';
import { formatCurrency } from '../utils/formatUtils';

/**
 * Fetches a paginated list of payments with optional filtering
 * @param page - Page number for pagination
 * @param perPage - Number of items per page
 * @param filters - Optional filtering criteria
 * @returns Promise resolving to paginated payment data
 */
const fetchPayments = async (
  page: number = 1,
  perPage: number = 10,
  filters?: PaymentFilterOptions
): Promise<{ payments: Payment[]; pagination: { page: number; perPage: number; total: number } }> => {
  try {
    return await getPayments(page, perPage, filters);
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw new Error('Failed to fetch payments. Please try again later.');
  }
};

/**
 * Fetches details of a specific payment by ID
 * @param paymentId - The ID of the payment to fetch
 * @returns Promise resolving to payment details
 */
const fetchPaymentById = async (paymentId: ID): Promise<Payment> => {
  try {
    return await getPayment(paymentId);
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error);
    throw new Error('Failed to fetch payment details. Please try again later.');
  }
};

/**
 * Fetches payments associated with a specific application
 * @param applicationId - The ID of the application
 * @returns Promise resolving to application payment data
 */
const fetchApplicationPayments = async (applicationId: ID): Promise<Payment[]> => {
  try {
    return await getApplicationPayments(applicationId);
  } catch (error) {
    console.error(`Error fetching payments for application ${applicationId}:`, error);
    throw new Error('Failed to fetch application payments. Please try again later.');
  }
};

/**
 * Fetches available payment types
 * @returns Promise resolving to payment types data
 */
const fetchPaymentTypes = async (): Promise<PaymentTypeInfo[]> => {
  try {
    return await getPaymentTypes();
  } catch (error) {
    console.error('Error fetching payment types:', error);
    throw new Error('Failed to fetch payment types. Please try again later.');
  }
};

/**
 * Fetches available payment methods for a specific payment type
 * @param paymentType - The type of payment
 * @returns Promise resolving to payment methods data
 */
const fetchPaymentMethods = async (paymentType: PaymentType): Promise<PaymentMethodInfo[]> => {
  try {
    return await getPaymentMethods(paymentType);
  } catch (error) {
    console.error(`Error fetching payment methods for ${paymentType}:`, error);
    throw new Error('Failed to fetch payment methods. Please try again later.');
  }
};

/**
 * Initializes a payment transaction
 * @param paymentData - Form data for the payment
 * @returns Promise resolving to payment initialization data
 */
const initializePaymentTransaction = async (paymentData: PaymentFormData): Promise<PaymentInitialization> => {
  try {
    // Validate payment form data
    if (!paymentData.payment_type) {
      throw new Error('Payment type is required');
    }
    if (!paymentData.payment_method) {
      throw new Error('Payment method is required');
    }
    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    return await initializePayment(paymentData);
  } catch (error) {
    console.error('Error initializing payment transaction:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to initialize payment. Please try again later.');
  }
};

/**
 * Processes a payment transaction with payment details
 * @param paymentId - The ID of the payment to process
 * @param paymentDetails - Payment details including provider-specific information
 * @returns Promise resolving to payment processing result
 */
const processPaymentTransaction = async (
  paymentId: ID,
  paymentDetails: Record<string, any>
): Promise<PaymentProcessingResult> => {
  try {
    return await processPayment(paymentId, paymentDetails);
  } catch (error) {
    console.error(`Error processing payment ${paymentId}:`, error);
    throw new Error('Failed to process payment. Please try again later.');
  }
};

/**
 * Fetches receipt for a completed payment
 * @param paymentId - The ID of the payment
 * @returns Promise resolving to payment receipt data
 */
const fetchPaymentReceipt = async (paymentId: ID): Promise<PaymentReceipt> => {
  try {
    return await getPaymentReceipt(paymentId);
  } catch (error) {
    console.error(`Error fetching receipt for payment ${paymentId}:`, error);
    throw new Error('Failed to fetch payment receipt. Please try again later.');
  }
};

/**
 * Requests a refund for a payment (admin/staff only)
 * @param paymentId - The ID of the payment to refund
 * @param reason - The reason for the refund
 * @param amount - Optional partial refund amount (full refund if not specified)
 * @returns Promise resolving to refund request result
 */
const requestPaymentRefund = async (
  paymentId: ID,
  reason: string,
  amount?: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const refundRequest: RefundRequest = {
      payment_id: paymentId,
      reason,
      amount: amount || null
    };

    return await requestRefund(refundRequest);
  } catch (error) {
    console.error(`Error requesting refund for payment ${paymentId}:`, error);
    throw new Error('Failed to request refund. Please try again later.');
  }
};

/**
 * Formats a payment amount with currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code
 * @returns Formatted payment amount with currency symbol
 */
const formatPaymentAmount = (amount: number, currency: Currency): string => {
  return formatCurrency(amount, currency);
};

/**
 * Gets a human-readable label for a payment status
 * @param status - The payment status code
 * @returns Human-readable status label
 */
const getPaymentStatusLabel = (status: PaymentStatus): string => {
  switch (status) {
    case PaymentStatus.PENDING:
      return 'Pending';
    case PaymentStatus.PROCESSING:
      return 'Processing';
    case PaymentStatus.COMPLETED:
      return 'Completed';
    case PaymentStatus.FAILED:
      return 'Failed';
    case PaymentStatus.REFUNDED:
      return 'Refunded';
    case PaymentStatus.PARTIALLY_REFUNDED:
      return 'Partially Refunded';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
};

/**
 * Gets a human-readable label for a payment type
 * @param type - The payment type code
 * @returns Human-readable payment type label
 */
const getPaymentTypeLabel = (type: PaymentType): string => {
  switch (type) {
    case PaymentType.APPLICATION_FEE:
      return 'Application Fee';
    case PaymentType.ENROLLMENT_DEPOSIT:
      return 'Enrollment Deposit';
    case PaymentType.TUITION:
      return 'Tuition';
    case PaymentType.OTHER:
      return 'Other Payment';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
};

/**
 * Gets a human-readable label for a payment method
 * @param method - The payment method code
 * @returns Human-readable payment method label
 */
const getPaymentMethodLabel = (method: PaymentMethod): string => {
  switch (method) {
    case PaymentMethod.CREDIT_CARD:
      return 'Credit Card';
    case PaymentMethod.DEBIT_CARD:
      return 'Debit Card';
    case PaymentMethod.BANK_TRANSFER:
      return 'Bank Transfer';
    case PaymentMethod.WIRE_TRANSFER:
      return 'Wire Transfer';
    case PaymentMethod.INTERNATIONAL_PAYMENT:
      return 'International Payment';
    default:
      return method.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }
};

/**
 * Extracts payment details from URL query parameters or hash fragment
 * @param location - The browser location object
 * @returns Extracted payment details as key-value pairs
 */
const extractPaymentDetailsFromUrl = (location: Location): Record<string, any> => {
  const params: Record<string, any> = {};
  
  // Get search params from location.search
  const searchParams = new URLSearchParams(location.search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Get hash params from location.hash if present
  if (location.hash && location.hash.includes('?')) {
    const hashSearch = location.hash.substring(location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashSearch);
    hashParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  // Parse and combine all parameters into a single object
  return params;
};

const PaymentService = {
  fetchPayments,
  fetchPaymentById,
  fetchApplicationPayments,
  fetchPaymentTypes,
  fetchPaymentMethods,
  initializePaymentTransaction,
  processPaymentTransaction,
  fetchPaymentReceipt,
  requestPaymentRefund,
  formatPaymentAmount,
  getPaymentStatusLabel,
  getPaymentTypeLabel,
  getPaymentMethodLabel,
  extractPaymentDetailsFromUrl
};

export default PaymentService;