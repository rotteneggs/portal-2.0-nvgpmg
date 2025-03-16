/**
 * API client module for handling message-related operations in the Student Admissions Enrollment Platform.
 * Provides functions to interact with the messaging API endpoints for sending, receiving,
 * and managing messages with attachments.
 */
import apiClient from './apiClient';
import { 
  Message, 
  MessageResponse, 
  MessagePaginationOptions, 
  MessageCreateRequest, 
  MessageReplyRequest, 
  UnreadCountResponse,
  AttachmentDownloadResponse
} from '../types/message';

/**
 * Fetch a paginated list of messages for the authenticated user
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated message response
 */
export const getMessages = async (
  options: MessagePaginationOptions = {}
): Promise<MessageResponse> => {
  return apiClient.get('messages', options);
};

/**
 * Fetch a specific message by ID
 * @param messageId - ID of the message to fetch
 * @returns Promise resolving to the message details
 */
export const getMessage = async (messageId: number): Promise<Message> => {
  return apiClient.get(`messages/${messageId}`);
};

/**
 * Create and send a new message
 * @param messageData - Data for the new message
 * @returns Promise resolving to the created message
 */
export const sendMessage = async (
  messageData: MessageCreateRequest
): Promise<Message> => {
  const { attachments, ...messageDetails } = messageData;
  
  if (attachments && attachments.length > 0) {
    // If there are attachments, use the upload method
    const formData = new FormData();
    
    // Add message details to form data
    Object.entries(messageDetails).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    // Add attachments to form data
    attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
    
    return apiClient.upload('messages', formData);
  }
  
  // If no attachments, use regular post method
  return apiClient.post('messages', messageDetails);
};

/**
 * Reply to an existing message
 * @param messageId - ID of the message to reply to
 * @param replyData - Reply message data
 * @returns Promise resolving to the created reply message
 */
export const replyToMessage = async (
  messageId: number,
  replyData: MessageReplyRequest
): Promise<Message> => {
  const { attachments, ...replyDetails } = replyData;
  
  if (attachments && attachments.length > 0) {
    // If there are attachments, use the upload method
    const formData = new FormData();
    
    // Add reply details to form data
    Object.entries(replyDetails).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });
    
    // Add attachments to form data
    attachments.forEach((file, index) => {
      formData.append(`attachments[${index}]`, file);
    });
    
    return apiClient.upload(`messages/${messageId}/reply`, formData);
  }
  
  // If no attachments, use regular post method
  return apiClient.post(`messages/${messageId}/reply`, replyDetails);
};

/**
 * Mark a message as read
 * @param messageId - ID of the message to mark as read
 * @returns Promise resolving to success status
 */
export const markAsRead = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return apiClient.post(`messages/${messageId}/read`, {});
};

/**
 * Mark a message as unread
 * @param messageId - ID of the message to mark as unread
 * @returns Promise resolving to success status
 */
export const markAsUnread = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return apiClient.post(`messages/${messageId}/unread`, {});
};

/**
 * Get the count of unread messages for the authenticated user
 * @returns Promise resolving to unread count response
 */
export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  return apiClient.get('messages/unread-count');
};

/**
 * Get messages related to a specific application
 * @param applicationId - ID of the application
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated message response
 */
export const getApplicationMessages = async (
  applicationId: number,
  options: MessagePaginationOptions = {}
): Promise<MessageResponse> => {
  return apiClient.get(`messages/application/${applicationId}`, options);
};

/**
 * Delete a message
 * @param messageId - ID of the message to delete
 * @returns Promise resolving to success status
 */
export const deleteMessage = async (
  messageId: number
): Promise<{ success: boolean }> => {
  return apiClient.delete(`messages/${messageId}`);
};

/**
 * Get a temporary download URL for a message attachment
 * @param attachmentId - ID of the attachment
 * @param expirationMinutes - Optional. Number of minutes the URL should be valid for
 * @returns Promise resolving to download URL response
 */
export const getAttachmentDownloadUrl = async (
  attachmentId: number,
  expirationMinutes?: number
): Promise<AttachmentDownloadResponse> => {
  const params = expirationMinutes ? { expires_in_minutes: expirationMinutes } : {};
  return apiClient.get(`messages/attachments/${attachmentId}/download`, params);
};

/**
 * Search messages by content
 * @param searchTerm - Term to search for in messages
 * @param options - Pagination and filtering options
 * @returns Promise resolving to paginated search results
 */
export const searchMessages = async (
  searchTerm: string,
  options: MessagePaginationOptions = {}
): Promise<MessageResponse> => {
  return apiClient.get('messages/search', { ...options, search: searchTerm });
};