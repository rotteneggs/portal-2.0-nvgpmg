/**
 * TypeScript type definitions for the messaging system in the Student Admissions Enrollment Platform.
 * This file defines interfaces for messages, message attachments, API requests and responses
 * related to the in-app messaging functionality.
 */

import { PaginationResponse, PaginationOptions } from './common';
import { User } from './user';
import { Application } from './application';

/**
 * Interface representing a message in the messaging system
 */
export interface Message {
  id: number;
  sender_user_id: number;
  recipient_user_id: number;
  application_id: number | null;
  subject: string;
  message_body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender: User;
  recipient: User;
  application: Application | null;
  attachments: MessageAttachment[];
  read_status: string;
  formatted_created_at: string;
  preview: string | null;
}

/**
 * Interface representing a file attachment for a message
 */
export interface MessageAttachment {
  id: number;
  message_id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  formatted_file_size: string;
  icon_class: string;
  url: string;
}

/**
 * Interface for creating a new message
 */
export interface MessageCreateRequest {
  recipient_id: number;
  subject: string;
  message_body: string;
  application_id: number | null;
  attachments: File[] | null;
}

/**
 * Interface for replying to an existing message
 */
export interface MessageReplyRequest {
  message_body: string;
  attachments: File[] | null;
}

/**
 * Interface for paginated message response from the API
 */
export interface MessageResponse {
  data: Message[];
  meta: PaginationResponse;
}

/**
 * Interface extending PaginationOptions with message-specific filters
 */
export interface MessagePaginationOptions extends PaginationOptions {
  application_id: number | null;
  unread_only: boolean | null;
  search: string | null;
}

/**
 * Interface for the unread message count response
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * Interface for attachment download URL response
 */
export interface AttachmentDownloadResponse {
  download_url: string;
  expires_in_seconds: number;
}