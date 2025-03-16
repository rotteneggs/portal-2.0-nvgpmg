import React from 'react'; // react ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import { PaymentForm } from './PaymentForm';
import { renderWithProviders } from '../../utils/testUtils';
import { PaymentType, PaymentMethod, Currency } from '../../types/payment';
import { fetchPaymentTypes, fetchPaymentMethods, initializePayment } from '../../redux/slices/paymentsSlice';
import jest from 'jest'; // jest ^29.5.0

describe('PaymentForm component', () => {
  it('renders correctly with default props', () => {
    const { container } = renderWithProviders(<PaymentForm applicationId="123" />);

    expect(screen.getByText('Payment Type')).toBeInTheDocument();
    expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('fetches payment types on mount', () => {
    const fetchPaymentTypesMock = jest.fn();
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [],
          paymentMethods: [],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      },
      store: {
        dispatch: fetchPaymentTypesMock
      } as any
    });

    expect(fetchPaymentTypesMock).toHaveBeenCalledTimes(1);
  });

  it('fetches payment methods when payment type is selected', async () => {
    const fetchPaymentMethodsMock = jest.fn();
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      },
      store: {
        dispatch: fetchPaymentMethodsMock
      } as any
    });

    fireEvent.change(screen.getByTestId('payment-type-select'), {
      target: { value: PaymentType.APPLICATION_FEE }
    });

    await waitFor(() => {
      expect(fetchPaymentMethodsMock).toHaveBeenCalledWith(PaymentType.APPLICATION_FEE);
    });
  });

  it('displays payment methods dropdown after selecting payment type', async () => {
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('payment-type-select'), {
      target: { value: PaymentType.APPLICATION_FEE }
    });

    await waitFor(() => {
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Please select a payment type')).toBeInTheDocument();
      expect(screen.getByText('Please select a payment method')).toBeInTheDocument();
      expect(screen.getByText('Please enter an amount')).toBeInTheDocument();
    });
  });

  it('validates amount field format', async () => {
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    fireEvent.change(screen.getByTestId('payment-amount-input'), {
      target: { value: 'abc' }
    });
    fireEvent.blur(screen.getByTestId('payment-amount-input'));
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
    });
  });

  it('submits the form with valid data', async () => {
    const initializePaymentMock = jest.fn();
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      },
      store: {
        dispatch: initializePaymentMock
      } as any
    });

    fireEvent.change(screen.getByTestId('payment-type-select'), {
      target: { value: PaymentType.APPLICATION_FEE }
    });
    fireEvent.change(screen.getByTestId('payment-method-select'), {
      target: { value: PaymentMethod.CREDIT_CARD }
    });
    fireEvent.change(screen.getByTestId('payment-amount-input'), {
      target: { value: '75' }
    });
    fireEvent.blur(screen.getByTestId('payment-amount-input'));
    fireEvent.click(screen.getByText('Continue to Payment'));

    await waitFor(() => {
      expect(initializePaymentMock).toHaveBeenCalledWith({
        application_id: 123,
        payment_type: PaymentType.APPLICATION_FEE,
        payment_method: PaymentMethod.CREDIT_CARD,
        amount: 75,
        currency: Currency.USD,
        payment_details: {}
      });
    });
  });

  it('displays loading state during form submission', () => {
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: true,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Continue to Payment')).toBeDisabled();
  });

  it('displays error message when payment initialization fails', () => {
    renderWithProviders(<PaymentForm applicationId="123" />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: 'Payment initialization failed',
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    expect(screen.getByTestId('payment-form-error')).toHaveTextContent('Payment initialization failed');
  });

  it('calls onPaymentInitialized when payment is initialized', () => {
    const onPaymentInitializedMock = jest.fn();
    const paymentInitializationData = { payment_id: 1, client_secret: 'test_secret' };
    renderWithProviders(<PaymentForm applicationId="123" onPaymentInitialized={onPaymentInitializedMock} />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: paymentInitializationData,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    expect(onPaymentInitializedMock).toHaveBeenCalledWith(paymentInitializationData);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancelMock = jest.fn();
    renderWithProviders(<PaymentForm applicationId="123" onCancel={onCancelMock} />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    fireEvent.click(screen.getByTestId('payment-cancel-button'));

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('pre-fills form with initialPaymentType and initialAmount', () => {
    renderWithProviders(<PaymentForm applicationId="123" initialPaymentType={PaymentType.APPLICATION_FEE} initialAmount={50} />, {
      preloadedState: {
        payments: {
          payments: [],
          currentPayment: null,
          paymentTypes: [{ code: PaymentType.APPLICATION_FEE, name: 'Application Fee', amount: 75, currency: Currency.USD, is_required: true, due_date: null, id: '1', description: null }],
          paymentMethods: [{ code: PaymentMethod.CREDIT_CARD, name: 'Credit Card', is_active: true, supported_currencies: [Currency.USD], processing_fee: 0, processing_time: null, id: '1', description: null, icon: null }],
          loading: false,
          error: null,
          processingPayment: false,
          paymentInitialization: null,
          paymentResult: null,
          pagination: { page: 1, perPage: 10, total: 0 },
          filters: null
        }
      }
    });

    expect(screen.getByTestId('payment-type-select')).toHaveValue(PaymentType.APPLICATION_FEE);
    expect(screen.getByTestId('payment-amount-input')).toHaveValue('50');
  });
});