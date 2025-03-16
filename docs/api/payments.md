# Payments API Documentation

## Introduction
The Payments API provides endpoints for processing application fees, enrollment deposits, and other financial transactions within the Student Admissions Enrollment Platform. This API enables secure payment processing with support for multiple payment methods, transaction tracking, and receipt generation.

### Base URL
All Payment API endpoints are prefixed with the base API URL:

```
https://api.admissions.institution.edu/api/v1
```

### Authentication
All payment endpoints require authentication using a valid JWT token. Include the token in the Authorization header of your requests:

```
Authorization: Bearer {your_access_token}
```

See the [Authentication documentation](authentication.md) for details on obtaining and using access tokens.

### Response Format
All API responses follow the standard format described in the [API Overview](overview.md):

```json
{
  "success": true,
  "data": {
    // Payment data
  },
  "meta": {
    // Pagination or additional metadata
  },
  "message": "Optional success message"
}
```

Error responses follow the standard error format with appropriate HTTP status codes.

## Payment Resources
The following resources are used throughout the Payments API:

### Payment Object
```json
{
  "id": 123,
  "payment_type": "application_fee",
  "amount": 75.00,
  "currency": "USD",
  "payment_method": "credit_card",
  "status": "completed",
  "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
  "formatted_amount": "$75.00",
  "status_label": "Completed",
  "created_at": "2023-04-15T14:30:00Z",
  "updated_at": "2023-04-15T14:35:00Z",
  "paid_at": "2023-04-15T14:35:00Z",
  "user": {
    "id": 456,
    "email": "student@example.com",
    "name": "John Smith"
  },
  "application": {
    "id": 789,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024"
  },
  "payment_data": {
    "card_brand": "visa",
    "card_last4": "4242",
    "receipt_url": "https://payments.example.com/receipts/abc123"
  }
}
```

Note: The `user`, `application`, and `payment_data` fields are only included when specifically requested using the appropriate query parameters or endpoint options.

### Payment Status Values
Payments can have the following status values:

- `pending`: Payment has been initialized but not yet processed
- `completed`: Payment has been successfully processed
- `failed`: Payment processing failed
- `refunded`: Payment has been refunded (partially or fully)

### Payment Types
The platform supports the following payment types:

- `application_fee`: Fee for submitting an application
- `enrollment_deposit`: Deposit to confirm enrollment after acceptance
- `transcript_fee`: Fee for requesting official transcripts
- `other_fee`: Miscellaneous fees

### Payment Methods
The platform supports the following payment methods:

- `credit_card`: Credit or debit card payment
- `bank_transfer`: ACH or direct bank transfer
- `wire_transfer`: International wire transfer
- `online_payment`: Third-party payment services (PayPal, etc.)

## Endpoints
The following endpoints are available for payment operations:

### List Payments
```
GET /payments
```

Retrieve a paginated list of payments for the authenticated user.

**Query Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Items per page (default: 15, max: 50) |
| `payment_type` | string | Filter by payment type |
| `status` | string | Filter by payment status |
| `start_date` | string | Filter by date range (ISO 8601 format) |
| `end_date` | string | Filter by date range (ISO 8601 format) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "payment_type": "application_fee",
      "amount": 75.00,
      "currency": "USD",
      "payment_method": "credit_card",
      "status": "completed",
      "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
      "formatted_amount": "$75.00",
      "status_label": "Completed",
      "created_at": "2023-04-15T14:30:00Z",
      "updated_at": "2023-04-15T14:35:00Z",
      "paid_at": "2023-04-15T14:35:00Z"
    },
    // Additional payments...
  ],
  "meta": {
    "pagination": {
      "total": 10,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 10
    }
  }
}
```

### Get Payment Details
```
GET /payments/{id}
```

Retrieve details for a specific payment.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | integer | Payment ID |

**Query Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `include_user` | boolean | Include user details (default: false) |
| `include_application` | boolean | Include application details (default: false) |
| `include_payment_data` | boolean | Include payment_data details (default: false) |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "payment_type": "application_fee",
    "amount": 75.00,
    "currency": "USD",
    "payment_method": "credit_card",
    "status": "completed",
    "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
    "formatted_amount": "$75.00",
    "status_label": "Completed",
    "created_at": "2023-04-15T14:30:00Z",
    "updated_at": "2023-04-15T14:35:00Z",
    "paid_at": "2023-04-15T14:35:00Z",
    "user": {
      "id": 456,
      "email": "student@example.com",
      "name": "John Smith"
    },
    "application": {
      "id": 789,
      "application_type": "undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024"
    },
    "payment_data": {
      "card_brand": "visa",
      "card_last4": "4242",
      "receipt_url": "https://payments.example.com/receipts/abc123"
    }
  }
}
```

### Get Application Payments
```
GET /payments/application/{applicationId}
```

Retrieve payments associated with a specific application.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `applicationId` | integer | Application ID |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "payment_type": "application_fee",
      "amount": 75.00,
      "currency": "USD",
      "payment_method": "credit_card",
      "status": "completed",
      "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
      "formatted_amount": "$75.00",
      "status_label": "Completed",
      "created_at": "2023-04-15T14:30:00Z",
      "updated_at": "2023-04-15T14:35:00Z",
      "paid_at": "2023-04-15T14:35:00Z"
    },
    // Additional payments...
  ]
}
```

### Get Payment Types
```
GET /payments/types
```

Retrieve available payment types.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "application_fee",
      "name": "Application Fee",
      "description": "Fee for submitting an application",
      "amount": 75.00,
      "currency": "USD",
      "required": true
    },
    {
      "id": "enrollment_deposit",
      "name": "Enrollment Deposit",
      "description": "Deposit to confirm enrollment after acceptance",
      "amount": 500.00,
      "currency": "USD",
      "required": true
    },
    // Additional payment types...
  ]
}
```

### Get Payment Methods
```
GET /payments/methods/{paymentType}
```

Retrieve available payment methods for a specific payment type.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `paymentType` | string | Payment type ID |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "credit_card",
      "name": "Credit/Debit Card",
      "description": "Pay with Visa, Mastercard, American Express, or Discover",
      "supported_cards": ["visa", "mastercard", "amex", "discover"],
      "processing_fee": 0.00
    },
    {
      "id": "bank_transfer",
      "name": "Bank Transfer (ACH)",
      "description": "Pay directly from your bank account (US only)",
      "processing_fee": 0.00
    },
    // Additional payment methods...
  ]
}
```

### Initialize Payment
```
POST /payments/initialize
```

Initialize a payment for processing.

**Request Body:**

```json
{
  "payment_type": "application_fee",
  "amount": 75.00,
  "payment_method": "credit_card",
  "application_id": 789,
  "return_url": "https://admissions.institution.edu/payment-complete"
}
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `payment_type` | string | Yes | Type of payment |
| `amount` | number | Yes | Payment amount |
| `payment_method` | string | Yes | Payment method to use |
| `application_id` | integer | No | Associated application ID (if applicable) |
| `return_url` | string | No | URL to redirect after payment completion |

**Response:**

```json
{
  "success": true,
  "data": {
    "payment_id": 123,
    "client_secret": "pi_1J2gH3L5J6K7M8N9O_secret_AbCdEfGhIjKlMnOpQrStUvWx",
    "payment_intent_id": "pi_1J2gH3L5J6K7M8N9O",
    "redirect_url": "https://payments.example.com/checkout/pi_1J2gH3L5J6K7M8N9O",
    "amount": 75.00,
    "currency": "USD",
    "payment_method": "credit_card"
  }
}
```

The response includes the necessary information to complete the payment process. Depending on the payment method, you may need to:

1. Redirect the user to the `redirect_url` for hosted payment pages
2. Use the `client_secret` with a payment gateway SDK for client-side processing
3. Display payment instructions for manual payment methods

### Process Payment
```
POST /payments/{id}/process
```

Process a payment with the payment gateway.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | integer | Payment ID |

**Request Body:**

```json
{
  "payment_method_id": "pm_1J2gH3L5J6K7M8N9O",
  "payment_intent_id": "pi_1J2gH3L5J6K7M8N9O",
  "payment_data": {
    // Additional payment data specific to the payment method
  }
}
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `payment_method_id` | string | No | Payment method ID (for some payment gateways) |
| `payment_intent_id` | string | No | Payment intent ID (for some payment gateways) |
| `payment_data` | object | No | Additional payment data specific to the payment method |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "completed",
    "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
    "amount": 75.00,
    "currency": "USD",
    "paid_at": "2023-04-15T14:35:00Z",
    "receipt_url": "https://payments.example.com/receipts/abc123"
  },
  "message": "Payment processed successfully"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "The payment could not be processed",
    "details": {
      "reason": "insufficient_funds",
      "description": "The card has insufficient funds to complete the purchase"
    }
  }
}
```

### Generate Receipt
```
GET /payments/{id}/receipt
```

Generate a receipt for a completed payment.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | integer | Payment ID |

**Response:**

```json
{
  "success": true,
  "data": {
    "receipt_number": "REC-2023-04-15-123",
    "payment_id": 123,
    "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
    "payment_date": "2023-04-15T14:35:00Z",
    "payment_method": "Credit Card (Visa ****4242)",
    "amount": "$75.00",
    "currency": "USD",
    "status": "Completed",
    "payer": {
      "name": "John Smith",
      "email": "student@example.com"
    },
    "payment_for": {
      "type": "Application Fee",
      "application_id": 789,
      "application_type": "Undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024"
    },
    "institution": {
      "name": "Example University",
      "address": "123 University Ave, College Town, ST 12345",
      "tax_id": "12-3456789"
    },
    "download_url": "https://api.admissions.institution.edu/api/v1/payments/123/receipt/download"
  }
}
```

### Refund Payment (Admin Only)
```
POST /payments/{id}/refund
```

Process a refund for a completed payment. This endpoint requires administrator or staff role.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | integer | Payment ID |

**Request Body:**

```json
{
  "amount": 75.00,
  "reason": "Application withdrawn"
}
```

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | number | No | Refund amount (defaults to full payment amount if omitted) |
| `reason` | string | No | Reason for the refund |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "refunded",
    "refund_id": "re_1J2gH3L5J6K7M8N9O",
    "amount": 75.00,
    "currency": "USD",
    "refunded_at": "2023-04-16T10:15:00Z"
  },
  "message": "Payment refunded successfully"
}
```

### Payment Webhook
```
POST /webhooks/payments/{provider}
```

Handle webhook events from payment gateways. This endpoint is used by payment providers to send event notifications.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `provider` | string | Payment provider name (e.g., 'stripe', 'paypal') |

**Request Body:**

The request body format varies depending on the payment provider. The webhook handler will validate the signature and process the event accordingly.

**Response:**

```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

## Payment Processing Flow
The typical payment processing flow involves the following steps:

### 1. Get Available Payment Types
Call the `GET /payments/types` endpoint to retrieve available payment types for the current context (e.g., application fee, enrollment deposit).

### 2. Get Available Payment Methods
Call the `GET /payments/methods/{paymentType}` endpoint to retrieve available payment methods for the selected payment type.

### 3. Initialize Payment
Call the `POST /payments/initialize` endpoint to create a payment record and initialize the payment process with the payment gateway. This will return the necessary information to proceed with the payment.

### 4. Complete Payment
Depending on the payment method:

- For redirect-based methods: Redirect the user to the payment gateway's checkout page using the provided `redirect_url`.
- For client-side methods: Use the payment gateway's client SDK with the provided `client_secret` to collect payment details and confirm the payment.

After the payment is completed, the payment gateway will either:
- Redirect the user back to your application using the `return_url` provided during initialization.
- Notify your application via webhook about the payment status.

### 5. Process Payment
Call the `POST /payments/{id}/process` endpoint to finalize the payment processing. This step may be optional depending on the payment method and gateway integration.

### 6. Verify Payment Status
Call the `GET /payments/{id}` endpoint to verify the payment status. A successful payment will have a status of `completed`.

### 7. Generate Receipt
Call the `GET /payments/{id}/receipt` endpoint to generate a receipt for the completed payment.

## Error Handling
The Payments API uses standard HTTP status codes and error response format as described in the [API Overview](overview.md).

### Common Error Codes
| Error Code | Description |
| --- | --- |
| `PAYMENT_NOT_FOUND` | The specified payment was not found |
| `PAYMENT_INVALID_STATUS` | The payment is not in the required status for the requested operation |
| `PAYMENT_TYPE_INVALID` | The specified payment type is not valid |
| `PAYMENT_METHOD_INVALID` | The specified payment method is not valid for the payment type |
| `PAYMENT_AMOUNT_INVALID` | The payment amount is invalid or below the minimum required |
| `PAYMENT_PROCESSING_FAILED` | The payment processing failed at the payment gateway |
| `PAYMENT_ALREADY_COMPLETED` | The payment has already been completed |
| `PAYMENT_ALREADY_REFUNDED` | The payment has already been refunded |
| `REFUND_AMOUNT_INVALID` | The refund amount is invalid or exceeds the original payment amount |
| `WEBHOOK_SIGNATURE_INVALID` | The webhook signature is invalid or missing |

### Payment Gateway Errors
When a payment fails at the payment gateway level, the API will return the error details from the payment gateway in the `error.details` field of the response. These details can include:

- `reason`: A code indicating the reason for the failure (e.g., `card_declined`, `insufficient_funds`)
- `description`: A human-readable description of the error
- `param`: The parameter that caused the error (if applicable)
- `gateway_error_code`: The original error code from the payment gateway

## Security Considerations
When working with the Payments API, consider the following security best practices:

### PCI Compliance
The Payments API is designed to minimize PCI DSS scope by:

1. Never requiring your application to handle or store credit card numbers
2. Using tokenization for payment methods
3. Leveraging secure, PCI-compliant payment gateways

Always use the provided client-side SDKs or hosted payment pages to collect payment information.

### Webhook Security
When configuring webhooks for payment notifications:

1. Always validate webhook signatures to ensure authenticity
2. Use HTTPS endpoints for receiving webhook events
3. Implement idempotent processing to handle duplicate webhook events
4. Respond quickly to webhook requests (within 5 seconds)

### Data Protection
The Payments API implements several data protection measures:

1. All payment data is encrypted at rest and in transit
2. Sensitive payment details are masked in API responses (e.g., only the last 4 digits of card numbers are exposed)
3. Payment data access is strictly controlled through permissions
4. Payment history is retained according to regulatory requirements

## Webhooks
The Payments API supports webhooks for real-time payment event notifications. Configure your webhook endpoint in the administrative interface or via the API.

### Available Events
| Event | Description |
| --- | --- |
| `payment.created` | A new payment has been created |
| `payment.updated` | A payment has been updated |
| `payment.completed` | A payment has been successfully completed |
| `payment.failed` | A payment has failed |
| `payment.refunded` | A payment has been refunded |

### Webhook Payload
```json
{
  "event": "payment.completed",
  "timestamp": "2023-04-15T14:35:00Z",
  "data": {
    "payment_id": 123,
    "transaction_id": "pi_1J2gH3L5J6K7M8N9O",
    "amount": 75.00,
    "currency": "USD",
    "status": "completed",
    "payment_type": "application_fee",
    "application_id": 789,
    "user_id": 456
  }
}
```

### Webhook Verification
To verify webhook authenticity, the API includes a signature in the `X-Webhook-Signature` header. Verify this signature using your webhook secret to ensure the webhook is legitimate.

```
X-Webhook-Signature: t=1618502100,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

The signature is generated using HMAC-SHA256 with your webhook secret as the key and the request body as the message.

## Testing
The Payments API provides testing capabilities to simulate payment scenarios without processing real transactions.

### Test Mode
In the development and staging environments, the API operates in test mode by default. This allows you to simulate payment flows without processing real transactions.

To indicate that you're making a test request, include the following header:

```
X-Test-Mode: true
```

### Test Cards
For testing credit card payments, you can use the following test card numbers:

| Card Number | Brand | Test Scenario |
| --- | --- | --- |
| 4242 4242 4242 4242 | Visa | Successful payment |
| 4000 0000 0000 0002 | Visa | Declined payment (generic decline) |
| 4000 0000 0000 9995 | Visa | Declined payment (insufficient funds) |
| 4000 0000 0000 3220 | Visa | 3D Secure authentication required |

Use any future expiration date, any 3-digit CVC, and any postal code.

### Test Bank Accounts
For testing bank transfers (ACH), you can use the following test account numbers:

| Account Number | Routing Number | Test Scenario |
| --- | --- | --- |
| 000123456789 | 110000000 | Successful payment |
| 000111111116 | 110000000 | Declined payment (insufficient funds) |
| 000111111113 | 110000000 | Declined payment (account closed) |

### Simulating Webhooks
You can simulate webhook events in the development environment using the webhook testing tool in the administrative interface. This allows you to test your webhook handling without waiting for actual payment events.

## Integration Examples
The following examples demonstrate common integration scenarios with the Payments API.

### Processing an Application Fee
```javascript
// Step 1: Get available payment types
const paymentTypesResponse = await fetch('/api/v1/payments/types', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const paymentTypes = await paymentTypesResponse.json();
const applicationFee = paymentTypes.data.find(type => type.id === 'application_fee');

// Step 2: Get available payment methods
const paymentMethodsResponse = await fetch(`/api/v1/payments/methods/application_fee`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const paymentMethods = await paymentMethodsResponse.json();

// Step 3: Initialize payment
const initializeResponse = await fetch('/api/v1/payments/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    payment_type: 'application_fee',
    amount: applicationFee.amount,
    payment_method: 'credit_card',
    application_id: applicationId,
    return_url: 'https://your-application.com/payment-complete'
  })
});
const paymentData = await initializeResponse.json();

// Step 4: Redirect to payment page or use client-side SDK
window.location.href = paymentData.data.redirect_url;

// Step 5: After payment completion (on return_url page)
const paymentId = getPaymentIdFromUrl(); // Extract from URL or session storage

// Step 6: Verify payment status
const paymentStatusResponse = await fetch(`/api/v1/payments/${paymentId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const paymentStatus = await paymentStatusResponse.json();

if (paymentStatus.data.status === 'completed') {
  // Payment successful, generate receipt
  const receiptResponse = await fetch(`/api/v1/payments/${paymentId}/receipt`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const receipt = await receiptResponse.json();
  
  // Display receipt or redirect to receipt page
  displayReceipt(receipt.data);
} else {
  // Payment failed or pending
  handlePaymentError(paymentStatus.data);
}
```

### Handling Webhooks
```javascript
// Express.js webhook handler example
app.post('/webhook/payments', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  // Verify signature
  const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
  
  if (!isValid) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = JSON.parse(req.body.toString());
  
  // Handle different event types
  switch (event.event) {
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
    case 'payment.failed':
      handlePaymentFailed(event.data);
      break;
    case 'payment.refunded':
      handlePaymentRefunded(event.data);
      break;
    default:
      console.log(`Unhandled event type: ${event.event}`);
  }
  
  // Acknowledge receipt of the webhook
  res.status(200).send('Webhook received');
});

// Verify webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  // Extract timestamp and signature from header
  const [timestamp, signatureHash] = signature.split(',');
  const timestampValue = timestamp.split('=')[1];
  const signatureValue = signatureHash.split('=')[1];
  
  // Create the expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestampValue}.${payload}`);
  const expectedSignature = hmac.digest('hex');
  
  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signatureValue),
    Buffer.from(expectedSignature)
  );
}
```

## API Reference
For a complete reference of all API endpoints, request and response formats, and error codes, refer to the [OpenAPI specification](openapi.yaml).