// React component imports
import DocumentLibrary from './DocumentLibrary';
import DocumentUploader from './DocumentUploader';
import DocumentViewer from './DocumentViewer';
import VerificationStatus from './VerificationStatus';
import RecommendationRequest from './RecommendationRequest';

// Define the types for each exported component
export type { DocumentLibraryProps } from './DocumentLibrary';
export type { DocumentUploaderProps } from './DocumentUploader';
export type { DocumentViewerProps } from './DocumentViewer';
export type { VerificationStatusProps } from './VerificationStatus';
export type { RecommendationRequestProps } from './RecommendationRequest';

/**
 * Exports the DocumentLibrary component for displaying and managing document collections
 * @component
 * @name DocumentLibrary
 * @description Displays a list of documents with filtering and sorting options.
 * @implements {React.FC<DocumentLibraryProps>}
 */
export { DocumentLibrary };

/**
 * Exports the DocumentUploader component for uploading document files
 * @component
 * @name DocumentUploader
 * @description Provides a user interface for uploading documents with type selection and progress tracking.
 * @implements {React.FC<DocumentUploaderProps>}
 */
export { DocumentUploader };

/**
 * Exports the DocumentViewer component for viewing document files
 * @component
 * @name DocumentViewer
 * @description Displays a document file with zoom, rotation, and download options.
 * @implements {React.FC<DocumentViewerProps>}
 */
export { DocumentViewer };

/**
 * Exports the VerificationStatus component for displaying document verification status
 * @component
 * @name VerificationStatus
 * @description Displays the verification status of a document, including verification method, timestamp, and confidence score.
 * @implements {React.FC<VerificationStatusProps>}
 */
export { VerificationStatus };

/**
 * Exports the RecommendationRequest component for requesting recommendation letters
 * @component
 * @name RecommendationRequest
 * @description Provides a form for requesting recommendation letters from recommenders.
 * @implements {React.FC<RecommendationRequestProps>}
 */
export { RecommendationRequest };