import React from 'react'; // Import React for type declarations
import ApplicationReview from './ApplicationReview';
import DocumentVerification from './DocumentVerification';
import ReportingDashboard from './ReportingDashboard';
import RolePermissionManager from './RolePermissionManager';
import SystemSettings from './SystemSettings';
import UserManagement from './UserManagement';

// Export ApplicationReview component for reviewing and managing student applications
export type ApplicationReviewProps = {
  applicationId: string;
  onStatusChange?: Function;
};
export { ApplicationReview };

// Export DocumentVerification component for verifying and managing uploaded documents
export type DocumentVerificationProps = {
  documentId: string;
  onVerificationComplete?: Function;
  className?: string;
};
export { DocumentVerification };

// Export ReportingDashboard component for visualizing admissions metrics and analytics
export type ReportingDashboardProps = {
  onExport?: Function;
};
export { ReportingDashboard };

// Export RolePermissionManager component for managing roles and permissions in the system
export { RolePermissionManager };

// Export SystemSettings component for managing system-wide settings and configurations
export type SystemSettingsProps = {
  onSave?: () => void;
  initialTab?: string;
};
export { SystemSettings };

// Export UserManagement component for managing users, their roles, and account status
export { UserManagement };