# Document API

## Introduction

The Document API provides endpoints for uploading, retrieving, managing, and verifying documents as part of the application process. Documents are a critical component of the admissions process, and this API enables applicants to submit required documentation and administrators to verify these documents.

### Document Types

The system supports various document types, including but not limited to:

- Academic transcripts
- Identification documents
- Recommendation letters
- Personal statements
- Financial documents
- Test score reports

The complete list of supported document types can be retrieved using the `/documents/types` endpoint.

### Document Lifecycle

Documents follow a specific lifecycle in the system:

1. **Upload**: The document is uploaded by the applicant
2. **Processing**: The document is processed and analyzed (including AI analysis when applicable)
3. **Verification**: The document is verified either automatically or by an administrator
4. **Status Update**: The document status is updated (verified or rejected)

This API provides endpoints to support each stage of this lifecycle.

## Authentication Requirements

All document API endpoints require authentication using a valid JWT token. Include the token in the Authorization header of your requests:

```
Authorization: Bearer {your_access_token}
```

See the [Authentication documentation](authentication.md) for details on obtaining and using access tokens.

### Permission Requirements

Different document operations require different permissions:

- **Basic document operations** (upload, view own documents): Available to all authenticated users
- **Document verification**: Requires administrator or staff role
- **Viewing all documents**: Requires administrator or staff role

Attempting to access endpoints without the required permissions will result in a `403 Forbidden` response.

## API Conventions

The Document API follows standard RESTful conventions and adheres to the following principles:

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Resource data or collection
  },
  "meta": {
    "pagination": {
      "total": 100,
      "per_page": 15,
      "current_page": 1,
      "last_page": 7,
      "from": 1,
      "to": 15
    }
  },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional detailed error information
      "field_name": ["Validation error message"]
    }
  }
}
```

### HTTP Status Codes

The API uses standard HTTP status codes to indicate the result of API requests:

- `200 OK`: The request was successful
- `201 Created`: A resource was successfully created
- `400 Bad Request`: The request was malformed or invalid
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user lacks necessary permissions
- `404 Not Found`: The requested resource was not found
- `413 File Too Large`: The uploaded file exceeds the size limit
- `415 Unsupported Media Type`: The file format is not supported
- `422 Unprocessable Entity`: The request was well-formed but could not be processed
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: An unexpected server error occurred

### Pagination

List endpoints support pagination through the following query parameters:

- `page`: The page number (default: 1)
- `per_page`: The number of items per page (default: 15, max: 50)

Pagination information is included in the `meta.pagination` object in the response.

## Document Endpoints

The following endpoints are available for document management:

### List Documents

```
GET /api/v1/documents
```

Retrieve a list of documents for the authenticated user or by application ID.

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| application_id | integer | No | Filter documents by application ID |
| document_type | string | No | Filter documents by type |
| page | integer | No | Page number (default: 1) |
| per_page | integer | No | Items per page (default: 15, max: 50) |
| include | string | No | Include related resources (user, application, verification) |

**Example Request:**

```
GET /api/v1/documents?application_id=123&document_type=transcript
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "document_type": "transcript",
      "file_name": "academic_transcript.pdf",
      "mime_type": "application/pdf",
      "file_size": 1048576,
      "file_size_formatted": "1 MB",
      "file_extension": "pdf",
      "is_image": false,
      "is_pdf": true,
      "is_verified": true,
      "verified_at": "2023-04-15T10:30:00Z",
      "created_at": "2023-04-10T14:20:00Z",
      "updated_at": "2023-04-15T10:30:00Z",
      "download_url": "https://example.com/download/temp-url",
      "application": {
        "id": 123,
        "application_type": "undergraduate",
        "academic_term": "Fall",
        "academic_year": "2023-2024"
      },
      "verification": {
        "verification_method": "ai",
        "verification_status": "verified",
        "confidence_score": 0.95,
        "confidence_percentage": 95,
        "verified_by": {
          "id": 5,
          "name": "Admin User"
        },
        "verified_at": "2023-04-15T10:30:00Z",
        "notes": "Document verified by AI with high confidence"
      }
    }
  ],
  "meta": {
    "pagination": {
      "total": 5,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 5
    }
  }
}
```

### Upload Document

```
POST /api/v1/documents
```

Upload a new document to the system.

**Request Body:**

This endpoint requires a `multipart/form-data` request with the following fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| file | file | Yes | The document file to upload (PDF, JPG, JPEG, PNG) |
| document_type | string | Yes | The type of document being uploaded |
| application_id | integer | Yes | The ID of the application this document belongs to |

**File Requirements:**
- Maximum file size: 10MB
- Supported formats: PDF, JPG, JPEG, PNG

**Example Request:**

```
POST /api/v1/documents
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="transcript.pdf"
Content-Type: application/pdf

(binary file data)
--boundary
Content-Disposition: form-data; name="document_type"

transcript
--boundary
Content-Disposition: form-data; name="application_id"

123
--boundary--
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "transcript",
    "file_name": "transcript.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "file_size_formatted": "1 MB",
    "file_extension": "pdf",
    "is_image": false,
    "is_pdf": true,
    "is_verified": false,
    "verified_at": null,
    "created_at": "2023-04-10T14:20:00Z",
    "updated_at": "2023-04-10T14:20:00Z",
    "download_url": "https://example.com/download/temp-url",
    "application": {
      "id": 123,
      "application_type": "undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024"
    }
  },
  "message": "Document uploaded successfully"
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "file": ["The file must be a PDF, JPG, or PNG."],
      "document_type": ["The document type is required."],
      "application_id": ["The application ID is required."]
    }
  }
}
```

### Get Document

```
GET /api/v1/documents/{id}
```

Retrieve a specific document by ID.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to retrieve |

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| include | string | No | Include related resources (user, application, verification, verification_history) |

**Example Request:**

```
GET /api/v1/documents/1?include=verification,application
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "transcript",
    "file_name": "academic_transcript.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "file_size_formatted": "1 MB",
    "file_extension": "pdf",
    "is_image": false,
    "is_pdf": true,
    "is_verified": true,
    "verified_at": "2023-04-15T10:30:00Z",
    "created_at": "2023-04-10T14:20:00Z",
    "updated_at": "2023-04-15T10:30:00Z",
    "download_url": "https://example.com/download/temp-url",
    "application": {
      "id": 123,
      "application_type": "undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024"
    },
    "verification": {
      "verification_method": "ai",
      "verification_status": "verified",
      "confidence_score": 0.95,
      "confidence_percentage": 95,
      "verification_data": {
        "extracted_text": "University of Example\nTranscript for: John Smith\nStudent ID: 12345\nGPA: 3.85",
        "detected_fields": {
          "student_name": "John Smith",
          "institution": "University of Example",
          "gpa": "3.85"
        }
      },
      "verified_by": {
        "id": 5,
        "name": "Admin User"
      },
      "verified_at": "2023-04-15T10:30:00Z",
      "notes": "Document verified by AI with high confidence"
    }
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Document not found"
  }
}
```

### Update Document

```
PUT /api/v1/documents/{id}
```

Replace an existing document with a new file.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to update |

**Request Body:**

This endpoint requires a `multipart/form-data` request with the following fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| file | file | Yes | The new document file to upload (PDF, JPG, JPEG, PNG) |

**Example Request:**

```
PUT /api/v1/documents/1
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="updated_transcript.pdf"
Content-Type: application/pdf

(binary file data)
--boundary--
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "transcript",
    "file_name": "updated_transcript.pdf",
    "mime_type": "application/pdf",
    "file_size": 1048576,
    "file_size_formatted": "1 MB",
    "file_extension": "pdf",
    "is_image": false,
    "is_pdf": true,
    "is_verified": false,
    "verified_at": null,
    "created_at": "2023-04-10T14:20:00Z",
    "updated_at": "2023-04-12T09:15:00Z",
    "download_url": "https://example.com/download/temp-url"
  },
  "message": "Document updated successfully"
}
```

**Note:** Updating a document will reset its verification status, requiring re-verification.

### Delete Document

```
DELETE /api/v1/documents/{id}
```

Delete a document from the system.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to delete |

**Example Request:**

```
DELETE /api/v1/documents/1
```

**Example Response:**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Document not found"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "OPERATION_FORBIDDEN",
    "message": "Cannot delete a verified document"
  }
}
```

### Get Document Download URL

```
GET /api/v1/documents/{id}/download
```

Generate a temporary download URL for a document.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to download |

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| expiration | integer | No | URL expiration time in minutes (default: 60, max: 1440) |

**Example Request:**

```
GET /api/v1/documents/1/download?expiration=30
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.example.com/documents/secure-token/transcript.pdf?expires=1618159200&signature=abc123",
    "expires_at": "2023-04-10T15:20:00Z"
  }
}
```

**Note:** The download URL is temporary and will expire after the specified time period.

### Get Document Types

```
GET /api/v1/documents/types
```

Retrieve a list of supported document types.

**Example Request:**

```
GET /api/v1/documents/types
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "document_types": [
      {
        "id": "transcript",
        "name": "Academic Transcript",
        "description": "Official academic records from previous institutions",
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
        "max_file_size": 10485760
      },
      {
        "id": "identification",
        "name": "Identification Document",
        "description": "Government-issued ID such as passport or driver's license",
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
        "max_file_size": 5242880
      },
      {
        "id": "recommendation",
        "name": "Recommendation Letter",
        "description": "Letters of recommendation from teachers or employers",
        "allowed_extensions": ["pdf"],
        "max_file_size": 5242880
      },
      {
        "id": "personal_statement",
        "name": "Personal Statement",
        "description": "Essay describing your background and goals",
        "allowed_extensions": ["pdf"],
        "max_file_size": 5242880
      },
      {
        "id": "test_scores",
        "name": "Test Score Report",
        "description": "Official score reports for standardized tests",
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
        "max_file_size": 5242880
      },
      {
        "id": "financial",
        "name": "Financial Document",
        "description": "Financial statements or support documentation",
        "allowed_extensions": ["pdf"],
        "max_file_size": 5242880
      },
      {
        "id": "other",
        "name": "Other Document",
        "description": "Any other supporting documentation",
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
        "max_file_size": 10485760
      }
    ]
  }
}
```

### Get Document Status

```
GET /api/v1/documents/status/{applicationId}
```

Retrieve the status of required documents for an application.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| applicationId | integer | Yes | The ID of the application to check document status for |

**Example Request:**

```
GET /api/v1/documents/status/123
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "application_id": 123,
    "required_documents": [
      {
        "document_type": "transcript",
        "name": "Academic Transcript",
        "required": true,
        "uploaded": true,
        "document_id": 1,
        "is_verified": true,
        "verification_status": "verified",
        "uploaded_at": "2023-04-10T14:20:00Z",
        "verified_at": "2023-04-15T10:30:00Z"
      },
      {
        "document_type": "identification",
        "name": "Identification Document",
        "required": true,
        "uploaded": true,
        "document_id": 2,
        "is_verified": false,
        "verification_status": "pending",
        "uploaded_at": "2023-04-11T09:45:00Z",
        "verified_at": null
      },
      {
        "document_type": "recommendation",
        "name": "Recommendation Letter",
        "required": true,
        "uploaded": false,
        "document_id": null,
        "is_verified": false,
        "verification_status": null,
        "uploaded_at": null,
        "verified_at": null
      }
    ],
    "completion_status": {
      "total_required": 3,
      "uploaded": 2,
      "verified": 1,
      "percentage_complete": 67,
      "percentage_verified": 33,
      "is_complete": false
    }
  }
}
```

## Document Verification Endpoints

The following endpoints are available for document verification. These endpoints require administrator or staff role permissions.

### Verify Document

```
POST /api/v1/admin/documents/{id}/verify
```

Mark a document as verified.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to verify |

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| notes | string | No | Optional notes about the verification |

**Example Request:**

```
POST /api/v1/admin/documents/1/verify
Content-Type: application/json

{
  "notes": "Document verified manually. All information is correct."
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "transcript",
    "file_name": "academic_transcript.pdf",
    "is_verified": true,
    "verified_at": "2023-04-15T10:30:00Z",
    "verification": {
      "verification_method": "manual",
      "verification_status": "verified",
      "verified_by": {
        "id": 5,
        "name": "Admin User"
      },
      "verified_at": "2023-04-15T10:30:00Z",
      "notes": "Document verified manually. All information is correct."
    }
  },
  "message": "Document verified successfully"
}
```

### Reject Document

```
POST /api/v1/admin/documents/{id}/reject
```

Mark a document as rejected.

**Path Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| id | integer | Yes | The ID of the document to reject |

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| reason | string | Yes | The reason for rejecting the document |

**Example Request:**

```
POST /api/v1/admin/documents/1/reject
Content-Type: application/json

{
  "reason": "Document is illegible. Please upload a clearer copy."
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "transcript",
    "file_name": "academic_transcript.pdf",
    "is_verified": false,
    "verified_at": null,
    "verification": {
      "verification_method": "manual",
      "verification_status": "rejected",
      "verified_by": {
        "id": 5,
        "name": "Admin User"
      },
      "verified_at": "2023-04-15T10:30:00Z",
      "notes": "Document is illegible. Please upload a clearer copy."
    }
  },
  "message": "Document rejected successfully"
}
```

## Document Verification Process

Documents uploaded to the system undergo a verification process to ensure their authenticity and accuracy. This section explains the verification workflow and how it is represented in the API.

### Verification Methods

The system supports three verification methods:

1. **AI Verification (`ai`)**: Automated verification using AI document analysis
2. **Manual Verification (`manual`)**: Verification performed by an administrator or staff member
3. **External Verification (`external`)**: Verification performed by an external service or system

The verification method is recorded in the `verification_method` field of the verification record.

### Verification Statuses

Documents can have one of the following verification statuses:

1. **Pending (`pending`)**: The document has been uploaded but not yet verified
2. **Verified (`verified`)**: The document has been verified and accepted
3. **Rejected (`rejected`)**: The document has been rejected and needs to be replaced

The verification status is recorded in the `verification_status` field of the verification record.

### AI Verification

When a document is uploaded, it may be automatically analyzed by the AI document analysis system. The AI system extracts relevant information from the document and assigns a confidence score to the verification.

If the confidence score is high (typically above 0.8 or 80%), the document may be automatically verified. Otherwise, it will be flagged for manual review.

The AI verification results are included in the `verification_data` field of the verification record, which may contain:

- Extracted text from the document
- Detected fields and their values
- Analysis of document authenticity
- Confidence scores for individual fields

This data can be used to understand why a document was verified or rejected by the AI system.

### Verification History

The system maintains a complete history of verification attempts for each document. This history can be retrieved by including the `verification_history` parameter when fetching a document:

```
GET /api/v1/documents/1?include=verification_history
```

The verification history is returned as an array of verification records, ordered from most recent to oldest.

## Error Handling

The Document API uses standard HTTP status codes and a consistent error response format.

### Common Error Codes

| HTTP Status | Error Code | Description |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | The request data failed validation |
| 401 | UNAUTHORIZED | Authentication is required or failed |
| 403 | FORBIDDEN | The authenticated user lacks permission |
| 404 | RESOURCE_NOT_FOUND | The requested document was not found |
| 413 | FILE_TOO_LARGE | The uploaded file exceeds the size limit |
| 415 | UNSUPPORTED_MEDIA_TYPE | The file format is not supported |
| 422 | UNPROCESSABLE_ENTITY | The request was well-formed but cannot be processed |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | SERVER_ERROR | An unexpected server error occurred |

### Error Response Format

Error responses follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional detailed error information
      "field_name": ["Validation error message"]
    }
  }
}
```

For validation errors, the `details` object will contain field-specific error messages.

## Webhooks

The system can send webhook notifications for document-related events. To configure webhooks, use the webhooks configuration in the administrative interface.

### Document Events

The following document-related events can trigger webhooks:

| Event | Description | Payload |
| --- | --- | --- |
| `document.uploaded` | A new document has been uploaded | Document details |
| `document.verified` | A document has been verified | Document and verification details |
| `document.rejected` | A document has been rejected | Document and verification details |
| `document.deleted` | A document has been deleted | Document ID and metadata |

### Webhook Format

Webhook payloads follow a consistent format:

```json
{
  "event": "document.verified",
  "timestamp": "2023-04-15T10:30:00Z",
  "data": {
    "document": {
      "id": 1,
      "document_type": "transcript",
      "file_name": "academic_transcript.pdf"
    },
    "verification": {
      "verification_method": "ai",
      "verification_status": "verified",
      "confidence_score": 0.95,
      "verified_at": "2023-04-15T10:30:00Z"
    },
    "application_id": 123
  }
}
```

The `data` object contains information relevant to the specific event.

## Best Practices

Follow these best practices when working with the Document API:

### File Uploads

- Validate file size and type on the client side before uploading
- Implement resumable uploads for large files
- Show upload progress to users
- Handle upload errors gracefully with clear error messages
- Implement retry logic for failed uploads

### Document Management

- Regularly check document status to keep users informed
- Provide clear instructions for document requirements
- Implement document preview when possible
- Cache document metadata to reduce API calls
- Use the document status endpoint to show overall completion status

### Security Considerations

- Always use HTTPS for document uploads and downloads
- Validate file content type server-side (don't rely solely on extension)
- Implement virus scanning for uploaded documents
- Use temporary download URLs with short expiration times
- Implement proper access controls to prevent unauthorized access to documents

## Rate Limits

The Document API endpoints are subject to rate limiting to prevent abuse. The specific limits vary by endpoint and user role.

### Default Limits

| Endpoint | User Role | Rate Limit |
| --- | --- | --- |
| Document Upload | Applicant | 10 requests per minute |
| Document Upload | Staff/Admin | 30 requests per minute |
| Document Retrieval | Applicant | 60 requests per minute |
| Document Retrieval | Staff/Admin | 120 requests per minute |
| Document Verification | Staff/Admin | 60 requests per minute |

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response with information about when the limit will reset.

## API Reference

For a complete reference of all Document API endpoints, parameters, and response formats, see the [OpenAPI specification](openapi.yaml).