/**
 * Service for handling file uploads in the Student Admissions Enrollment Platform.
 * Provides advanced file upload capabilities including chunked uploads for large files,
 * progress tracking, and upload management.
 */
import { v4 as uuidv4 } from 'uuid'; // uuid v9.0.0
import SparkMD5 from 'spark-md5'; // spark-md5 v3.0.2

import apiClient from '../api/apiClient';
import { validateFileForDocumentType, getErrorMessageForFileValidation } from '../utils/fileUtils';
import { ID } from '../types/common';
import { Document } from '../types/document';

// Constants for chunked uploads
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk size
const MAX_CONCURRENT_CHUNKS = 3; // Maximum number of concurrent chunk uploads
const RETRY_ATTEMPTS = 3; // Number of retry attempts for failed uploads
const RETRY_DELAY = 1000; // Base delay for retry in milliseconds

// Track active uploads with progress information
interface ActiveUpload {
  progress: number;
  status: 'initializing' | 'uploading' | 'finalizing' | 'completed' | 'failed' | 'cancelled';
  isChunked: boolean;
  cancelRequested?: boolean;
}

const activeUploads: Record<string, ActiveUpload> = {};

/**
 * Uploads a document file to the server with progress tracking
 * 
 * @param file - The file to upload
 * @param documentType - Type of document being uploaded
 * @param applicationId - ID of the application this document belongs to
 * @param onProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the uploaded document
 */
const uploadDocumentFile = async (
  file: File,
  documentType: string,
  applicationId: ID,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  // Validate the file
  if (!validateFileForDocumentType(file, documentType)) {
    throw new Error(getErrorMessageForFileValidation(file, documentType));
  }
  
  // Generate unique upload ID for tracking
  const uploadId = uuidv4();
  
  // Create FormData with file and metadata
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  formData.append('application_id', applicationId.toString());
  
  // Track this upload
  activeUploads[uploadId] = {
    progress: 0,
    status: 'initializing',
    isChunked: false
  };
  
  try {
    // Update status
    activeUploads[uploadId].status = 'uploading';
    
    // Prepare upload configuration with progress tracking
    const config = {
      onUploadProgress: (progressEvent: any) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        
        // Update progress in active uploads
        if (activeUploads[uploadId]) {
          activeUploads[uploadId].progress = percentCompleted;
        }
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(percentCompleted);
        }
      }
    };
    
    // Upload the file
    const response = await apiClient.upload<Document>(
      'documents/upload',
      formData,
      {},
      config
    );
    
    // Update status and progress to completed
    if (activeUploads[uploadId]) {
      activeUploads[uploadId].status = 'completed';
      activeUploads[uploadId].progress = 100;
      
      // Remove from active uploads after a delay
      setTimeout(() => {
        delete activeUploads[uploadId];
      }, 5000);
    }
    
    return response;
  } catch (error) {
    // Update status to failed
    if (activeUploads[uploadId]) {
      activeUploads[uploadId].status = 'failed';
      
      // Remove from active uploads after a delay
      setTimeout(() => {
        delete activeUploads[uploadId];
      }, 5000);
    }
    
    throw error;
  }
};

/**
 * Uploads a large document file in chunks with progress tracking
 * 
 * @param file - The file to upload
 * @param documentType - Type of document being uploaded
 * @param applicationId - ID of the application this document belongs to
 * @param onProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the uploaded document
 */
const uploadChunkedDocumentFile = async (
  file: File,
  documentType: string,
  applicationId: ID,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  // Validate the file
  if (!validateFileForDocumentType(file, documentType)) {
    throw new Error(getErrorMessageForFileValidation(file, documentType));
  }
  
  // Generate unique upload ID for tracking
  const uploadId = uuidv4();
  
  // Calculate total number of chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Track this upload
  activeUploads[uploadId] = {
    progress: 0,
    status: 'initializing',
    isChunked: true
  };
  
  try {
    // Calculate file checksum for integrity verification
    const checksum = await calculateFileChecksum(file);
    
    // Initialize chunked upload on the server
    activeUploads[uploadId].status = 'uploading';
    const initResponse = await initChunkedUpload(
      uploadId,
      file.name,
      file.type,
      file.size,
      totalChunks,
      checksum,
      documentType,
      applicationId
    );
    
    const serverUploadId = initResponse.upload_id;
    
    // Upload all chunks with concurrency control
    const uploadedChunks = new Set<number>();
    const failedChunks = new Set<number>();
    let activePromises = 0;
    let completedChunks = 0;
    
    // Function to update progress
    const updateProgress = () => {
      const progress = Math.floor((completedChunks * 100) / totalChunks);
      
      // Update progress in active uploads
      if (activeUploads[uploadId]) {
        activeUploads[uploadId].progress = progress;
      }
      
      // Call progress callback if provided
      if (onProgress) {
        onProgress(progress);
      }
    };
    
    // Function to upload a specific chunk
    const uploadChunkWithIndex = async (chunkIndex: number): Promise<void> => {
      // Check if upload was cancelled
      if (activeUploads[uploadId]?.cancelRequested) {
        throw new Error('Upload cancelled');
      }
      
      // Calculate chunk boundaries
      const startByte = chunkIndex * CHUNK_SIZE;
      const endByte = Math.min(startByte + CHUNK_SIZE, file.size);
      
      try {
        await uploadChunk(serverUploadId, file, chunkIndex, startByte, endByte);
        uploadedChunks.add(chunkIndex);
        completedChunks++;
        updateProgress();
      } catch (error) {
        failedChunks.add(chunkIndex);
        throw error;
      }
    };
    
    // Upload all chunks with concurrency control
    return new Promise((resolve, reject) => {
      let currentChunkIndex = 0;
      
      // Function to start uploading next chunk
      const uploadNextChunk = () => {
        // If all chunks started uploading or upload was cancelled, don't start more
        if (currentChunkIndex >= totalChunks || activeUploads[uploadId]?.cancelRequested) {
          return;
        }
        
        // Start uploading next chunk
        const chunkIndex = currentChunkIndex++;
        activePromises++;
        
        uploadChunkWithIndex(chunkIndex)
          .catch(error => {
            console.error(`Error uploading chunk ${chunkIndex}:`, error);
            failedChunks.add(chunkIndex);
          })
          .finally(() => {
            activePromises--;
            
            // Try to upload next chunk
            uploadNextChunk();
            
            // Check if we're done (all chunks either uploaded or failed)
            if (activePromises === 0 && 
                (uploadedChunks.size + failedChunks.size) === totalChunks) {
              
              // Check if there were any failed chunks
              if (failedChunks.size > 0) {
                // Update status to failed
                if (activeUploads[uploadId]) {
                  activeUploads[uploadId].status = 'failed';
                  setTimeout(() => delete activeUploads[uploadId], 5000);
                }
                return reject(new Error(`Failed to upload ${failedChunks.size} chunks`));
              }
              
              // Finalize the upload
              if (activeUploads[uploadId]) {
                activeUploads[uploadId].status = 'finalizing';
              }
              
              finalizeChunkedUpload(uploadId, serverUploadId)
                .then(document => {
                  // Update status and progress to completed
                  if (activeUploads[uploadId]) {
                    activeUploads[uploadId].status = 'completed';
                    activeUploads[uploadId].progress = 100;
                    setTimeout(() => delete activeUploads[uploadId], 5000);
                  }
                  resolve(document);
                })
                .catch(error => {
                  // Update status to failed
                  if (activeUploads[uploadId]) {
                    activeUploads[uploadId].status = 'failed';
                    setTimeout(() => delete activeUploads[uploadId], 5000);
                  }
                  reject(error);
                });
            }
          });
      };
      
      // Start initial batch of concurrent uploads
      for (let i = 0; i < Math.min(MAX_CONCURRENT_CHUNKS, totalChunks); i++) {
        uploadNextChunk();
      }
    });
  } catch (error) {
    // Attempt to cancel the upload on the server
    try {
      await cancelUpload(uploadId);
    } catch (cancelError) {
      console.error('Error cancelling upload after failure:', cancelError);
    }
    
    // Update status to failed
    if (activeUploads[uploadId]) {
      activeUploads[uploadId].status = 'failed';
      setTimeout(() => delete activeUploads[uploadId], 5000);
    }
    
    throw error;
  }
};

/**
 * Initializes a chunked upload session on the server
 * 
 * @param uploadId - Client-side upload ID for tracking
 * @param fileName - Original file name
 * @param fileType - MIME type of the file
 * @param fileSize - Size of the file in bytes
 * @param totalChunks - Total number of chunks for this file
 * @param checksum - MD5 checksum of the file for integrity verification
 * @param documentType - Type of document being uploaded
 * @param applicationId - ID of the application this document belongs to
 * @returns Promise resolving to server-generated upload ID
 */
const initChunkedUpload = async (
  uploadId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  totalChunks: number,
  checksum: string,
  documentType: string,
  applicationId: ID
): Promise<{ upload_id: string }> => {
  const payload = {
    client_upload_id: uploadId,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
    total_chunks: totalChunks,
    checksum,
    document_type: documentType,
    application_id: applicationId
  };
  
  return apiClient.post(
    'documents/chunked-upload/init',
    payload
  );
};

/**
 * Uploads a single chunk of a file
 * 
 * @param uploadId - Server-side upload ID
 * @param file - The complete file object
 * @param chunkIndex - Index of this chunk (0-based)
 * @param startByte - Starting byte position in the file
 * @param endByte - Ending byte position in the file
 * @returns Promise resolving to upload result for this chunk
 */
const uploadChunk = async (
  uploadId: string,
  file: File,
  chunkIndex: number,
  startByte: number,
  endByte: number
): Promise<{ chunk_index: number, received_bytes: number }> => {
  // Extract the chunk from the file
  const chunk = file.slice(startByte, endByte);
  
  // Create FormData for the chunk
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('upload_id', uploadId);
  formData.append('chunk_index', chunkIndex.toString());
  formData.append('start_byte', startByte.toString());
  formData.append('end_byte', endByte.toString());
  
  // Implement retry logic with exponential backoff
  let attempt = 0;
  
  while (attempt < RETRY_ATTEMPTS) {
    try {
      // Attempt to upload the chunk
      return await apiClient.upload(
        'documents/chunked-upload/chunk',
        formData
      );
    } catch (error) {
      attempt++;
      
      // If we've used all retry attempts, throw the error
      if (attempt >= RETRY_ATTEMPTS) {
        console.error(`Failed to upload chunk ${chunkIndex} after ${RETRY_ATTEMPTS} attempts`);
        throw error;
      }
      
      // Otherwise, wait with exponential backoff before retrying
      const backoffDelay = RETRY_DELAY * Math.pow(2, attempt - 1);
      console.warn(`Chunk ${chunkIndex} upload failed, retrying in ${backoffDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  // This should never be reached due to the error handling above
  throw new Error(`Failed to upload chunk ${chunkIndex}`);
};

/**
 * Finalizes a chunked upload after all chunks are uploaded
 * 
 * @param uploadId - Client-side upload ID for tracking
 * @param serverUploadId - Server-side upload ID
 * @returns Promise resolving to the uploaded document
 */
const finalizeChunkedUpload = async (
  uploadId: string,
  serverUploadId: string
): Promise<Document> => {
  return apiClient.post(
    'documents/chunked-upload/finalize',
    {
      upload_id: serverUploadId,
      client_upload_id: uploadId
    }
  );
};

/**
 * Cancels an ongoing upload
 * 
 * @param uploadId - Client-side upload ID to cancel
 * @returns Promise resolving to true if cancellation was successful
 */
const cancelUpload = async (uploadId: string): Promise<boolean> => {
  // Check if upload exists
  if (!activeUploads[uploadId]) {
    console.warn(`Attempted to cancel non-existent upload: ${uploadId}`);
    return false;
  }
  
  // Mark as cancellation requested
  activeUploads[uploadId].cancelRequested = true;
  
  try {
    // If it's a chunked upload and in progress, send cancellation to server
    if (activeUploads[uploadId].isChunked && 
        ['initializing', 'uploading', 'finalizing'].includes(activeUploads[uploadId].status)) {
      await apiClient.post(
        'documents/chunked-upload/cancel',
        { client_upload_id: uploadId }
      );
    }
    
    // Update status to cancelled
    activeUploads[uploadId].status = 'cancelled';
    
    // Remove from active uploads after a delay
    setTimeout(() => {
      delete activeUploads[uploadId];
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('Error cancelling upload:', error);
    return false;
  }
};

/**
 * Gets the current progress of an ongoing upload
 * 
 * @param uploadId - Client-side upload ID to check
 * @returns Object containing upload progress percentage and status
 */
const getUploadProgress = (uploadId: string): { progress: number, status: string } => {
  if (activeUploads[uploadId]) {
    return {
      progress: activeUploads[uploadId].progress,
      status: activeUploads[uploadId].status
    };
  }
  
  return {
    progress: 0,
    status: 'not_found'
  };
};

/**
 * Calculates an MD5 checksum for a file
 * 
 * @param file - File to calculate checksum for
 * @returns Promise resolving to the MD5 checksum
 */
const calculateFileChecksum = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // 2MB chunks for reading
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();
    
    let currentChunk = 0;
    const chunks = Math.ceil(file.size / chunkSize);
    
    // Function to read the next chunk
    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
      
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };
    
    // Event handler for when chunk is loaded
    fileReader.onload = (e) => {
      if (!e.target?.result) {
        reject(new Error('Error reading file for checksum calculation'));
        return;
      }
      
      spark.append(e.target.result as ArrayBuffer);
      currentChunk++;
      
      if (currentChunk < chunks) {
        // Still have chunks to read
        loadNext();
      } else {
        // All chunks read, get result
        const checksum = spark.end();
        resolve(checksum);
      }
    };
    
    // Handle read errors
    fileReader.onerror = () => {
      reject(new Error('Error reading file for checksum calculation'));
    };
    
    // Start reading the first chunk
    loadNext();
  });
};

export default {
  uploadDocumentFile,
  uploadChunkedDocumentFile,
  cancelUpload,
  getUploadProgress
};