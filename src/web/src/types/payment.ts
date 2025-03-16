/**
 * TypeScript type definitions for payment-related data structures in the Student Admissions
 * Enrollment Platform. This file defines interfaces, types, and enums for payment processing, 
 * payment history, payment methods, and payment forms to ensure type safety and consistency
 * across the application.
 */

import { ID, Timestamp, Nullable } from './common';

/**
 * Enum representing different types of payments in the system
 */
export enum PaymentType {
  APPLICATION_FEE = 'application_fee',
  ENROLLMENT_DEPOSIT = 'enrollment_deposit',
  TUITION = 'tuition',
  OTHER = 'other'
}

/**
 * Enum representing different payment methods available
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  WIRE_TRANSFER = 'wire_transfer',
  INTERNATIONAL_PAYMENT = 'international_payment'
}

/**
 * Enum representing different payment statuses
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

/**
 * Enum representing different currencies supported for payments
 */
export enum Currency {
  USD = 'usd',
  EUR = 'eur',
  GBP = 'gbp',
  CAD = 'cad',
  AUD = 'aud'
}

/**
 * Interface representing a payment record in the system
 */
export interface Payment {
  id: ID;
  user_id: ID;
  application_id: Nullable<ID>;
  payment_type: PaymentType;
  amount: number;
  currency: Currency;
  payment_method: PaymentMethod;
  transaction_id: Nullable<string>;
  status: PaymentStatus;
  payment_data: Nullable<Record<string, any>>;
  paid_at: Nullable<Timestamp>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Interface representing form data for initiating a payment
 */
export interface PaymentFormData {
  application_id: Nullable<ID>;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  currency: Currency;
  payment_details: Record<string, any>;
}

/**
 * Interface representing payment initialization data returned from the API
 */
export interface PaymentInitialization {
  payment_id: ID;
  client_secret: Nullable<string>;
  redirect_url: Nullable<string>;
  payment_intent_id: Nullable<string>;
  provider_data: Nullable<Record<string, any>>;
}

/**
 * Interface representing the result of a payment processing operation
 */
export interface PaymentProcessingResult {
  success: boolean;
  payment_id: ID;
  transaction_id: Nullable<string>;
  status: PaymentStatus;
  message: string;
  receipt_url: Nullable<string>;
  error_code: Nullable<string>;
  error_message: Nullable<string>;
}

/**
 * Interface representing a payment receipt with detailed information
 */
export interface PaymentReceipt {
  payment_id: ID;
  transaction_id: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  currency: Currency;
  payment_date: Timestamp;
  payer_name: string;
  payer_email: string;
  receipt_number: string;
  receipt_url: Nullable<string>;
  institution_name: string;
  institution_address: string;
  payment_details: Record<string, any>;
}

/**
 * Interface representing information about a payment method
 */
export interface PaymentMethodInfo {
  id: string;
  name: string;
  code: PaymentMethod;
  description: Nullable<string>;
  icon: Nullable<string>;
  is_active: boolean;
  supported_currencies: Currency[];
  processing_fee: Nullable<number>;
  processing_time: Nullable<string>;
}

/**
 * Interface representing information about a payment type
 */
export interface PaymentTypeInfo {
  id: string;
  name: string;
  code: PaymentType;
  description: Nullable<string>;
  amount: number;
  currency: Currency;
  is_required: boolean;
  due_date: Nullable<Timestamp>;
}

/**
 * Interface representing filter options for payment queries
 */
export interface PaymentFilterOptions {
  payment_type: Nullable<PaymentType>;
  payment_method: Nullable<PaymentMethod>;
  status: Nullable<PaymentStatus>;
  application_id: Nullable<ID>;
  date_from: Nullable<string>;
  date_to: Nullable<string>;
  amount_min: Nullable<number>;
  amount_max: Nullable<number>;
}

/**
 * Interface representing a request to refund a payment
 */
export interface RefundRequest {
  payment_id: ID;
  reason: string;
  amount: Nullable<number>;
}

/**
 * Interface representing the payment state in the Redux store
 */
export interface PaymentState {
  payments: Payment[];
  currentPayment: Nullable<Payment>;
  paymentTypes: PaymentTypeInfo[];
  paymentMethods: PaymentMethodInfo[];
  loading: boolean;
  error: Nullable<string>;
  processingPayment: boolean;
  paymentInitialization: Nullable<PaymentInitialization>;
  paymentResult: Nullable<PaymentProcessingResult>;
  pagination: { page: number; perPage: number; total: number };
  filters: Nullable<PaymentFilterOptions>;
}