/**
 * API client module for payment-related operations in the Student Admissions Enrollment Platform.
 * This module provides functions to interact with the payment endpoints of the backend API,
 * handling payment initialization, processing, and management.
 */

import apiClient from './apiClient'; // axios v1.3.4 wrapped with custom handling
import {
  Payment,
  PaymentFormData,
  PaymentInitialization,
  PaymentProcessingResult,
  PaymentReceipt,
  PaymentMethodInfo,
  PaymentTypeInfo,
  PaymentFilterOptions,
  RefundRequest
} from '../types/payment';
import { ID } from '../types/common';

/**
 * Fetch paginated list of payments for the current user
 * @param page - Page number for pagination
 * @param perPage - Number of items per page
 * @param filters - Optional filter criteria for payments
 * @returns Promise resolving to paginated payment data
 */
export const getPayments = (
  page: number = 1,
  perPage: number = 10,
  filters: PaymentFilterOptions = {}
): Promise<{ payments: Payment[]; pagination: { page: number; perPage: number; total: number } }> => {
  return apiClient.get('payments', {
    page,
    per_page: perPage,
    ...filters
  });
};

/**
 * Fetch details of a specific payment
 * @param paymentId - ID of the payment to retrieve
 * @returns Promise resolving to payment details
 */
export const getPayment = (paymentId: ID): Promise<Payment> => {
  return apiClient.get(`payments/${paymentId}`);
};

/**
 * Fetch payments associated with a specific application
 * @param applicationId - ID of the application
 * @returns Promise resolving to application payment data
 */
export const getApplicationPayments = (applicationId: ID): Promise<Payment[]> => {
  return apiClient.get(`payments/application/${applicationId}`);
};

/**
 * Fetch available payment types
 * @returns Promise resolving to payment types data
 */
export const getPaymentTypes = (): Promise<PaymentTypeInfo[]> => {
  return apiClient.get('payments/types');
};

/**
 * Fetch available payment methods for a specific payment type
 * @param paymentType - The type of payment
 * @returns Promise resolving to payment methods data
 */
export const getPaymentMethods = (
  paymentType: string
): Promise<PaymentMethodInfo[]> => {
  return apiClient.get(`payments/methods/${paymentType}`);
};

/**
 * Initialize a payment transaction
 * @param paymentData - Form data for the payment
 * @returns Promise resolving to payment initialization data
 */
export const initializePayment = (
  paymentData: PaymentFormData
): Promise<PaymentInitialization> => {
  return apiClient.post('payments/initialize', paymentData);
};

/**
 * Process a payment transaction
 * @param paymentId - ID of the payment to process
 * @param paymentDetails - Payment details including provider-specific information
 * @returns Promise resolving to payment processing result
 */
export const processPayment = (
  paymentId: ID,
  paymentDetails: Record<string, any>
): Promise<PaymentProcessingResult> => {
  return apiClient.post(`payments/${paymentId}/process`, paymentDetails);
};

/**
 * Fetch receipt for a completed payment
 * @param paymentId - ID of the payment
 * @returns Promise resolving to payment receipt data
 */
export const getPaymentReceipt = (paymentId: ID): Promise<PaymentReceipt> => {
  return apiClient.get(`payments/${paymentId}/receipt`);
};

/**
 * Request a refund for a payment (admin/staff only)
 * @param refundData - Refund request data
 * @returns Promise resolving to refund request result
 */
export const requestRefund = (
  refundData: RefundRequest
): Promise<{ success: boolean; message: string }> => {
  return apiClient.post(`admin/payments/${refundData.payment_id}/refund`, refundData);
};