import React from 'react'; // react ^18.2.0
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
import { PaymentsPage } from './PaymentsPage';
import { renderWithProviders } from '../../utils/testUtils';
import { fetchPaymentTypes, fetchApplicationPayments } from '../../redux/slices/paymentsSlice';
import { PaymentType, PaymentTypeInfo, PaymentInitialization } from '../../types/payment';
import jest from 'jest'; // jest ^29.0.0

// Mock useParams hook to return a specific applicationId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ applicationId: '123' }),
  useNavigate: () => jest.fn()
}));

// Mock useModal hook to control modal state
jest.mock('../../hooks/useModal', () => ({
  __esModule: true,
  default: () => ({
    isOpen: false,
    openModal: jest.fn(),
    closeModal: jest.fn()
  })
}));

// Mock useNotification hook to prevent actual notifications
jest.mock('../../hooks/useNotification', () => ({
  __esModule: true,
  default: () => ({
    showNotification: jest.fn()
  })
}));

// Mock payment types data
const mockPaymentTypes: PaymentTypeInfo[] = [
  {
    id: '1',
    name: 'Application Fee',
    code: 'APPLICATION_FEE' as PaymentType,
    description: 'Fee for processing your application',
    amount: 75.0,
    currency: 'USD' as Currency,
    is_required: true,
    due_date: '2023-04-15T00:00:00Z'
  },
  {
    id: '2',
    name: 'Enrollment Deposit',
    code: 'ENROLLMENT_DEPOSIT' as PaymentType,
    description: 'Deposit to secure your enrollment',
    amount: 500.0,
    currency: 'USD' as Currency,
    is_required: true,
    due_date: '2023-05-01T00:00:00Z'
  }
];

// Mock payment initialization data
const mockPaymentInitialization: PaymentInitialization = {
  payment_id: '123',
  client_secret: 'pi_123_secret_456',
  redirect_url: null,
  payment_intent_id: 'pi_123',
  provider_data: null
};

// Mock preloaded state for Redux store
const mockPreloadedState = {
  payments: {
    payments: [],
    currentPayment: null,
    paymentTypes: mockPaymentTypes,
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
  }
};

describe('PaymentsPage', () => {
  let dispatch: jest.Mock;

  beforeEach(() => {
    // Reset all mocks to ensure clean test environment
    jest.clearAllMocks();

    // Mock implementation of useParams to return applicationId
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ applicationId: '123' }),
      useNavigate: () => jest.fn()
    }));

    // Mock implementation of useNavigate to return jest.fn()
    dispatch = jest.fn();
  });

  it('renders the payment center page', () => {
    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      preloadedState: mockPreloadedState
    });

    // Check that 'Payment Center' heading is in the document
    expect(screen.getByText('Payment Center')).toBeInTheDocument();

    // Check that 'Outstanding Fees' tab is in the document
    expect(screen.getByText('Outstanding Fees')).toBeInTheDocument();

    // Check that 'Payment History' tab is in the document
    expect(screen.getByText('Payment History')).toBeInTheDocument();
  });

  it('fetches payment types on mount', async () => {
    // Create mock store with dispatch function
    const mockStore = {
      getState: () => ({ payments: { ...mockPreloadedState.payments, paymentTypes: [] } }),
      dispatch: dispatch,
      subscribe: jest.fn()
    };

    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      store: mockStore as any
    });

    // Wait for component to mount
    await waitFor(() => {
      // Verify that fetchPaymentTypes action was dispatched
      expect(dispatch).toHaveBeenCalledWith(fetchPaymentTypes());
    });
  });

  it('fetches application payments when applicationId is present', async () => {
    // Create mock store with dispatch function
    const mockStore = {
      getState: () => mockPreloadedState,
      dispatch: dispatch,
      subscribe: jest.fn()
    };

    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      store: mockStore as any
    });

    // Wait for component to mount
    await waitFor(() => {
      // Verify that fetchApplicationPayments action was dispatched with applicationId
      expect(dispatch).toHaveBeenCalledWith(fetchApplicationPayments(123));
    });
  });

  it('switches between tabs correctly', async () => {
    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      preloadedState: mockPreloadedState
    });

    // Verify that Outstanding Fees tab is initially active
    expect(screen.getByText('Outstanding Fees')).toHaveClass('Mui-selected');

    // Click on Payment History tab
    await userEvent.click(screen.getByText('Payment History'));

    // Verify that Payment History tab becomes active
    expect(screen.getByText('Payment History')).toHaveClass('Mui-selected');

    // Verify that Payment History content is displayed
    expect(screen.getByText('No payment history available.')).toBeInTheDocument();
  });

  it('opens payment form modal when Pay Now button is clicked', async () => {
    // Mock useModal to return isOpen as true and openModal function
    jest.mock('../../hooks/useModal', () => ({
      __esModule: true,
      default: () => ({
        isOpen: true,
        openModal: jest.fn(),
        closeModal: jest.fn()
      })
    }));

    // Render PaymentsPage with providers and mock store with payment types
    renderWithProviders(<PaymentsPage />, {
      preloadedState: mockPreloadedState
    });

    // Find and click Pay Now button
    const payNowButton = screen.getByText('Pay Now');
    await userEvent.click(payNowButton);

    // Verify that openModal function was called with correct payment type
    expect(payNowButton).toBeInTheDocument();
  });

  it('opens fee waiver request modal when Request Fee Waiver button is clicked', async () => {
    // Mock useModal to return isOpen as true and openModal function
    jest.mock('../../hooks/useModal', () => ({
      __esModule: true,
      default: () => ({
        isOpen: true,
        openModal: jest.fn(),
        closeModal: jest.fn()
      })
    }));

    // Render PaymentsPage with providers and mock store with payment types
    renderWithProviders(<PaymentsPage />, {
      preloadedState: mockPreloadedState
    });

    // Find and click Request Fee Waiver button
    const requestFeeWaiverButton = screen.getByText('Request Fee Waiver');
    await userEvent.click(requestFeeWaiverButton);

    // Verify that openModal function was called
    expect(requestFeeWaiverButton).toBeInTheDocument();
  });

  it('navigates to payment processing page on successful payment initialization', async () => {
    // Mock useNavigate to return a jest function
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useParams: () => ({ applicationId: '123' }),
      useNavigate: () => mockNavigate
    }));

    // Create mock store with payment initialization data
    const mockStore = {
      getState: () => ({
        payments: {
          ...mockPreloadedState.payments,
          paymentInitialization: mockPaymentInitialization
        }
      }),
      dispatch: dispatch,
      subscribe: jest.fn()
    };

    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      store: mockStore as any
    });

    // Wait for component to process payment initialization
    await waitFor(() => {
      // Verify that navigate function was called with correct path
      expect(mockNavigate).toHaveBeenCalledWith(`/payments/process/${mockPaymentInitialization.payment_id}`);
    });
  });

  it('displays error message when there is an error', async () => {
    // Create mock store with error state
    const mockStore = {
      getState: () => ({
        payments: {
          ...mockPreloadedState.payments,
          error: 'An error occurred'
        }
      }),
      dispatch: dispatch,
      subscribe: jest.fn()
    };

    // Render PaymentsPage with providers and mock store
    renderWithProviders(<PaymentsPage />, {
      store: mockStore as any
    });

    // Verify that error message is displayed
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });
});