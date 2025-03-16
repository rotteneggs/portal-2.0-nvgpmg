// Barrel file that exports all Dashboard components for the Student Admissions Enrollment Platform.
// This file serves as a central export point for all dashboard-related components, making them available for import from a single location.

import ApplicationTimeline, { ApplicationTimelineProps } from './ApplicationTimeline';
import DocumentStatus, { DocumentStatusProps } from './DocumentStatus';
import ImportantDates from './ImportantDates';
import NextSteps, { NextStepsProps } from './NextSteps';
import RecentMessages, { RecentMessagesProps } from './RecentMessages';
import StatusCard, { StatusCardProps } from './StatusCard';

// Export the ApplicationTimeline component for displaying application progress timeline
export { ApplicationTimeline };

// Export the ApplicationTimelineProps interface for type checking
export type { ApplicationTimelineProps };

// Export the DocumentStatus component for displaying document upload and verification status
export { DocumentStatus };

// Export the DocumentStatusProps interface for type checking
export type { DocumentStatusProps };

// Export the ImportantDates component for displaying important application deadlines
export { ImportantDates };

// Export the NextSteps component for displaying action items and required tasks
export { NextSteps };

// Export the NextStepsProps interface for type checking
export type { NextStepsProps };

// Export the RecentMessages component for displaying recent communications
export { RecentMessages };

// Export the RecentMessagesProps interface for type checking
export type { RecentMessagesProps };

// Export the StatusCard component for displaying application status summary
export { StatusCard };

// Export the StatusCardProps interface for type checking
export type { StatusCardProps };