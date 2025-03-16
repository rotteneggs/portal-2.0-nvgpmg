/**
 * Redux slice for payment state management in the Student Admissions Enrollment Platform.
 * Manages payment processing, payment history, payment methods, and related state.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import {
  PaymentState,
  Payment,
  PaymentFormData,
  PaymentInitialization,
  PaymentProcessingResult,
  PaymentMethodInfo,
  PaymentTypeInfo,
  PaymentFilterOptions,
  RefundRequest,
} from '../../types/payment';
import { ID } from '../../types/common';
import {
  getPayments as getPaymentsApi,
  getPayment as getPaymentApi,
  getApplicationPayments as getApplicationPaymentsApi,
  getPaymentTypes as getPaymentTypesApi,
  getPaymentMethods as getPaymentMethodsApi,
  initializePayment as initializePaymentApi,
  processPayment as processPaymentApi,
  getPaymentReceipt as getPaymentReceiptApi,
  requestRefund as requestRefundApi,
} from '../../api/payments';

/**
 * Async thunk to fetch paginated list of payments
 */
export const fetchPayments = createAsyncThunk(
  'payments/fetchPayments',
  async ({
    page = 1,
    perPage = 10,
    filters = {}
  }: {
    page: number;
    perPage: number;
    filters?: PaymentFilterOptions;
  }) => {
    return getPaymentsApi(page, perPage, filters);
  }
);

/**
 * Async thunk to fetch details of a specific payment
 */
export const fetchPayment = createAsyncThunk(
  'payments/fetchPayment',
  async (paymentId: ID) => {
    return getPaymentApi(paymentId);
  }
);

/**
 * Async thunk to fetch payments associated with a specific application
 */
export const fetchApplicationPayments = createAsyncThunk(
  'payments/fetchApplicationPayments',
  async (applicationId: ID) => {
    return getApplicationPaymentsApi(applicationId);
  }
);

/**
 * Async thunk to fetch available payment types
 */
export const fetchPaymentTypes = createAsyncThunk(
  'payments/fetchPaymentTypes',
  async () => {
    return getPaymentTypesApi();
  }
);

/**
 * Async thunk to fetch available payment methods for a specific payment type
 */
export const fetchPaymentMethods = createAsyncThunk(
  'payments/fetchPaymentMethods',
  async (paymentType: string) => {
    return getPaymentMethodsApi(paymentType);
  }
);

/**
 * Async thunk to initialize a payment transaction
 */
export const initializePayment = createAsyncThunk(
  'payments/initializePayment',
  async (paymentData: PaymentFormData) => {
    return initializePaymentApi(paymentData);
  }
);

/**
 * Async thunk to process a payment transaction
 */
export const processPayment = createAsyncThunk(
  'payments/processPayment',
  async ({ paymentId, paymentDetails }: { paymentId: ID; paymentDetails: Record<string, any> }) => {
    return processPaymentApi(paymentId, paymentDetails);
  }
);

/**
 * Async thunk to fetch receipt for a completed payment
 */
export const fetchPaymentReceipt = createAsyncThunk(
  'payments/fetchPaymentReceipt',
  async (paymentId: ID) => {
    return getPaymentReceiptApi(paymentId);
  }
);

/**
 * Async thunk to request a refund for a payment (admin/staff only)
 */
export const requestRefund = createAsyncThunk(
  'payments/requestRefund',
  async (refundData: RefundRequest) => {
    return requestRefundApi(refundData);
  }
);

/**
 * Initial state for the payments slice
 */
const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  paymentTypes: [],
  paymentMethods: [],
  loading: false,
  error: null,
  processingPayment: false,
  paymentInitialization: null,
  paymentResult: null,
  pagination: {
    page: 1,
    perPage: 10,
    total: 0
  },
  filters: null
};

/**
 * Redux slice for payments feature
 * Includes reducers for managing payment state and handling async actions
 */
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setPayments: (state, action: PayloadAction<Payment[]>) => {
      state.payments = action.payload;
    },
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
    setPaymentTypes: (state, action: PayloadAction<PaymentTypeInfo[]>) => {
      state.paymentTypes = action.payload;
    },
    setPaymentMethods: (state, action: PayloadAction<PaymentMethodInfo[]>) => {
      state.paymentMethods = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProcessingPayment: (state, action: PayloadAction<boolean>) => {
      state.processingPayment = action.payload;
    },
    setPaymentInitialization: (state, action: PayloadAction<PaymentInitialization | null>) => {
      state.paymentInitialization = action.payload;
    },
    setPaymentResult: (state, action: PayloadAction<PaymentProcessingResult | null>) => {
      state.paymentResult = action.payload;
    },
    setPagination: (state, action: PayloadAction<{ page: number; perPage: number; total: number }>) => {
      state.pagination = action.payload;
    },
    setFilters: (state, action: PayloadAction<PaymentFilterOptions | null>) => {
      state.filters = action.payload;
    },
    resetPaymentState: (state) => {
      state.payments = [];
      state.currentPayment = null;
      state.paymentInitialization = null;
      state.paymentResult = null;
      state.error = null;
    },
    clearPaymentResult: (state) => {
      state.paymentResult = null;
    }
  },
  extraReducers: (builder) => {
    // fetchPayments
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.payments;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments';
      });

    // fetchPayment
    builder
      .addCase(fetchPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload;
      })
      .addCase(fetchPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payment';
      });

    // fetchApplicationPayments
    builder
      .addCase(fetchApplicationPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload;
      })
      .addCase(fetchApplicationPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch application payments';
      });

    // fetchPaymentTypes
    builder
      .addCase(fetchPaymentTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentTypes = action.payload;
      })
      .addCase(fetchPaymentTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payment types';
      });

    // fetchPaymentMethods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentMethods = action.payload;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payment methods';
      });

    // initializePayment
    builder
      .addCase(initializePayment.pending, (state) => {
        state.loading = true;
        state.processingPayment = true;
        state.error = null;
      })
      .addCase(initializePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentInitialization = action.payload;
      })
      .addCase(initializePayment.rejected, (state, action) => {
        state.loading = false;
        state.processingPayment = false;
        state.error = action.error.message || 'Failed to initialize payment';
      });

    // processPayment
    builder
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.processingPayment = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.processingPayment = false;
        state.paymentResult = action.payload;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.processingPayment = false;
        state.error = action.error.message || 'Payment processing failed';
      });

    // fetchPaymentReceipt
    builder
      .addCase(fetchPaymentReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentReceipt.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(fetchPaymentReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch receipt';
      });

    // requestRefund
    builder
      .addCase(requestRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestRefund.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to request refund';
      });
  }
});

// Export selectors for accessing payment state
export const selectPayments = (state: { payments: PaymentState }) => state.payments.payments;
export const selectCurrentPayment = (state: { payments: PaymentState }) => state.payments.currentPayment;
export const selectPaymentTypes = (state: { payments: PaymentState }) => state.payments.paymentTypes;
export const selectPaymentMethods = (state: { payments: PaymentState }) => state.payments.paymentMethods;
export const selectPaymentLoading = (state: { payments: PaymentState }) => state.payments.loading;
export const selectPaymentError = (state: { payments: PaymentState }) => state.payments.error;
export const selectProcessingPayment = (state: { payments: PaymentState }) => state.payments.processingPayment;
export const selectPaymentInitialization = (state: { payments: PaymentState }) => state.payments.paymentInitialization;
export const selectPaymentResult = (state: { payments: PaymentState }) => state.payments.paymentResult;
export const selectPaymentPagination = (state: { payments: PaymentState }) => state.payments.pagination;
export const selectPaymentFilters = (state: { payments: PaymentState }) => state.payments.filters;

// Export actions and reducer
export const {
  setPayments,
  setCurrentPayment,
  setPaymentTypes,
  setPaymentMethods,
  setLoading,
  setError,
  setProcessingPayment,
  setPaymentInitialization,
  setPaymentResult,
  setPagination,
  setFilters,
  resetPaymentState,
  clearPaymentResult
} = paymentsSlice.actions;

export const paymentsReducer = paymentsSlice.reducer;

export default paymentsSlice;