// Barrel file that exports all components from the Applications directory,
// making them easily importable throughout the application. This file simplifies imports by allowing consumers to import multiple components from a single path.

import ApplicationForm, { ApplicationFormProps } from './ApplicationForm'; // Import the ApplicationForm component for re-export
import ApplicationList from './ApplicationList'; // Import the ApplicationList component for re-export
import ApplicationStatus, { ApplicationStatusProps } from './ApplicationStatus'; // Import the ApplicationStatus component for re-export
import ApplicationReview, { ApplicationReviewProps } from './ApplicationReview'; // Import the ApplicationReview component for reviewing application details

// Export the ApplicationForm component for creating and editing applications
export { ApplicationForm };
// Export the ApplicationList component for displaying a list of applications
export { ApplicationList };
// Export the ApplicationStatus component for displaying application status
export { ApplicationStatus };
// Export the ApplicationReview component for reviewing application details
export { ApplicationReview };

// Export the ApplicationFormProps interface for type checking
export type { ApplicationFormProps };
// Export the ApplicationStatusProps interface for type checking
export type { ApplicationStatusProps };
// Export the ApplicationReviewProps interface for type checking
export type { ApplicationReviewProps };