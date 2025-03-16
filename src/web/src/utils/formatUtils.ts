import { ApplicationStatus, ApplicationType } from '../types/application';
import { PaymentType, PaymentStatus, PaymentMethod, Currency } from '../types/payment';
import { format } from 'date-fns'; // v^2.29.0

/**
 * Formats an application status code into a human-readable string
 */
export function formatStatus(status: string): string {
  if (!status) return '';
  
  switch (status) {
    case ApplicationStatus.DRAFT:
      return 'Draft';
    case ApplicationStatus.SUBMITTED:
      return 'Submitted';
    case ApplicationStatus.IN_REVIEW:
      return 'In Review';
    case ApplicationStatus.ADDITIONAL_INFO_REQUESTED:
      return 'Additional Information Requested';
    case ApplicationStatus.COMMITTEE_REVIEW:
      return 'Committee Review';
    case ApplicationStatus.DECISION_PENDING:
      return 'Decision Pending';
    case ApplicationStatus.ACCEPTED:
      return 'Accepted';
    case ApplicationStatus.WAITLISTED:
      return 'Waitlisted';
    case ApplicationStatus.REJECTED:
      return 'Rejected';
    case ApplicationStatus.DEPOSIT_PAID:
      return 'Deposit Paid';
    case ApplicationStatus.ENROLLED:
      return 'Enrolled';
    case ApplicationStatus.DECLINED:
      return 'Declined';
    default:
      // For unknown statuses, capitalize the first letter
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Formats an application type code into a human-readable string
 */
export function formatApplicationType(type: string): string {
  if (!type) return '';
  
  switch (type) {
    case ApplicationType.UNDERGRADUATE:
      return 'Undergraduate';
    case ApplicationType.GRADUATE:
      return 'Graduate';
    case ApplicationType.TRANSFER:
      return 'Transfer';
    case ApplicationType.INTERNATIONAL:
      return 'International';
    default:
      // For unknown types, capitalize the first letter
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Formats a number as currency with the specified currency code
 */
export function formatCurrency(amount: number | string | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '';
  }
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(numericAmount);
}

/**
 * Formats a number as a percentage with optional decimal places
 */
export function formatPercentage(value: number | string | null | undefined, decimalPlaces: number = 0): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '';
  }
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numericValue);
}

/**
 * Formats a payment type code into a human-readable string
 */
export function formatPaymentType(type: string): string {
  if (!type) return '';
  
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
      // For unknown payment types, convert from snake_case to Title Case
      return snakeToTitleCase(type);
  }
}

/**
 * Formats a payment status code into a human-readable string
 */
export function formatPaymentStatus(status: string): string {
  if (!status) return '';
  
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
      // For unknown statuses, convert from snake_case to Title Case
      return snakeToTitleCase(status);
  }
}

/**
 * Formats a payment method code into a human-readable string
 */
export function formatPaymentMethod(method: string): string {
  if (!method) return '';
  
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
      // For unknown methods, convert from snake_case to Title Case
      return snakeToTitleCase(method);
  }
}

/**
 * Formats a phone number string into a standardized format
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format for US/Canada phone numbers (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format for international numbers (with country code)
  if (cleaned.length > 10) {
    // Simple international formatting, more sophisticated formatting would require a library
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
  }
  
  // If the format is not recognized, return the original number
  return phoneNumber;
}

/**
 * Formats a person's name components into a full name
 */
export function formatName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  middleName?: string | null | undefined
): string {
  if (!firstName && !lastName) return '';
  
  const nameParts = [];
  
  if (firstName) nameParts.push(firstName);
  if (middleName) nameParts.push(middleName);
  if (lastName) nameParts.push(lastName);
  
  return nameParts.join(' ');
}

/**
 * Formats address components into a formatted address string
 */
export function formatAddress(addressComponents: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}): string {
  if (!addressComponents) return '';
  
  const {
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country
  } = addressComponents;
  
  const addressLines = [];
  
  if (address_line1) addressLines.push(address_line1);
  if (address_line2) addressLines.push(address_line2);
  
  const cityStateZip = [
    city,
    state,
    postal_code
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) addressLines.push(cityStateZip);
  if (country) addressLines.push(country);
  
  return addressLines.join('\n');
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(Number(bytes))) {
    return '';
  }
  
  let size = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  // Round to 2 decimal places
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
}

/**
 * Converts a string to title case (first letter of each word capitalized)
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts a snake_case string to Title Case
 */
export function snakeToTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  
  // Replace underscores with spaces and use the titleCase function
  return titleCase(str.replace(/_/g, ' '));
}

// Re-export date formatting function from date-fns for convenience
export { format as formatDate };