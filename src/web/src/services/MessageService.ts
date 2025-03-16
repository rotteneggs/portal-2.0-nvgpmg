/**
 * Service module that provides messaging functionality for the Student Admissions Enrollment Platform.
 * Encapsulates message-related operations such as fetching, sending, replying to messages,
 * and handling message attachments, while providing utility functions for message formatting and display.
 */
import { 
  Message, 
  MessageResponse, 
  MessagePaginationOptions, 
  MessageCreateRequest, 
  MessageReplyRequest, 
  UnreadCountResponse,
  AttachmentDownloadResponse
} from '../types/message';

import {
  getMessages,
  getMessage,
  sendMessage,
  replyToMessage,
  markAsRead,
  markAsUnread,
  getUnreadCount,
  getApplicationMessages,
  deleteMessage,
  getAttachmentDownloadUrl,
  searchMessages
} from '../api/messages';

import { formatDate, formatTime, formatRelativeTime } from '../utils/dateUtils';
import { format } from 'date-fns'; // v2.29.3

/**
 * Fetches a paginated list of messages for the current user
 * 
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated message response
 */
const fetchMessages = async (
  options: MessagePaginationOptions = {} as MessagePaginationOptions
): Promise<MessageResponse> => {
  const response = await getMessages(options);
  
  // Format message timestamps and generate previews
  if (response?.data) {
    response.data = response.data.map(message => ({
      ...message,
      formatted_created_at: formatMessageTimestamp(message.created_at),
      preview: formatMessagePreview(message.message_body, 100)
    }));
  }
  
  return response;
};

/**
 * Fetches a single message by ID
 * 
 * @param messageId - ID of the message to fetch
 * @returns Promise resolving to the message details
 */
const fetchMessage = async (messageId: number): Promise<Message> => {
  const message = await getMessage(messageId);
  
  // Format message timestamp
  return {
    ...message,
    formatted_created_at: formatMessageTimestamp(message.created_at, true)
  };
};

/**
 * Creates and sends a new message
 * 
 * @param messageData - Data for the new message
 * @param onUploadProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the created message
 */
const createMessage = async (
  messageData: MessageCreateRequest,
  onUploadProgress?: (progressEvent: any) => void
): Promise<Message> => {
  // Validate required fields
  if (!messageData.recipient_id) {
    throw new Error('Recipient is required');
  }
  
  if (!messageData.subject) {
    throw new Error('Subject is required');
  }
  
  if (!messageData.message_body) {
    throw new Error('Message body is required');
  }
  
  // Send message with potential file attachments
  return await sendMessage({
    ...messageData,
    attachments: messageData.attachments || null
  });
};

/**
 * Replies to an existing message
 * 
 * @param messageId - ID of the message to reply to
 * @param replyData - Reply message data
 * @param onUploadProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the created reply message
 */
const replyToExistingMessage = async (
  messageId: number,
  replyData: MessageReplyRequest,
  onUploadProgress?: (progressEvent: any) => void
): Promise<Message> => {
  // Validate required fields
  if (!replyData.message_body) {
    throw new Error('Message body is required');
  }
  
  // Send reply with potential file attachments
  return await replyToMessage(messageId, {
    ...replyData,
    attachments: replyData.attachments || null
  });
};

/**
 * Marks a message as read
 * 
 * @param messageId - ID of the message to mark as read
 * @returns Promise resolving to success status
 */
const markMessageAsRead = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return await markAsRead(messageId);
};

/**
 * Marks a message as unread
 * 
 * @param messageId - ID of the message to mark as unread
 * @returns Promise resolving to success status
 */
const markMessageAsUnread = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return await markAsUnread(messageId);
};

/**
 * Fetches the count of unread messages for the current user
 * 
 * @returns Promise resolving to the unread message count
 */
const fetchUnreadCount = async (): Promise<number> => {
  const response = await getUnreadCount();
  return response.count;
};

/**
 * Fetches messages related to a specific application
 * 
 * @param applicationId - ID of the application
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated message response
 */
const fetchApplicationMessages = async (
  applicationId: number,
  options: MessagePaginationOptions = {} as MessagePaginationOptions
): Promise<MessageResponse> => {
  const response = await getApplicationMessages(applicationId, options);
  
  // Format message timestamps and generate previews
  if (response?.data) {
    response.data = response.data.map(message => ({
      ...message,
      formatted_created_at: formatMessageTimestamp(message.created_at),
      preview: formatMessagePreview(message.message_body, 100)
    }));
  }
  
  return response;
};

/**
 * Deletes a message
 * 
 * @param messageId - ID of the message to delete
 * @returns Promise resolving to success status
 */
const deleteExistingMessage = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return await deleteMessage(messageId);
};

/**
 * Gets a temporary download URL for a message attachment
 * 
 * @param attachmentId - ID of the attachment
 * @param expirationMinutes - Number of minutes until the URL expires (default: 30)
 * @returns Promise resolving to the download URL
 */
const getAttachmentUrl = async (
  attachmentId: number,
  expirationMinutes: number = 30
): Promise<string> => {
  const response = await getAttachmentDownloadUrl(attachmentId, expirationMinutes);
  return response.download_url;
};

/**
 * Searches messages by content
 * 
 * @param searchTerm - Term to search for in messages
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated search results
 */
const searchMessageContent = async (
  searchTerm: string,
  options: MessagePaginationOptions = {} as MessagePaginationOptions
): Promise<MessageResponse> => {
  const response = await searchMessages(searchTerm, options);
  
  // Format message timestamps and generate previews
  if (response?.data) {
    response.data = response.data.map(message => ({
      ...message,
      formatted_created_at: formatMessageTimestamp(message.created_at),
      preview: formatMessagePreview(message.message_body, 100)
    }));
  }
  
  return response;
};

/**
 * Formats a message body into a short preview
 * 
 * @param messageBody - The full message body text (may contain HTML)
 * @param maxLength - Maximum length of the preview
 * @returns Formatted message preview
 */
const formatMessagePreview = (
  messageBody: string,
  maxLength: number = 100
): string => {
  // Remove HTML tags
  const textOnly = messageBody.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  const trimmed = textOnly.trim();
  
  // Truncate if needed and add ellipsis
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength) + '...';
  }
  
  return trimmed;
};

/**
 * Formats a message timestamp for display
 * 
 * @param timestamp - ISO timestamp string
 * @param includeTime - Whether to include the time in the formatted string
 * @returns Formatted timestamp string
 */
const formatMessageTimestamp = (
  timestamp: string,
  includeTime: boolean = false
): string => {
  if (!timestamp) {
    return '';
  }
  
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  // Format time (e.g., "2:45 PM")
  const time = format(date, 'h:mm a');
  
  if (isToday) {
    return `Today at ${time}`;
  }
  
  if (isYesterday) {
    return `Yesterday at ${time}`;
  }
  
  // Check if the date is within the current week
  const dayDiff = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return `${format(date, 'EEEE')} at ${time}`;
  }
  
  // For older dates
  if (includeTime) {
    return format(date, 'MM/dd/yyyy') + ` at ${time}`;
  }
  
  return format(date, 'MM/dd/yyyy');
};

/**
 * Uploads a file attachment for a message
 * 
 * @param file - The file to upload
 * @param onUploadProgress - Optional callback for tracking upload progress
 * @returns Promise resolving to the uploaded attachment details
 */
const uploadMessageAttachment = async (
  file: File,
  onUploadProgress?: (progressEvent: any) => void
): Promise<{ id: number, url: string }> => {
  // Validate file size and type
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  
  if (file.size > maxSizeInBytes) {
    throw new Error(`File size exceeds the maximum allowed size of 10MB`);
  }
  
  // Create a FormData object and append the file
  const formData = new FormData();
  formData.append('file', file);
  
  // This is a placeholder implementation
  // In a production environment, we would call an API endpoint specifically
  // for uploading message attachments and track the upload progress
  
  return new Promise((resolve, reject) => {
    try {
      // Simulate upload process with progress
      if (onUploadProgress) {
        setTimeout(() => onUploadProgress({ loaded: file.size / 2, total: file.size }), 200);
        setTimeout(() => onUploadProgress({ loaded: file.size, total: file.size }), 500);
      }
      
      // Simulate successful upload
      setTimeout(() => {
        resolve({
          id: Date.now(), // Mock ID using timestamp
          url: URL.createObjectURL(file) // Temporary URL for demo
        });
      }, 800);
    } catch (error) {
      reject(new Error(`Failed to upload attachment: ${error.message}`));
    }
  });
};

export default {
  fetchMessages,
  fetchMessage,
  createMessage,
  replyToExistingMessage,
  markMessageAsRead,
  markMessageAsUnread,
  fetchUnreadCount,
  fetchApplicationMessages,
  deleteExistingMessage,
  getAttachmentUrl,
  searchMessageContent,
  formatMessagePreview,
  formatMessageTimestamp,
  uploadMessageAttachment
};