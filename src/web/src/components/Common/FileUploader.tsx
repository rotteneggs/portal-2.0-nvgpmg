import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import { Box, Typography, IconButton } from '@mui/material';
import { CloudUploadOutlined, InsertDriveFileOutlined, CloseOutlined } from '@mui/icons-material';
import Button from './Button';
import { 
  validateFileType, 
  validateFileSize, 
  getErrorMessageForFileValidation,
  formatFileSize 
} from '../../utils/fileUtils';
import { colors, spacing, borderRadius } from '../../styles/variables';
import { flexCenter } from '../../styles/mixins';

// Define interfaces for the component
export interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
  label?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  documentType?: string;
}

export interface FileWithPreview {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Styled components
const UploadContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: ${spacing.md};
`;

const DropZone = styled(Box)<{ isDragging: boolean; hasError: boolean; disabled: boolean }>`
  ${flexCenter}
  flex-direction: column;
  width: 100%;
  min-height: 150px;
  padding: ${spacing.md};
  border: 2px dashed ${props => 
    props.disabled ? colors.neutralLight : 
    props.hasError ? colors.error : 
    props.isDragging ? colors.primary : colors.border.default
  };
  border-radius: ${borderRadius.md};
  background-color: ${props => 
    props.disabled ? colors.background.disabled : 
    props.isDragging ? hexToRgba(colors.primary, 0.05) : 
    'transparent'
  };
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease-in-out;
  
  &:hover {
    border-color: ${props => 
      props.disabled ? colors.neutralLight : 
      props.hasError ? colors.error : 
      colors.primary
    };
    background-color: ${props => 
      props.disabled ? colors.background.disabled : 
      hexToRgba(colors.primary, 0.05)
    };
  }
`;

const FileInput = styled.input`
  display: none;
`;

const UploadIcon = styled(CloudUploadOutlined)`
  font-size: 48px;
  margin-bottom: ${spacing.sm};
  color: ${props => props.disabled ? colors.text.disabled : colors.primary};
`;

const FileList = styled(Box)`
  margin-top: ${spacing.md};
  width: 100%;
`;

const FileItem = styled(Box)`
  display: flex;
  align-items: center;
  padding: ${spacing.sm};
  border: 1px solid ${colors.border.light};
  border-radius: ${borderRadius.md};
  margin-bottom: ${spacing.sm};
  background-color: ${colors.background.paper};
`;

const FilePreview = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: ${spacing.sm};
  border-radius: ${borderRadius.sm};
  overflow: hidden;
  background-color: ${colors.background.default};
`;

const FileInfo = styled(Box)`
  flex: 1;
  overflow: hidden;
`;

const ErrorText = styled(Typography)`
  color: ${colors.error};
  margin-top: ${spacing.xs};
  font-size: 0.75rem;
`;

/**
 * A reusable file upload component with drag-and-drop functionality, file selection,
 * validation, and preview capabilities. Used throughout the application for document uploads.
 */
const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  label = 'Drag & Drop Files Here or Browse',
  helperText,
  error = false,
  disabled = false,
  className,
  documentType,
}) => {
  // State management
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      selectedFiles.forEach(fileWithPreview => {
        URL.revokeObjectURL(fileWithPreview.preview);
      });
    };
  }, [selectedFiles]);

  // Validate and process files
  const validateAndProcessFiles = useCallback((files: File[]) => {
    // If multiple is not allowed, only use the first file
    const filesToProcess = multiple ? files : files.slice(0, 1);
    let validationResult = { valid: true, errorMessage: '' };
    
    // Validate each file
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      // Check file type
      if (!validateFileType(file, acceptedFileTypes)) {
        validationResult = {
          valid: false,
          errorMessage: getErrorMessageForFileValidation(file, documentType || '')
        };
        break;
      }
      
      // Check file size
      if (!validateFileSize(file, maxFileSize)) {
        validationResult = {
          valid: false,
          errorMessage: `File "${file.name}" exceeds the maximum size of ${formatFileSize(maxFileSize)}.`
        };
        break;
      }
    }
    
    if (validationResult.valid) {
      // Create files with preview URLs
      const filesWithPreviews = filesToProcess.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      // Update state based on multiple selection
      const updatedFiles = multiple
        ? [...selectedFiles, ...filesWithPreviews]
        : filesWithPreviews;
      
      setSelectedFiles(updatedFiles);
      setValidationError(null);
      
      // Call onFileSelect with the file objects
      onFileSelect(updatedFiles.map(f => f.file));
    } else {
      setValidationError(validationResult.errorMessage);
    }
  }, [multiple, selectedFiles, onFileSelect, acceptedFileTypes, maxFileSize, documentType]);

  // Event handlers for drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  }, [disabled, isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    validateAndProcessFiles(files);
  }, [disabled, validateAndProcessFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      validateAndProcessFiles(files);
      
      // Reset the input value to allow selecting the same file again
      if (e.target) {
        e.target.value = '';
      }
    }
  }, [validateAndProcessFiles]);

  // Handle browse button click
  const handleBrowseClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent triggering the DropZone click
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prevFiles => {
      const newFiles = [...prevFiles];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      
      // Call onFileSelect with updated files
      onFileSelect(newFiles.map(f => f.file));
      
      return newFiles;
    });
  }, [onFileSelect]);

  // Format helper text
  const formattedHelperText = helperText || `Accepted formats: ${acceptedFileTypes.map(type => {
    if (type === 'application/pdf') return 'PDF';
    return type.split('/')[1].toUpperCase();
  }).join(', ')} (Max ${formatFileSize(maxFileSize)})`;

  return (
    <UploadContainer className={className}>
      {/* Drag and drop area */}
      <DropZone
        isDragging={isDragging}
        hasError={error || !!validationError}
        disabled={disabled}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={disabled}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <UploadIcon disabled={disabled} />
        <Typography
          variant="body1"
          color={disabled ? 'text.disabled' : 'text.primary'}
          align="center"
        >
          {label}
        </Typography>
        <Box mt={1}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleBrowseClick}
            disabled={disabled}
            aria-label="Browse files"
          >
            Browse Files
          </Button>
        </Box>
      </DropZone>
      
      {/* Helper text */}
      <Typography
        variant="caption"
        color={error || validationError ? 'error' : 'text.secondary'}
        sx={{ mt: 0.5 }}
      >
        {formattedHelperText}
      </Typography>
      
      {/* Validation error message */}
      {validationError && (
        <ErrorText role="alert">{validationError}</ErrorText>
      )}
      
      {/* Hidden file input */}
      <FileInput
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={acceptedFileTypes.join(',')}
        multiple={multiple}
        disabled={disabled}
        aria-label="File upload"
      />
      
      {/* File list */}
      {selectedFiles.length > 0 && (
        <FileList>
          {selectedFiles.map((file, index) => (
            <FileItem key={`${file.name}-${index}`}>
              <FilePreview>
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.preview}
                    alt={`Preview of ${file.name}`}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <InsertDriveFileOutlined color="primary" />
                )}
              </FilePreview>
              <FileInfo>
                <Typography
                  variant="body2"
                  noWrap
                  title={file.name}
                >
                  {file.name}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                >
                  {formatFileSize(file.size)}
                </Typography>
              </FileInfo>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveFile(index)}
                  aria-label={`Remove file ${file.name}`}
                >
                  <CloseOutlined fontSize="small" />
                </IconButton>
              )}
            </FileItem>
          ))}
        </FileList>
      )}
    </UploadContainer>
  );
};

export default FileUploader;