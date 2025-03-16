import { DocumentType } from '../types/document';

// Constants for file validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', ...ACCEPTED_IMAGE_TYPES];

// Document-specific requirements
export const DOCUMENT_TYPE_SPECIFICATIONS = {
  [DocumentType.TRANSCRIPT]: {
    acceptedTypes: [...ACCEPTED_DOCUMENT_TYPES],
    maxSize: MAX_FILE_SIZE
  },
  [DocumentType.RECOMMENDATION]: {
    acceptedTypes: ['application/pdf'],
    maxSize: MAX_FILE_SIZE
  },
  [DocumentType.PERSONAL_STATEMENT]: {
    acceptedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  [DocumentType.IDENTIFICATION]: {
    acceptedTypes: [...ACCEPTED_IMAGE_TYPES, 'application/pdf'],
    maxSize: MAX_FILE_SIZE
  },
  [DocumentType.TEST_SCORE]: {
    acceptedTypes: [...ACCEPTED_DOCUMENT_TYPES],
    maxSize: MAX_FILE_SIZE
  },
  [DocumentType.FINANCIAL]: {
    acceptedTypes: [...ACCEPTED_DOCUMENT_TYPES],
    maxSize: MAX_FILE_SIZE
  },
  [DocumentType.OTHER]: {
    acceptedTypes: [
      ...ACCEPTED_DOCUMENT_TYPES,
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: MAX_FILE_SIZE
  }
};

/**
 * Validates if a file's size is within the specified limit
 * @param file - The file to validate
 * @param maxSize - The maximum file size in bytes
 * @returns True if file size is valid, false otherwise
 */
export const validateFileSize = (file: File, maxSize: number): boolean => {
  if (!file) return false;
  return file.size <= maxSize;
};

/**
 * Validates if a file's MIME type is in the list of accepted types
 * @param file - The file to validate
 * @param acceptedTypes - Array of accepted MIME types
 * @returns True if file type is valid, false otherwise
 */
export const validateFileType = (file: File, acceptedTypes: string[]): boolean => {
  if (!file) return false;
  return acceptedTypes.includes(file.type);
};

/**
 * Validates a file against the requirements for a specific document type
 * @param file - The file to validate
 * @param documentType - The type of document being validated
 * @returns True if file meets all requirements for the document type
 */
export const validateFileForDocumentType = (file: File, documentType: string): boolean => {
  const specs = DOCUMENT_TYPE_SPECIFICATIONS[documentType as DocumentType];
  
  // If no specific requirements exist, use default requirements
  const requirements = specs || {
    acceptedTypes: ACCEPTED_DOCUMENT_TYPES,
    maxSize: MAX_FILE_SIZE
  };
  
  // Check both size and type
  const isSizeValid = validateFileSize(file, requirements.maxSize);
  const isTypeValid = validateFileType(file, requirements.acceptedTypes);
  
  return isSizeValid && isTypeValid;
};

/**
 * Gets an appropriate error message for file validation failures
 * @param file - The file that failed validation
 * @param documentType - The type of document being validated
 * @returns Error message describing the validation failure
 */
export const getErrorMessageForFileValidation = (file: File, documentType: string): string => {
  const specs = DOCUMENT_TYPE_SPECIFICATIONS[documentType as DocumentType];
  
  // If no specific requirements exist, use default requirements
  const requirements = specs || {
    acceptedTypes: ACCEPTED_DOCUMENT_TYPES,
    maxSize: MAX_FILE_SIZE
  };
  
  // Check size first
  if (!validateFileSize(file, requirements.maxSize)) {
    return `File size exceeds the maximum limit of ${formatFileSize(requirements.maxSize)}`;
  }
  
  // Then check type
  if (!validateFileType(file, requirements.acceptedTypes)) {
    const formattedTypes = requirements.acceptedTypes.map(type => {
      if (type.startsWith('image/')) {
        return type.replace('image/', '').toUpperCase();
      } else if (type === 'application/pdf') {
        return 'PDF';
      } else if (type === 'application/msword') {
        return 'DOC';
      } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return 'DOCX';
      }
      return type;
    }).join(', ');
    
    return `File type not accepted. Allowed formats: ${formattedTypes}`;
  }
  
  // Generic error if validation fails for unknown reason
  return 'File validation failed';
};

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  // Format with 1 decimal place for KB and above, 0 for bytes
  const formattedSize = i === 0 ? size.toFixed(0) : size.toFixed(1);
  
  return `${formattedSize} ${units[i]}`;
};

/**
 * Extracts the file extension from a filename
 * @param filename - The filename to process
 * @returns File extension without the dot
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
    return '';
  }
  return parts.pop()?.toLowerCase() || '';
};

/**
 * Checks if a file is an image based on its MIME type
 * @param mimeType - The MIME type to check
 * @returns True if the file is an image, false otherwise
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Checks if a file is a PDF based on its MIME type
 * @param mimeType - The MIME type to check
 * @returns True if the file is a PDF, false otherwise
 */
export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

/**
 * Gets the list of accepted file types for a specific document type
 * @param documentType - The type of document
 * @returns Array of accepted MIME types
 */
export const getAcceptedFileTypesForDocumentType = (documentType: string): string[] => {
  const specs = DOCUMENT_TYPE_SPECIFICATIONS[documentType as DocumentType];
  return specs ? specs.acceptedTypes : ACCEPTED_DOCUMENT_TYPES;
};

/**
 * Gets the maximum file size for a specific document type
 * @param documentType - The type of document
 * @returns Maximum file size in bytes
 */
export const getMaxFileSizeForDocumentType = (documentType: string): number => {
  const specs = DOCUMENT_TYPE_SPECIFICATIONS[documentType as DocumentType];
  return specs ? specs.maxSize : MAX_FILE_SIZE;
};