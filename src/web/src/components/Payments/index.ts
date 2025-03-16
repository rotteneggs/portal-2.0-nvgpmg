import React from 'react';
import { PaymentForm, PaymentFormProps } from './PaymentForm'; // Import the PaymentForm component for re-export
import { PaymentHistory, PaymentHistoryProps } from './PaymentHistory'; // Import the PaymentHistory component for re-export
import { PaymentReceipt, PaymentReceiptProps } from './PaymentReceipt'; // Import the PaymentReceipt component for displaying payment receipts
import { FeeWaiverRequest, FeeWaiverRequestProps } from './FeeWaiverRequest'; // Import the FeeWaiverRequest component for re-export

/**
 * Export the PaymentForm component for processing payments
 * @component
 * @param {PaymentFormProps} props - The props for the PaymentForm component
 * @returns {React.FC<PaymentFormProps>} The PaymentForm component
 */
export { PaymentForm };
export type { PaymentFormProps };

/**
 * Export the PaymentHistory component for displaying payment history
 * @component
 * @param {PaymentHistoryProps} props - The props for the PaymentHistory component
 * @returns {React.FC<PaymentHistoryProps>} The PaymentHistory component
 */
export { PaymentHistory };
export type { PaymentHistoryProps };

/**
 * Export the PaymentReceipt component for displaying payment receipts
 * @component
 * @param {PaymentReceiptProps} props - The props for the PaymentReceipt component
 * @returns {React.FC<PaymentReceiptProps>} The PaymentReceipt component
 */
export { PaymentReceipt };
export type { PaymentReceiptProps };

/**
 * Export the FeeWaiverRequest component for requesting fee waivers
 * @component
 * @param {FeeWaiverRequestProps} props - The props for the FeeWaiverRequest component
 * @returns {React.FC<FeeWaiverRequestProps>} The FeeWaiverRequest component
 */
export { FeeWaiverRequest };
export type { FeeWaiverRequestProps };