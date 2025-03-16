# Messaging API Documentation

## Introduction
The Messaging API provides a secure communication channel between applicants and admissions staff within the Student Admissions Enrollment Platform. This API enables thread-based conversations, file attachments, and read status tracking, creating an auditable communication trail and reducing email volume.

### Key Features
- **Secure Messaging**: End-to-end secure communication between users
- **Thread-Based Conversations**: Organized message threads with reply functionality
- **File Attachments**: Support for document sharing within conversations
- **Read Receipts**: Track when messages have been read
- **Application Context**: Messages can be associated with specific applications
- **Real-time Notifications**: Instant alerts for new messages via WebSockets

### Authentication Requirements
All messaging endpoints require authentication using a valid JWT token. Include the token in the Authorization header of your requests:

```
Authorization: Bearer {your_access_token}
```

See the [Authentication documentation](authentication.md) for details on obtaining and using access tokens.

## Message Object
The message object represents a single message in the system.

### Properties
| Property | Type | Description |
| --- | --- | --- |
| `id` | integer | Unique identifier for the message |
| `sender_user_id` | integer | ID of the user who sent the message |
| `recipient_user_id` | integer | ID of the user who received the message |
| `application_id` | integer | Optional ID of the related application (null if not related to an application) |
| `subject` | string | Subject line of the message |
| `message_body` | string | Main content of the message |
| `is_read` | boolean | Whether the message has been read by the recipient |
| `read_at` | string | ISO 8601 timestamp when the message was read (null if unread) |
| `created_at` | string | ISO 8601 timestamp when the message was created |
| `updated_at` | string | ISO 8601 timestamp when the message was last updated |
| `has_attachments` | boolean | Whether the message has file attachments |
| `attachment_count` | integer | Number of attachments (included when attachments are loaded) |
| `sender` | object | Sender information (included when requested) |
| `recipient` | object | Recipient information (included when requested) |
| `application` | object | Application information (included when requested) |
| `attachments` | array | List of attachments (included when requested) |

### Attachment Object
| Property | Type | Description |
| --- | --- | --- |
| `id` | integer | Unique identifier for the attachment |
| `message_id` | integer | ID of the parent message |
| `file_name` | string | Original name of the uploaded file |
| `file_path` | string | Server path to the stored file (not exposed to clients) |
| `mime_type` | string | MIME type of the file |
| `file_size` | integer | Size of the file in bytes |
| `formatted_file_size` | string | Human-readable file size (e.g., "2.5 MB") |
| `icon_class` | string | CSS class for the file type icon |
| `url` | string | URL to access the attachment (temporary) |
| `created_at` | string | ISO 8601 timestamp when the attachment was created |

### Example Message Object
```json
{
  "id": 123,
  "sender_user_id": 456,
  "recipient_user_id": 789,
  "application_id": 101,
  "subject": "Question about your transcript",
  "message_body": "I noticed that your transcript is missing the grades from your final semester. Could you please upload an updated version?",
  "is_read": false,
  "read_at": null,
  "created_at": "2023-04-15T14:30:00Z",
  "updated_at": "2023-04-15T14:30:00Z",
  "has_attachments": true,
  "attachment_count": 1,
  "sender": {
    "id": 456,
    "name": "Jane Smith",
    "email": "jane.smith@institution.edu",
    "profile": {
      "first_name": "Jane",
      "last_name": "Smith",
      "role": "Admissions Officer"
    }
  },
  "recipient": {
    "id": 789,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "role": "Applicant"
    }
  },
  "application": {
    "id": 101,
    "application_type": "Undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "current_status": "Under Review"
  },
  "attachments": [
    {
      "id": 201,
      "message_id": 123,
      "file_name": "transcript_requirements.pdf",
      "mime_type": "application/pdf",
      "file_size": 2621440,
      "formatted_file_size": "2.5 MB",
      "icon_class": "fa-file-pdf",
      "url": "https://api.admissions.institution.edu/api/v1/messages/attachments/201/download",
      "created_at": "2023-04-15T14:30:00Z"
    }
  ]
}
```

## Endpoints
The following endpoints are available for managing messages:

### Get Messages
Retrieve a paginated list of messages for the authenticated user.

**Request:**

```
GET /api/v1/messages
```

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 15, max: 50) |
| `application_id` | integer | No | Filter messages by application ID |
| `unread_only` | boolean | No | Filter to show only unread messages |
| `search` | string | No | Search term to filter messages by content |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "sender_user_id": 456,
      "recipient_user_id": 789,
      "application_id": 101,
      "subject": "Question about your transcript",
      "message_body": "I noticed that your transcript is missing...",
      "is_read": false,
      "read_at": null,
      "created_at": "2023-04-15T14:30:00Z",
      "updated_at": "2023-04-15T14:30:00Z",
      "has_attachments": true,
      "attachment_count": 1
    },
    // Additional messages...
  ],
  "meta": {
    "pagination": {
      "total": 45,
      "per_page": 15,
      "current_page": 1,
      "last_page": 3,
      "from": 1,
      "to": 15
    }
  }
}
```

### Get Message
Retrieve a specific message by ID.

**Request:**

```
GET /api/v1/messages/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the message to retrieve |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "sender_user_id": 456,
    "recipient_user_id": 789,
    "application_id": 101,
    "subject": "Question about your transcript",
    "message_body": "I noticed that your transcript is missing the grades from your final semester. Could you please upload an updated version?",
    "is_read": true,
    "read_at": "2023-04-15T15:00:00Z",
    "created_at": "2023-04-15T14:30:00Z",
    "updated_at": "2023-04-15T15:00:00Z",
    "has_attachments": true,
    "attachment_count": 1,
    "sender": {
      "id": 456,
      "name": "Jane Smith",
      "email": "jane.smith@institution.edu",
      "profile": {
        "first_name": "Jane",
        "last_name": "Smith",
        "role": "Admissions Officer"
      }
    },
    "recipient": {
      "id": 789,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "role": "Applicant"
      }
    },
    "application": {
      "id": 101,
      "application_type": "Undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024",
      "current_status": "Under Review"
    },
    "attachments": [
      {
        "id": 201,
        "message_id": 123,
        "file_name": "transcript_requirements.pdf",
        "mime_type": "application/pdf",
        "file_size": 2621440,
        "formatted_file_size": "2.5 MB",
        "icon_class": "fa-file-pdf",
        "url": "https://api.admissions.institution.edu/api/v1/messages/attachments/201/download",
        "created_at": "2023-04-15T14:30:00Z"
      }
    ]
  }
}
```

**Error Responses:**

- `404 Not Found`: Message not found or user not authorized to view it

### Create Message
Create a new message.

**Request:**

```
POST /api/v1/messages
```

**Request Body:**

```json
{
  "recipient_id": 789,
  "subject": "Question about your transcript",
  "message_body": "I noticed that your transcript is missing the grades from your final semester. Could you please upload an updated version?",
  "application_id": 101,
  "attachments": [
    {
      "name": "transcript_requirements.pdf",
      "content": "base64_encoded_file_content",
      "type": "application/pdf"
    }
  ]
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `recipient_id` | integer | Yes | ID of the user to receive the message |
| `subject` | string | Yes | Subject line of the message |
| `message_body` | string | Yes | Main content of the message |
| `application_id` | integer | No | ID of the related application (if applicable) |
| `attachments` | array | No | Array of file attachments |
| `attachments[].name` | string | Yes (if attachments provided) | Original filename |
| `attachments[].content` | string | Yes (if attachments provided) | Base64-encoded file content |
| `attachments[].type` | string | Yes (if attachments provided) | MIME type of the file |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 124,
    "sender_user_id": 456,
    "recipient_user_id": 789,
    "application_id": 101,
    "subject": "Question about your transcript",
    "message_body": "I noticed that your transcript is missing the grades from your final semester. Could you please upload an updated version?",
    "is_read": false,
    "read_at": null,
    "created_at": "2023-04-16T10:15:00Z",
    "updated_at": "2023-04-16T10:15:00Z",
    "has_attachments": true,
    "attachment_count": 1,
    "sender": {
      "id": 456,
      "name": "Jane Smith",
      "email": "jane.smith@institution.edu",
      "profile": {
        "first_name": "Jane",
        "last_name": "Smith",
        "role": "Admissions Officer"
      }
    },
    "recipient": {
      "id": 789,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "role": "Applicant"
      }
    },
    "application": {
      "id": 101,
      "application_type": "Undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024",
      "current_status": "Under Review"
    },
    "attachments": [
      {
        "id": 202,
        "message_id": 124,
        "file_name": "transcript_requirements.pdf",
        "mime_type": "application/pdf",
        "file_size": 2621440,
        "formatted_file_size": "2.5 MB",
        "icon_class": "fa-file-pdf",
        "url": "https://api.admissions.institution.edu/api/v1/messages/attachments/202/download",
        "created_at": "2023-04-16T10:15:00Z"
      }
    ]
  },
  "message": "Message sent successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid request format
- `422 Unprocessable Entity`: Validation errors in the request data

### Reply to Message
Reply to an existing message.

**Request:**

```
POST /api/v1/messages/{id}/reply
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the message to reply to |

**Request Body:**

```json
{
  "message_body": "I'll upload the updated transcript right away. Thank you for letting me know.",
  "attachments": [
    {
      "name": "updated_transcript.pdf",
      "content": "base64_encoded_file_content",
      "type": "application/pdf"
    }
  ]
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `message_body` | string | Yes | Content of the reply message |
| `attachments` | array | No | Array of file attachments |
| `attachments[].name` | string | Yes (if attachments provided) | Original filename |
| `attachments[].content` | string | Yes (if attachments provided) | Base64-encoded file content |
| `attachments[].type` | string | Yes (if attachments provided) | MIME type of the file |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 125,
    "sender_user_id": 789,
    "recipient_user_id": 456,
    "application_id": 101,
    "subject": "Re: Question about your transcript",
    "message_body": "I'll upload the updated transcript right away. Thank you for letting me know.",
    "is_read": false,
    "read_at": null,
    "created_at": "2023-04-16T11:30:00Z",
    "updated_at": "2023-04-16T11:30:00Z",
    "has_attachments": true,
    "attachment_count": 1,
    "sender": {
      "id": 789,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "profile": {
        "first_name": "John",
        "last_name": "Doe",
        "role": "Applicant"
      }
    },
    "recipient": {
      "id": 456,
      "name": "Jane Smith",
      "email": "jane.smith@institution.edu",
      "profile": {
        "first_name": "Jane",
        "last_name": "Smith",
        "role": "Admissions Officer"
      }
    },
    "application": {
      "id": 101,
      "application_type": "Undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024",
      "current_status": "Under Review"
    },
    "attachments": [
      {
        "id": 203,
        "message_id": 125,
        "file_name": "updated_transcript.pdf",
        "mime_type": "application/pdf",
        "file_size": 3145728,
        "formatted_file_size": "3.0 MB",
        "icon_class": "fa-file-pdf",
        "url": "https://api.admissions.institution.edu/api/v1/messages/attachments/203/download",
        "created_at": "2023-04-16T11:30:00Z"
      }
    ]
  },
  "message": "Reply sent successfully"
}
```

**Error Responses:**

- `404 Not Found`: Original message not found or user not authorized
- `422 Unprocessable Entity`: Validation errors in the request data

### Mark Message as Read
Mark a message as read.

**Request:**

```
POST /api/v1/messages/{id}/read
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the message to mark as read |

**Response:**

```json
{
  "success": true,
  "message": "Message marked as read"
}
```

**Error Responses:**

- `404 Not Found`: Message not found or user not authorized

### Mark Message as Unread
Mark a message as unread.

**Request:**

```
POST /api/v1/messages/{id}/unread
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the message to mark as unread |

**Response:**

```json
{
  "success": true,
  "message": "Message marked as unread"
}
```

**Error Responses:**

- `404 Not Found`: Message not found or user not authorized

### Get Unread Count
Get the count of unread messages for the authenticated user.

**Request:**

```
GET /api/v1/messages/unread-count
```

**Response:**

```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

### Get Application Messages
Get messages related to a specific application.

**Request:**

```
GET /api/v1/messages/application/{applicationId}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `applicationId` | integer | Yes | ID of the application |

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 15, max: 50) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "sender_user_id": 456,
      "recipient_user_id": 789,
      "application_id": 101,
      "subject": "Question about your transcript",
      "message_body": "I noticed that your transcript is missing...",
      "is_read": true,
      "read_at": "2023-04-15T15:00:00Z",
      "updated_at": "2023-04-15T15:00:00Z",
      "has_attachments": true,
      "attachment_count": 1
    },
    {
      "id": 125,
      "sender_user_id": 789,
      "recipient_user_id": 456,
      "application_id": 101,
      "subject": "Re: Question about your transcript",
      "message_body": "I'll upload the updated transcript...",
      "is_read": false,
      "read_at": null,
      "created_at": "2023-04-16T11:30:00Z",
      "updated_at": "2023-04-16T11:30:00Z",
      "has_attachments": true,
      "attachment_count": 1
    }
    // Additional messages...
  ],
  "meta": {
    "pagination": {
      "total": 8,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 8
    }
  }
}
```

**Error Responses:**

- `404 Not Found`: Application not found or user not authorized

### Delete Message
Delete a message.

**Request:**

```
DELETE /api/v1/messages/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the message to delete |

**Response:**

```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Error Responses:**

- `404 Not Found`: Message not found or user not authorized

### Get Attachment
Get details of a message attachment.

**Request:**

```
GET /api/v1/messages/attachments/{id}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the attachment |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 201,
    "message_id": 123,
    "file_name": "transcript_requirements.pdf",
    "mime_type": "application/pdf",
    "file_size": 2621440,
    "formatted_file_size": "2.5 MB",
    "icon_class": "fa-file-pdf",
    "url": "https://api.admissions.institution.edu/api/v1/messages/attachments/201/download",
    "created_at": "2023-04-15T14:30:00Z"
  }
}
```

**Error Responses:**

- `404 Not Found`: Attachment not found or user not authorized

### Download Attachment
Generate a temporary download URL for an attachment.

**Request:**

```
GET /api/v1/messages/attachments/{id}/download
```

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the attachment |

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `expires` | integer | No | Expiration time in minutes (default: 60, max: 1440) |

**Response:**

```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.admissions.institution.edu/messages/attachments/201/transcript_requirements.pdf?token=abc123&expires=1681657800",
    "expires_at": "2023-04-16T16:30:00Z"
  }
}
```

**Error Responses:**

- `404 Not Found`: Attachment not found or user not authorized

### Search Messages
Search messages by content.

**Request:**

```
GET /api/v1/messages/search
```

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | string | Yes | Search term |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 15, max: 50) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "sender_user_id": 456,
      "recipient_user_id": 789,
      "application_id": 101,
      "subject": "Question about your transcript",
      "message_body": "I noticed that your transcript is missing...",
      "is_read": true,
      "read_at": "2023-04-15T15:00:00Z",
      "updated_at": "2023-04-15T15:00:00Z",
      "has_attachments": true,
      "attachment_count": 1
    }
    // Additional matching messages...
  ],
  "meta": {
    "pagination": {
      "total": 3,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 3
    }
  }
}
```

## Real-time Notifications
The messaging system supports real-time notifications for new messages using WebSockets.

### WebSocket Events
When a new message is created or a message status changes, the system broadcasts events that can be received by connected clients. The following events are available:

| Event | Description | Payload |
| --- | --- | --- |
| `message.created` | A new message has been created | Message ID, sender information, subject, preview |
| `message.read` | A message has been marked as read | Message ID, read timestamp |

### Connecting to WebSocket
To receive real-time notifications, connect to the WebSocket server using Laravel Echo:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: 'pusher',
  key: 'your-pusher-key',
  cluster: 'us2',
  encrypted: true,
  authEndpoint: 'https://api.admissions.institution.edu/api/v1/broadcasting/auth',
  auth: {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
});

// Listen for new messages
echo.private(`user.${userId}`)
  .listen('NewMessageEvent', (event) => {
    console.log('New message received:', event.message);
    // Update UI or show notification
  });

// Listen for read status changes
echo.private(`user.${userId}`)
  .listen('MessageReadEvent', (event) => {
    console.log('Message marked as read:', event.messageId);
    // Update UI
  });
```

## Webhooks
The messaging system can send webhook notifications for message events to external systems.

### Available Events
The following webhook events are available for the messaging system:

| Event | Description | Payload |
| --- | --- | --- |
| `message.created` | A new message has been created | Message details including sender, recipient, and content |
| `message.read` | A message has been marked as read | Message ID, recipient ID, read timestamp |

### Webhook Configuration
Webhooks can be configured in the administrative interface or via the Admin API. When configuring a webhook, you can specify:

- The endpoint URL to receive events
- The events you want to subscribe to
- A secret key for signature verification

See the [Webhooks section](overview.md#webhooks) in the API Overview for more details on webhook implementation.

## Best Practices
Follow these best practices when working with the Messaging API:

### Message Creation
- Keep message subjects concise and descriptive
- Include the application ID when messages are related to a specific application
- Limit attachment sizes to improve performance (max 10MB per attachment)
- Use appropriate MIME types for attachments

### Message Retrieval
- Use pagination for listing messages to improve performance
- Use the application-specific endpoint when retrieving messages for a particular application
- Use the search endpoint for finding specific content
- Request only the data you need (e.g., use preview for message listings)

### Real-time Integration
- Implement WebSocket listeners for real-time updates
- Handle connection failures gracefully with reconnection logic
- Use the unread count endpoint to display notification badges
- Update message read status immediately upon viewing

### Security Considerations
- Always validate user permissions before displaying messages
- Use HTTPS for all API requests
- Implement proper error handling for failed requests
- Verify webhook signatures to ensure authenticity of webhook events

## Error Handling
The Messaging API returns standard error responses as described in the [API Overview](overview.md#error-handling). Here are some common errors specific to the Messaging API:

### Common Error Codes
| HTTP Status | Error Code | Description |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | The request format is invalid |
| 401 | `UNAUTHORIZED` | Authentication is required or has failed |
| 403 | `FORBIDDEN` | The authenticated user doesn't have permission |
| 404 | `MESSAGE_NOT_FOUND` | The requested message doesn't exist or is not accessible |
| 404 | `ATTACHMENT_NOT_FOUND` | The requested attachment doesn't exist or is not accessible |
| 422 | `VALIDATION_ERROR` | The request data failed validation |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |

### Validation Errors
When a request fails validation, the response will include details about the validation errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "recipient_id": [
        "The recipient id field is required."
      ],
      "message_body": [
        "The message body field is required."
      ],
      "attachments.0.content": [
        "The attachment content must be a valid base64 string."
      ]
    }
  }
}
```

## Rate Limiting
The Messaging API implements rate limiting to prevent abuse. Rate limits vary by endpoint and user role.

### Rate Limit Headers
Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1681657800
```

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response.

### Rate Limit By Endpoint
| Endpoint | Rate Limit (requests per minute) |
| --- | --- |
| GET /api/v1/messages | 60 |
| POST /api/v1/messages | 30 |
| GET /api/v1/messages/{id} | 60 |
| POST /api/v1/messages/{id}/reply | 30 |
| Other endpoints | 60 |

## Changelog
This section tracks significant changes to the Messaging API.

### Version 1.0 (2023-04-01)
- Initial release of the Messaging API
- Support for creating, retrieving, and managing messages
- Support for file attachments
- Support for read status tracking
- Support for application-specific messages

### Version 1.1 (2023-06-15)
- Added search endpoint for finding messages by content
- Added support for real-time notifications via WebSockets
- Improved attachment handling with temporary download URLs
- Added support for message threading and replies