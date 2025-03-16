import { PaymentType, PaymentMethod, PaymentStatus } from '../../src/types/payment';
import '@testing-library/cypress/add-commands';

/**
 * Sets up the test environment for payment testing by logging in a test user,
 * visiting the dashboard, and intercepting payment-related API requests.
 */
function setupPaymentTest() {
  // Login
  cy.fixture('users/student.json').then((user) => {
    cy.visit('/login');
    cy.findByLabelText('Email').type(user.email);
    cy.findByLabelText('Password').type(user.password);
    cy.findByRole('button', { name: /sign in/i }).click();
    cy.url().should('include', '/dashboard');
  });

  // Intercept payment-related API requests
  cy.intercept('GET', '/api/v1/payments*').as('getPayments');
  cy.intercept('GET', '/api/v1/payments/types*').as('getPaymentTypes');
  cy.intercept('GET', '/api/v1/payments/methods*').as('getPaymentMethods');
  cy.intercept('POST', '/api/v1/payments/process').as('processPayment');
  cy.intercept('GET', '/api/v1/payments/*/receipt').as('getReceipt');
  cy.intercept('POST', '/api/v1/financial-aid/waiver').as('requestWaiver');
}

/**
 * Generates test data for payment processing based on payment type
 * @param paymentType The type of payment (application fee, enrollment deposit, etc.)
 * @returns Test payment data object
 */
function generateTestPaymentData(paymentType: PaymentType) {
  // Base payment data
  const paymentData = {
    payment_type: paymentType,
    payment_method: PaymentMethod.CREDIT_CARD,
    amount: paymentType === PaymentType.APPLICATION_FEE ? 75.00 : 500.00,
    currency: 'USD',
    card_details: {
      card_number: '4242424242424242',
      expiry_month: '12',
      expiry_year: '2030',
      cvv: '123',
      card_holder_name: 'Test User'
    },
    billing_address: {
      address_line1: '123 Test Street',
      address_line2: 'Apt 4B',
      city: 'Test City',
      state: 'TS',
      postal_code: '12345',
      country: 'United States'
    }
  };

  return paymentData;
}

// Test suite for Payment Center
describe('Payment Center', () => {
  beforeEach(() => {
    setupPaymentTest();
    cy.visit('/payments');
    cy.wait('@getPayments');
    cy.wait('@getPaymentTypes');
  });

  it('should display outstanding fees on payment center page', () => {
    // Verify 'Outstanding Fees' tab is active by default
    cy.findByRole('tab', { name: /outstanding fees/i })
      .should('have.attr', 'aria-selected', 'true');
    
    // Verify application fee is displayed with correct amount
    cy.findByText(/application fee/i).should('be.visible');
    cy.findByText(/\$75\.00/i).should('be.visible');
    
    // Verify enrollment deposit is displayed with correct amount
    cy.findByText(/enrollment deposit/i).should('be.visible');
    cy.findByText(/\$500\.00/i).should('be.visible');
    
    // Verify due dates are displayed for each fee
    cy.findAllByText(/due by:/i).should('have.length.at.least', 2);
    
    // Verify total due amount is calculated correctly
    cy.findByText(/total due:/i).next().should('contain.text', '$575.00');
  });

  it('should switch between tabs in payment center', () => {
    // Verify 'Outstanding Fees' tab is active by default
    cy.findByRole('tab', { name: /outstanding fees/i })
      .should('have.attr', 'aria-selected', 'true');
    
    // Click on 'Payment History' tab
    cy.findByRole('tab', { name: /payment history/i }).click();
    
    // Verify 'Payment History' tab becomes active
    cy.findByRole('tab', { name: /payment history/i })
      .should('have.attr', 'aria-selected', 'true');
    
    // Verify payment history table is displayed
    cy.findByRole('table').should('be.visible');
    
    // Click on 'Outstanding Fees' tab
    cy.findByRole('tab', { name: /outstanding fees/i }).click();
    
    // Verify 'Outstanding Fees' tab becomes active again
    cy.findByRole('tab', { name: /outstanding fees/i })
      .should('have.attr', 'aria-selected', 'true');
    
    // Verify outstanding fees are displayed
    cy.findByText(/application fee/i).should('be.visible');
  });

  it('should open payment form when clicking Pay Now', () => {
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Verify payment form modal is opened
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/payment method/i).should('be.visible');
    
    // Verify payment type is pre-selected as application fee
    cy.findByLabelText(/application fee/i).should('be.checked');
    
    // Verify amount is pre-filled with correct value
    cy.findByText(/\$75\.00/i).should('be.visible');
  });

  it('should open fee waiver request form', () => {
    // Click 'Request Fee Waiver' button
    cy.findByRole('button', { name: /request fee waiver/i }).click();
    
    // Verify fee waiver request form is opened
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/fee waiver request/i).should('be.visible');
    
    // Verify fee waiver form contains required fields
    cy.findByLabelText(/reason for request/i).should('be.visible');
    cy.findByLabelText(/supporting document/i).should('be.visible');
    cy.findByLabelText(/explanation/i).should('be.visible');
    
    // Verify submission and cancel buttons are present
    cy.findByRole('button', { name: /submit request/i }).should('be.visible');
    cy.findByRole('button', { name: /cancel/i }).should('be.visible');
  });
});

// Test suite for Payment History
describe('Payment History', () => {
  beforeEach(() => {
    // Setup with a user that has payment history
    cy.fixture('users/student_with_payments.json').then((user) => {
      cy.visit('/login');
      cy.findByLabelText('Email').type(user.email);
      cy.findByLabelText('Password').type(user.password);
      cy.findByRole('button', { name: /sign in/i }).click();
      cy.url().should('include', '/dashboard');
    });
    
    cy.visit('/payments');
    cy.findByRole('tab', { name: /payment history/i }).click();
    cy.wait('@getPayments');
  });

  it('should display payment history with correct data', () => {
    // Verify payment history table is displayed
    cy.findByRole('table').should('be.visible');
    
    // Verify table contains columns for date, type, amount, status, and actions
    cy.findByRole('columnheader', { name: /date/i }).should('be.visible');
    cy.findByRole('columnheader', { name: /type/i }).should('be.visible');
    cy.findByRole('columnheader', { name: /amount/i }).should('be.visible');
    cy.findByRole('columnheader', { name: /status/i }).should('be.visible');
    cy.findByRole('columnheader', { name: /actions/i }).should('be.visible');
    
    // Verify payment data is displayed correctly
    cy.findByRole('cell', { name: /application fee/i }).should('be.visible');
    
    // Verify status badges show correct colors based on payment status
    cy.findByText(PaymentStatus.COMPLETED).should('have.class', /success/i);
    cy.findByText(PaymentStatus.FAILED).should('have.class', /error/i);
  });

  it('should filter payment history by type', () => {
    // Select 'Application Fee' from payment type filter
    cy.findByLabelText(/payment type/i).click();
    cy.findByText(PaymentType.APPLICATION_FEE).click();
    
    // Verify only application fee payments are displayed
    cy.findAllByRole('cell', { name: /application fee/i }).should('have.length.at.least', 1);
    cy.findByRole('cell', { name: /enrollment deposit/i }).should('not.exist');
    
    // Select 'Enrollment Deposit' from payment type filter
    cy.findByLabelText(/payment type/i).click();
    cy.findByText(PaymentType.ENROLLMENT_DEPOSIT).click();
    
    // Verify only enrollment deposit payments are displayed
    cy.findAllByRole('cell', { name: /enrollment deposit/i }).should('have.length.at.least', 1);
    cy.findByRole('cell', { name: /application fee/i }).should('not.exist');
    
    // Clear filter
    cy.findByLabelText(/payment type/i).click();
    cy.findByText(/all payment types/i).click();
    
    // Verify all payments are displayed again
    cy.findByRole('cell', { name: /application fee/i }).should('be.visible');
    cy.findByRole('cell', { name: /enrollment deposit/i }).should('be.visible');
  });

  it('should filter payment history by status', () => {
    // Select 'Completed' from status filter
    cy.findByLabelText(/status/i).click();
    cy.findByText(PaymentStatus.COMPLETED).click();
    
    // Verify only completed payments are displayed
    cy.findAllByText(PaymentStatus.COMPLETED).should('have.length.at.least', 1);
    cy.findByText(PaymentStatus.FAILED).should('not.exist');
    
    // Select 'Failed' from status filter
    cy.findByLabelText(/status/i).click();
    cy.findByText(PaymentStatus.FAILED).click();
    
    // Verify only failed payments are displayed
    cy.findAllByText(PaymentStatus.FAILED).should('have.length.at.least', 1);
    cy.findByText(PaymentStatus.COMPLETED).should('not.exist');
    
    // Clear filter
    cy.findByLabelText(/status/i).click();
    cy.findByText(/all statuses/i).click();
    
    // Verify all payments are displayed again
    cy.findByText(PaymentStatus.COMPLETED).should('be.visible');
    cy.findByText(PaymentStatus.FAILED).should('be.visible');
  });

  it('should filter payment history by date range', () => {
    // Set date range filter for last month
    cy.findByLabelText(/date range/i).click();
    cy.findByLabelText(/start date/i).type('2023-01-01');
    cy.findByLabelText(/end date/i).type('2023-01-31');
    cy.findByRole('button', { name: /apply/i }).click();
    
    // Verify only payments from selected date range are displayed
    cy.findAllByRole('row').should('have.length.at.least', 2); // Header + at least one data row
    
    // Clear date filter
    cy.findByLabelText(/date range/i).click();
    cy.findByRole('button', { name: /clear/i }).click();
    
    // Verify all payments are displayed again
    cy.findAllByRole('row').should('have.length.at.least', 3); // Header + at least two data rows
  });

  it('should paginate payment history', () => {
    // Verify pagination controls are displayed
    cy.findByRole('navigation', { name: /pagination/i }).should('be.visible');
    
    // Verify first page of payments is displayed
    cy.findByRole('button', { name: /page 1/i }).should('have.attr', 'aria-current', 'true');
    
    // Click on next page button
    cy.findByRole('button', { name: /next page/i }).click();
    
    // Verify second page of payments is displayed
    cy.findByRole('button', { name: /page 2/i }).should('have.attr', 'aria-current', 'true');
    
    // Click on previous page button
    cy.findByRole('button', { name: /previous page/i }).click();
    
    // Verify first page of payments is displayed again
    cy.findByRole('button', { name: /page 1/i }).should('have.attr', 'aria-current', 'true');
  });

  it('should view payment receipt', () => {
    // Click on receipt icon for a completed payment
    cy.findAllByRole('button', { name: /view receipt/i }).first().click();
    cy.wait('@getReceipt');
    
    // Verify payment receipt modal is opened
    cy.findByRole('dialog').should('be.visible');
    cy.findByText(/payment receipt/i).should('be.visible');
    
    // Verify receipt contains payment details
    cy.findByText(/transaction id/i).should('be.visible');
    
    // Verify receipt contains transaction ID
    cy.findByText(/transaction id/i).next().should('not.be.empty');
    
    // Verify receipt contains payment date and amount
    cy.findByText(/payment date/i).should('be.visible');
    cy.findByText(/amount/i).should('be.visible');
    
    // Verify print and download buttons are available
    cy.findByRole('button', { name: /print/i }).should('be.visible');
    cy.findByRole('button', { name: /download/i }).should('be.visible');
    
    // Click close button
    cy.findByRole('button', { name: /close/i }).click();
    
    // Verify receipt modal is closed
    cy.findByRole('dialog').should('not.exist');
  });
});

// Test suite for Payment Processing
describe('Payment Processing', () => {
  beforeEach(() => {
    setupPaymentTest();
    cy.visit('/payments');
    cy.wait('@getPayments');
    cy.wait('@getPaymentTypes');
    cy.wait('@getPaymentMethods');
  });

  it('should complete payment form with credit card', () => {
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Verify payment form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Select 'Credit Card' as payment method
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.CREDIT_CARD).click();
    
    // Verify credit card fields are displayed
    cy.findByLabelText(/card number/i).should('be.visible');
    cy.findByLabelText(/expiration date/i).should('be.visible');
    cy.findByLabelText(/cvv/i).should('be.visible');
    cy.findByLabelText(/cardholder name/i).should('be.visible');
    
    // Fill in credit card details
    cy.findByLabelText(/card number/i).type('4242424242424242');
    cy.findByLabelText(/expiration date/i).type('12/30');
    cy.findByLabelText(/cvv/i).type('123');
    cy.findByLabelText(/cardholder name/i).type('Test User');
    
    // Fill in billing address
    cy.findByLabelText(/address line 1/i).type('123 Test Street');
    cy.findByLabelText(/address line 2/i).type('Apt 4B');
    cy.findByLabelText(/city/i).type('Test City');
    cy.findByLabelText(/state/i).type('TS');
    cy.findByLabelText(/postal code/i).type('12345');
    cy.findByLabelText(/country/i).select('United States');
    
    // Click 'Continue to Payment' button
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify payment processing page is loaded
    cy.findByText(/payment confirmation/i).should('be.visible');
    
    // Verify payment details are displayed for confirmation
    cy.findByText(/application fee/i).should('be.visible');
    cy.findByText(/\$75\.00/i).should('be.visible');
    cy.findByText(/credit card/i).should('be.visible');
  });

  it('should complete payment form with bank transfer', () => {
    // Click 'Pay Now' button for enrollment deposit
    cy.findAllByRole('button', { name: /pay now/i }).eq(1).click();
    
    // Verify payment form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Select 'Bank Transfer' as payment method
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.BANK_TRANSFER).click();
    
    // Verify bank account fields are displayed
    cy.findByLabelText(/account number/i).should('be.visible');
    cy.findByLabelText(/routing number/i).should('be.visible');
    cy.findByLabelText(/account holder name/i).should('be.visible');
    
    // Fill in bank account details
    cy.findByLabelText(/account number/i).type('000123456789');
    cy.findByLabelText(/routing number/i).type('110000000');
    cy.findByLabelText(/account holder name/i).type('Test User');
    
    // Click 'Continue to Payment' button
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify payment processing page is loaded
    cy.findByText(/payment confirmation/i).should('be.visible');
    
    // Verify payment details are displayed for confirmation
    cy.findByText(/enrollment deposit/i).should('be.visible');
    cy.findByText(/\$500\.00/i).should('be.visible');
    cy.findByText(/bank transfer/i).should('be.visible');
  });

  it('should validate payment form fields', () => {
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Verify payment form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Continue to Payment' without selecting payment method
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify validation error for payment method
    cy.findByText(/payment method is required/i).should('be.visible');
    
    // Select 'Credit Card' as payment method
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.CREDIT_CARD).click();
    
    // Click 'Continue to Payment' without filling card details
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify validation errors for required card fields
    cy.findByText(/card number is required/i).should('be.visible');
    cy.findByText(/expiration date is required/i).should('be.visible');
    cy.findByText(/cvv is required/i).should('be.visible');
    
    // Fill in invalid credit card number
    cy.findByLabelText(/card number/i).type('1234');
    
    // Verify validation error for card number format
    cy.findByText(/invalid card number/i).should('be.visible');
    
    // Fill in expired card date
    cy.findByLabelText(/expiration date/i).type('01/20');
    
    // Verify validation error for card expiration
    cy.findByText(/card has expired/i).should('be.visible');
  });

  it('should process successful payment', () => {
    // Stub payment gateway API to return successful response
    cy.intercept('POST', '/api/v1/payments/process', {
      statusCode: 200,
      body: {
        success: true,
        payment_id: 12345,
        transaction_id: 'txn_123456789',
        status: PaymentStatus.COMPLETED,
        message: 'Payment processed successfully',
        receipt_url: '/payments/12345/receipt'
      }
    }).as('processPayment');
    
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Complete payment form with valid credit card details
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.CREDIT_CARD).click();
    
    cy.findByLabelText(/card number/i).type('4242424242424242');
    cy.findByLabelText(/expiration date/i).type('12/30');
    cy.findByLabelText(/cvv/i).type('123');
    cy.findByLabelText(/cardholder name/i).type('Test User');
    
    cy.findByLabelText(/address line 1/i).type('123 Test Street');
    cy.findByLabelText(/city/i).type('Test City');
    cy.findByLabelText(/state/i).type('TS');
    cy.findByLabelText(/postal code/i).type('12345');
    cy.findByLabelText(/country/i).select('United States');
    
    // Click 'Continue to Payment' button
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify payment processing page is loaded
    cy.findByText(/payment confirmation/i).should('be.visible');
    
    // Click 'Confirm Payment' button
    cy.findByRole('button', { name: /confirm payment/i }).click();
    
    // Verify loading indicator is displayed during processing
    cy.findByRole('progressbar').should('be.visible');
    
    // Wait for payment to process
    cy.wait('@processPayment');
    
    // Verify success message is displayed after processing
    cy.findByText(/payment successful/i).should('be.visible');
    
    // Verify payment receipt is displayed
    cy.findByText(/transaction id: txn_123456789/i).should('be.visible');
    
    // Verify 'Return to Dashboard' button is available
    cy.findByRole('button', { name: /return to dashboard/i }).should('be.visible');
    
    // Click 'Return to Dashboard'
    cy.findByRole('button', { name: /return to dashboard/i }).click();
    
    // Verify redirection to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should handle failed payment gracefully', () => {
    // Stub payment gateway API to return failure response
    cy.intercept('POST', '/api/v1/payments/process', {
      statusCode: 400,
      body: {
        success: false,
        payment_id: 12345,
        transaction_id: null,
        status: PaymentStatus.FAILED,
        message: 'Payment processing failed',
        error_code: 'card_declined',
        error_message: 'Your card was declined'
      }
    }).as('processPayment');
    
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Complete payment form with valid credit card details
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.CREDIT_CARD).click();
    
    cy.findByLabelText(/card number/i).type('4242424242424242');
    cy.findByLabelText(/expiration date/i).type('12/30');
    cy.findByLabelText(/cvv/i).type('123');
    cy.findByLabelText(/cardholder name/i).type('Test User');
    
    cy.findByLabelText(/address line 1/i).type('123 Test Street');
    cy.findByLabelText(/city/i).type('Test City');
    cy.findByLabelText(/state/i).type('TS');
    cy.findByLabelText(/postal code/i).type('12345');
    cy.findByLabelText(/country/i).select('United States');
    
    // Click 'Continue to Payment' button
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify payment processing page is loaded
    cy.findByText(/payment confirmation/i).should('be.visible');
    
    // Click 'Confirm Payment' button
    cy.findByRole('button', { name: /confirm payment/i }).click();
    
    // Verify loading indicator is displayed during processing
    cy.findByRole('progressbar').should('be.visible');
    
    // Wait for payment to process
    cy.wait('@processPayment');
    
    // Verify error message is displayed after processing
    cy.findByText(/payment failed/i).should('be.visible');
    cy.findByText(/your card was declined/i).should('be.visible');
    
    // Verify option to try again is available
    cy.findByText(/please try again or use a different payment method/i).should('be.visible');
    
    // Verify 'Return to Payment Form' button is available
    cy.findByRole('button', { name: /return to payment form/i }).should('be.visible');
    
    // Click 'Return to Payment Form'
    cy.findByRole('button', { name: /return to payment form/i }).click();
    
    // Verify payment form is displayed again with preserved data
    cy.findByLabelText(/card number/i).should('have.value', '4242424242424242');
  });

  it('should cancel payment process', () => {
    // Click 'Pay Now' button for application fee
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Verify payment form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Cancel' button
    cy.findByRole('button', { name: /cancel/i }).click();
    
    // Verify payment form is closed
    cy.findByRole('dialog').should('not.exist');
    
    // Verify user remains on payment center page
    cy.url().should('include', '/payments');
    
    // Click 'Pay Now' button again
    cy.findAllByRole('button', { name: /pay now/i }).first().click();
    
    // Complete payment form
    cy.findByLabelText(/payment method/i).click();
    cy.findByText(PaymentMethod.CREDIT_CARD).click();
    
    cy.findByLabelText(/card number/i).type('4242424242424242');
    cy.findByLabelText(/expiration date/i).type('12/30');
    cy.findByLabelText(/cvv/i).type('123');
    cy.findByLabelText(/cardholder name/i).type('Test User');
    
    cy.findByLabelText(/address line 1/i).type('123 Test Street');
    cy.findByLabelText(/city/i).type('Test City');
    cy.findByLabelText(/state/i).type('TS');
    cy.findByLabelText(/postal code/i).type('12345');
    cy.findByLabelText(/country/i).select('United States');
    
    // Click 'Continue to Payment' button
    cy.findByRole('button', { name: /continue to payment/i }).click();
    
    // Verify payment processing page is loaded
    cy.findByText(/payment confirmation/i).should('be.visible');
    
    // Click 'Cancel' button
    cy.findByRole('button', { name: /cancel/i }).click();
    
    // Verify confirmation dialog is displayed
    cy.findByText(/are you sure you want to cancel this payment/i).should('be.visible');
    
    // Confirm cancellation
    cy.findByRole('button', { name: /yes, cancel/i }).click();
    
    // Verify redirection to payment center page
    cy.url().should('include', '/payments');
  });
});

// Test suite for Fee Waiver Requests
describe('Fee Waiver Requests', () => {
  beforeEach(() => {
    setupPaymentTest();
    cy.visit('/payments');
    cy.wait('@getPayments');
  });

  it('should submit fee waiver request', () => {
    // Stub API response for waiver submission
    cy.intercept('POST', '/api/v1/financial-aid/waiver', {
      statusCode: 200,
      body: {
        success: true,
        message: 'Fee waiver request submitted successfully',
        waiver_id: 123
      }
    }).as('submitWaiver');
    
    // Click 'Request Fee Waiver' button
    cy.findByRole('button', { name: /request fee waiver/i }).click();
    
    // Verify fee waiver request form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Select waiver reason from dropdown
    cy.findByLabelText(/reason for request/i).select('Financial Hardship');
    
    // Upload supporting document
    cy.findByLabelText(/supporting document/i).attachFile('financial_document.pdf');
    
    // Add explanation text
    cy.findByLabelText(/explanation/i).type('I am currently experiencing financial hardship due to loss of employment.');
    
    // Click 'Submit Request' button
    cy.findByRole('button', { name: /submit request/i }).click();
    
    // Verify API request to submit waiver is made
    cy.wait('@submitWaiver');
    
    // Verify success message is displayed
    cy.findByText(/fee waiver request submitted successfully/i).should('be.visible');
    
    // Verify fee waiver request form is closed
    cy.findByRole('dialog').should('not.exist');
    
    // Verify fee status is updated to 'Waiver Pending'
    cy.findByText(/waiver pending/i).should('be.visible');
  });

  it('should validate fee waiver form', () => {
    // Click 'Request Fee Waiver' button
    cy.findByRole('button', { name: /request fee waiver/i }).click();
    
    // Verify fee waiver request form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Submit Request' without filling required fields
    cy.findByRole('button', { name: /submit request/i }).click();
    
    // Verify validation errors for required fields
    cy.findByText(/reason for request is required/i).should('be.visible');
    cy.findByText(/supporting document is required/i).should('be.visible');
    cy.findByText(/explanation is required/i).should('be.visible');
    
    // Select waiver reason
    cy.findByLabelText(/reason for request/i).select('Financial Hardship');
    
    // Click 'Submit Request' without uploading document
    cy.findByRole('button', { name: /submit request/i }).click();
    
    // Verify validation error for required document
    cy.findByText(/supporting document is required/i).should('be.visible');
    
    // Upload document but leave explanation empty
    cy.findByLabelText(/supporting document/i).attachFile('financial_document.pdf');
    cy.findByRole('button', { name: /submit request/i }).click();
    
    // Verify validation error for required explanation
    cy.findByText(/explanation is required/i).should('be.visible');
  });

  it('should cancel fee waiver request', () => {
    // Click 'Request Fee Waiver' button
    cy.findByRole('button', { name: /request fee waiver/i }).click();
    
    // Verify fee waiver request form is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Cancel' button
    cy.findByRole('button', { name: /cancel/i }).click();
    
    // Verify fee waiver request form is closed
    cy.findByRole('dialog').should('not.exist');
    
    // Verify user remains on payment center page
    cy.url().should('include', '/payments');
  });

  it('should display pending fee waiver status', () => {
    // Load fixture with pending fee waiver
    cy.fixture('users/student_with_pending_waiver.json').then((user) => {
      cy.visit('/login');
      cy.findByLabelText('Email').type(user.email);
      cy.findByLabelText('Password').type(user.password);
      cy.findByRole('button', { name: /sign in/i }).click();
      cy.url().should('include', '/dashboard');
    });
    
    cy.visit('/payments');
    
    // Verify fee with pending waiver shows 'Waiver Pending' status
    cy.findByText(/waiver pending/i).should('be.visible');
    
    // Verify 'Pay Now' button is disabled for this fee
    cy.findAllByRole('button', { name: /pay now/i }).first().should('be.disabled');
    
    // Verify 'Request Fee Waiver' button is disabled for this fee
    cy.findAllByRole('button', { name: /request fee waiver/i }).first().should('be.disabled');
  });

  it('should display approved fee waiver', () => {
    // Load fixture with approved fee waiver
    cy.fixture('users/student_with_approved_waiver.json').then((user) => {
      cy.visit('/login');
      cy.findByLabelText('Email').type(user.email);
      cy.findByLabelText('Password').type(user.password);
      cy.findByRole('button', { name: /sign in/i }).click();
      cy.url().should('include', '/dashboard');
    });
    
    cy.visit('/payments');
    
    // Verify fee with approved waiver shows 'Waiver Approved' status
    cy.findByText(/waiver approved/i).should('be.visible');
    
    // Verify fee amount shows $0.00 or 'Waived'
    cy.findByText(/\$0\.00/i).should('be.visible');
    
    // Verify 'Pay Now' button is not displayed for this fee
    cy.findAllByRole('button', { name: /pay now/i }).first().should('not.exist');
    
    // Verify 'Request Fee Waiver' button is not displayed for this fee
    cy.findAllByRole('button', { name: /request fee waiver/i }).first().should('not.exist');
  });

  it('should display rejected fee waiver', () => {
    // Load fixture with rejected fee waiver
    cy.fixture('users/student_with_rejected_waiver.json').then((user) => {
      cy.visit('/login');
      cy.findByLabelText('Email').type(user.email);
      cy.findByLabelText('Password').type(user.password);
      cy.findByRole('button', { name: /sign in/i }).click();
      cy.url().should('include', '/dashboard');
    });
    
    cy.visit('/payments');
    
    // Verify fee with rejected waiver shows 'Waiver Rejected' status
    cy.findByText(/waiver rejected/i).should('be.visible');
    
    // Verify original fee amount is displayed
    cy.findByText(/\$75\.00/i).should('be.visible');
    
    // Verify 'Pay Now' button is enabled for this fee
    cy.findAllByRole('button', { name: /pay now/i }).first().should('be.enabled');
    
    // Verify 'Request Fee Waiver' button is enabled for this fee
    cy.findAllByRole('button', { name: /request fee waiver/i }).first().should('be.enabled');
    
    // Verify rejection reason is displayed or accessible
    cy.findByText(/view rejection reason/i).click();
    cy.findByText(/insufficient documentation provided/i).should('be.visible');
  });
});

// Test suite for Payment Receipt
describe('Payment Receipt', () => {
  beforeEach(() => {
    // Setup with a user that has payment history
    cy.fixture('users/student_with_payments.json').then((user) => {
      cy.visit('/login');
      cy.findByLabelText('Email').type(user.email);
      cy.findByLabelText('Password').type(user.password);
      cy.findByRole('button', { name: /sign in/i }).click();
      cy.url().should('include', '/dashboard');
    });
    
    cy.visit('/payments');
    cy.findByRole('tab', { name: /payment history/i }).click();
    cy.wait('@getPayments');
  });

  it('should display payment receipt with correct information', () => {
    // Stub receipt API response
    cy.intercept('GET', '/api/v1/payments/*/receipt', {
      statusCode: 200,
      fixture: 'payments/receipt.json'
    }).as('getReceipt');
    
    // Click on receipt icon for a completed payment
    cy.findAllByRole('button', { name: /view receipt/i }).first().click();
    cy.wait('@getReceipt');
    
    // Verify receipt contains institution logo and name
    cy.findByAltText(/institution logo/i).should('be.visible');
    cy.findByText(/university name/i).should('be.visible');
    
    // Verify receipt contains receipt number/transaction ID
    cy.findByText(/receipt number/i).next().should('not.be.empty');
    cy.findByText(/transaction id/i).next().should('not.be.empty');
    
    // Verify receipt contains payment date and time
    cy.findByText(/payment date/i).next().should('not.be.empty');
    
    // Verify receipt contains payment amount and currency
    cy.findByText(/amount/i).next().should('contain.text', '$75.00');
    
    // Verify receipt contains payment method details
    cy.findByText(/payment method/i).next().should('contain.text', 'Credit Card');
    
    // Verify receipt contains payer information
    cy.findByText(/payer name/i).next().should('not.be.empty');
    cy.findByText(/payer email/i).next().should('not.be.empty');
    
    // Verify receipt contains payment purpose/description
    cy.findByText(/payment for/i).next().should('contain.text', 'Application Fee');
  });

  it('should download payment receipt as PDF', () => {
    // Create a stub for the download functionality
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    
    // Click on receipt icon for a completed payment
    cy.findAllByRole('button', { name: /view receipt/i }).first().click();
    cy.wait('@getReceipt');
    
    // Verify receipt modal is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Download' button
    cy.findByRole('button', { name: /download/i }).click();
    
    // Verify download is initiated
    cy.get('@windowOpen').should('be.called');
    
    // Verify downloaded file has correct name format
    cy.get('@windowOpen').should('be.calledWithMatch', /receipt-\d+\.pdf$/);
  });

  it('should print payment receipt', () => {
    // Create a stub for the print functionality
    cy.window().then((win) => {
      cy.stub(win, 'print').as('windowPrint');
    });
    
    // Click on receipt icon for a completed payment
    cy.findAllByRole('button', { name: /view receipt/i }).first().click();
    cy.wait('@getReceipt');
    
    // Verify receipt modal is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Print' button
    cy.findByRole('button', { name: /print/i }).click();
    
    // Verify print function is called
    cy.get('@windowPrint').should('be.called');
  });

  it('should close payment receipt', () => {
    // Click on receipt icon for a completed payment
    cy.findAllByRole('button', { name: /view receipt/i }).first().click();
    cy.wait('@getReceipt');
    
    // Verify receipt modal is displayed
    cy.findByRole('dialog').should('be.visible');
    
    // Click 'Close' button
    cy.findByRole('button', { name: /close/i }).click();
    
    // Verify receipt modal is closed
    cy.findByRole('dialog').should('not.exist');
    
    // Verify user remains on payment history tab
    cy.findByRole('tab', { name: /payment history/i }).should('have.attr', 'aria-selected', 'true');
  });
});