# Applications API

The Applications API provides endpoints for creating, updating, submitting, and tracking applications throughout the admissions process. These endpoints enable applicants to manage their applications and allow administrators to review and process applications.

## Authentication Requirements

All Applications API endpoints require authentication using a valid JWT token. Include the token in the Authorization header of your requests:

```
Authorization: Bearer {your_access_token}
```

See the [Authentication documentation](authentication.md) for details on obtaining and using access tokens.

## API Conventions

All API endpoints follow RESTful design principles. Requests and responses use JSON format with UTF-8 encoding. Successful responses include a `success: true` field, while error responses include an `error` object with code and message fields.

The base URL for all application endpoints is `/api/v1/applications/`.

For a machine-readable API specification, refer to the [OpenAPI specification](openapi.yaml).

## Application Resource

The Application resource represents a student's application for admission. It contains information about the applicant, the program they're applying to, and the current status of their application.

### Application Object

```json
{
  "id": 123,
  "application_type": "undergraduate",
  "academic_term": "Fall",
  "academic_year": "2023-2024",
  "is_submitted": true,
  "submitted_at": "2023-03-15T14:30:00Z",
  "status_id": 2,
  "status_label": "Under Review",
  "is_complete": true,
  "application_data": {
    "personal_information": {
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "2000-01-15",
      "gender": "male",
      "citizenship": "US"
    },
    "contact_information": {
      "email": "john.smith@example.com",
      "phone": "555-123-4567",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "postal_code": "12345",
        "country": "US"
      }
    },
    "academic_history": {
      "high_school": {
        "name": "Anytown High School",
        "city": "Anytown",
        "state": "CA",
        "graduation_date": "2022-05-15",
        "gpa": 3.85
      },
      "previous_colleges": []
    },
    "test_scores": {
      "sat": {
        "reading": 650,
        "math": 680,
        "total": 1330,
        "date": "2022-03-12"
      }
    },
    "program_preferences": {
      "major": "Computer Science",
      "minor": "Mathematics",
      "housing": true
    }
  },
  "created_at": "2023-02-10T09:15:30Z",
  "updated_at": "2023-03-15T14:30:00Z",
  "user": {
    "id": 456,
    "email": "john.smith@example.com",
    "profile": {
      "first_name": "John",
      "last_name": "Smith",
      "phone_number": "555-123-4567"
    }
  },
  "documents": [
    {
      "id": 789,
      "document_type": "transcript",
      "file_name": "high_school_transcript.pdf",
      "file_size": 1024567,
      "mime_type": "application/pdf",
      "is_verified": true,
      "verified_at": "2023-03-20T10:45:00Z",
      "created_at": "2023-03-15T14:25:00Z",
      "updated_at": "2023-03-20T10:45:00Z"
    },
    {
      "id": 790,
      "document_type": "personal_statement",
      "file_name": "personal_statement.pdf",
      "file_size": 512345,
      "mime_type": "application/pdf",
      "is_verified": true,
      "verified_at": "2023-03-20T11:15:00Z",
      "created_at": "2023-03-15T14:28:00Z",
      "updated_at": "2023-03-20T11:15:00Z"
    }
  ],
  "statuses": [
    {
      "id": 1,
      "status": "Submitted",
      "notes": "Application submitted by applicant",
      "created_at": "2023-03-15T14:30:00Z"
    },
    {
      "id": 2,
      "status": "Under Review",
      "notes": "Application assigned to admissions officer",
      "created_at": "2023-03-20T11:30:00Z"
    }
  ]
}
```

### Application Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Unique identifier for the application |
| `application_type` | string | Type of application (undergraduate, graduate, transfer) |
| `academic_term` | string | Academic term (Fall, Spring, Summer) |
| `academic_year` | string | Academic year (e.g., "2023-2024") |
| `is_submitted` | boolean | Whether the application has been submitted |
| `submitted_at` | string (ISO 8601) | Timestamp when the application was submitted |
| `status_id` | integer | ID of the current application status |
| `status_label` | string | Human-readable label for the current status |
| `is_complete` | boolean | Whether the application is complete with all required documents |
| `application_data` | object | JSON object containing application form data |
| `created_at` | string (ISO 8601) | Timestamp when the application was created |
| `updated_at` | string (ISO 8601) | Timestamp when the application was last updated |
| `user` | object | Information about the applicant (included when requested) |
| `documents` | array | List of documents associated with the application (included when requested) |
| `statuses` | array | History of application status changes (included when requested) |

## List Applications

Retrieves a paginated list of applications for the authenticated user.

### Request

```http
GET /api/v1/applications
```

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Number of items per page (default: 15, max: 50) |
| `type` | string | No | Filter by application type (undergraduate, graduate, transfer) |
| `term` | string | No | Filter by academic term (Fall, Spring, Summer) |
| `year` | string | No | Filter by academic year |
| `status` | string | No | Filter by application status |
| `submitted` | boolean | No | Filter by submission status (true/false) |

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "application_type": "undergraduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024",
      "is_submitted": true,
      "submitted_at": "2023-03-15T14:30:00Z",
      "status_id": 2,
      "status_label": "Under Review",
      "is_complete": true,
      "created_at": "2023-02-10T09:15:30Z",
      "updated_at": "2023-03-15T14:30:00Z"
    },
    {
      "id": 124,
      "application_type": "graduate",
      "academic_term": "Fall",
      "academic_year": "2023-2024",
      "is_submitted": false,
      "submitted_at": null,
      "status_id": null,
      "status_label": "Draft",
      "is_complete": false,
      "created_at": "2023-02-15T10:20:45Z",
      "updated_at": "2023-02-15T10:20:45Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 2,
      "per_page": 15,
      "current_page": 1,
      "last_page": 1,
      "from": 1,
      "to": 2
    }
  }
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access applications |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications?type=undergraduate&term=Fall&year=2023-2024" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Get Application

Retrieves a specific application by ID.

### Request

```http
GET /api/v1/applications/{id}
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application to retrieve |

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `include_user` | boolean | No | Include user information (default: false) |
| `include_documents` | boolean | No | Include documents (default: false) |
| `include_statuses` | boolean | No | Include status history (default: false) |

### Response

```json
{
  "success": true,
  "data": {
    "id": 123,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "is_submitted": true,
    "submitted_at": "2023-03-15T14:30:00Z",
    "status_id": 2,
    "status_label": "Under Review",
    "is_complete": true,
    "application_data": {
      "personal_information": {
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "2000-01-15",
        "gender": "male",
        "citizenship": "US"
      },
      "contact_information": {
        "email": "john.smith@example.com",
        "phone": "555-123-4567",
        "address": {
          "street": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "postal_code": "12345",
          "country": "US"
        }
      },
      "academic_history": {
        "high_school": {
          "name": "Anytown High School",
          "city": "Anytown",
          "state": "CA",
          "graduation_date": "2022-05-15",
          "gpa": 3.85
        },
        "previous_colleges": []
      },
      "test_scores": {
        "sat": {
          "reading": 650,
          "math": 680,
          "total": 1330,
          "date": "2022-03-12"
        }
      },
      "program_preferences": {
        "major": "Computer Science",
        "minor": "Mathematics",
        "housing": true
      }
    },
    "created_at": "2023-02-10T09:15:30Z",
    "updated_at": "2023-03-15T14:30:00Z"
  }
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access this application |
| 404 | `NOT_FOUND` | Application not found |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications/123?include_documents=true&include_statuses=true" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Create Application

Creates a new application for the authenticated user.

### Request

```http
POST /api/v1/applications
```

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `application_type` | string | Yes | Type of application (undergraduate, graduate, transfer) |
| `academic_term` | string | Yes | Academic term (Fall, Spring, Summer) |
| `academic_year` | string | Yes | Academic year (e.g., "2023-2024") |
| `application_data` | object | No | Initial application data (optional) |

```json
{
  "application_type": "undergraduate",
  "academic_term": "Fall",
  "academic_year": "2023-2024",
  "application_data": {
    "personal_information": {
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "2000-01-15",
      "gender": "male",
      "citizenship": "US"
    }
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 125,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "is_submitted": false,
    "submitted_at": null,
    "status_id": null,
    "status_label": "Draft",
    "is_complete": false,
    "application_data": {
      "personal_information": {
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "2000-01-15",
        "gender": "male",
        "citizenship": "US"
      }
    },
    "created_at": "2023-04-10T15:30:00Z",
    "updated_at": "2023-04-10T15:30:00Z"
  },
  "message": "Application created successfully"
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Invalid request format |
| 401 | `UNAUTHORIZED` | Authentication required |
| 422 | `VALIDATION_ERROR` | Validation errors in the request body |

### Example

```bash
curl -X POST "https://api.admissions.institution.edu/api/v1/applications" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "application_data": {
      "personal_information": {
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "2000-01-15",
        "gender": "male",
        "citizenship": "US"
      }
    }
  }'
```

## Update Application

Updates an existing application.

### Request

```http
PUT /api/v1/applications/{id}
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application to update |

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `application_data` | object | Yes | Updated application data |

```json
{
  "application_data": {
    "personal_information": {
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "2000-01-15",
      "gender": "male",
      "citizenship": "US"
    },
    "contact_information": {
      "email": "john.smith@example.com",
      "phone": "555-123-4567",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "postal_code": "12345",
        "country": "US"
      }
    }
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": 125,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "is_submitted": false,
    "submitted_at": null,
    "status_id": null,
    "status_label": "Draft",
    "is_complete": false,
    "application_data": {
      "personal_information": {
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "2000-01-15",
        "gender": "male",
        "citizenship": "US"
      },
      "contact_information": {
        "email": "john.smith@example.com",
        "phone": "555-123-4567",
        "address": {
          "street": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "postal_code": "12345",
          "country": "US"
        }
      }
    },
    "created_at": "2023-04-10T15:30:00Z",
    "updated_at": "2023-04-10T15:45:00Z"
  },
  "message": "Application updated successfully"
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Invalid request format |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to update this application |
| 404 | `NOT_FOUND` | Application not found |
| 422 | `VALIDATION_ERROR` | Validation errors in the request body |
| 422 | `ALREADY_SUBMITTED` | Cannot update a submitted application |

### Example

```bash
curl -X PUT "https://api.admissions.institution.edu/api/v1/applications/125" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "application_data": {
      "personal_information": {
        "first_name": "John",
        "last_name": "Smith",
        "date_of_birth": "2000-01-15",
        "gender": "male",
        "citizenship": "US"
      },
      "contact_information": {
        "email": "john.smith@example.com",
        "phone": "555-123-4567",
        "address": {
          "street": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "postal_code": "12345",
          "country": "US"
        }
      }
    }
  }'
```

## Submit Application

Submits an application for review.

### Request

```http
POST /api/v1/applications/{id}/submit
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application to submit |

### Response

```json
{
  "success": true,
  "data": {
    "id": 125,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "is_submitted": true,
    "submitted_at": "2023-04-15T10:30:00Z",
    "status_id": 1,
    "status_label": "Submitted",
    "is_complete": true,
    "application_data": { /* Application data */ },
    "created_at": "2023-04-10T15:30:00Z",
    "updated_at": "2023-04-15T10:30:00Z"
  },
  "message": "Application submitted successfully"
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Invalid request format |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to submit this application |
| 404 | `NOT_FOUND` | Application not found |
| 422 | `ALREADY_SUBMITTED` | Application has already been submitted |
| 422 | `INCOMPLETE_APPLICATION` | Application is incomplete and cannot be submitted |
| 422 | `MISSING_DOCUMENTS` | Required documents are missing |
| 422 | `PAYMENT_REQUIRED` | Application fee payment is required |

### Example

```bash
curl -X POST "https://api.admissions.institution.edu/api/v1/applications/125/submit" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Delete Application

Deletes a draft application.

### Request

```http
DELETE /api/v1/applications/{id}
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application to delete |

### Response

```json
{
  "success": true,
  "message": "Application deleted successfully"
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to delete this application |
| 404 | `NOT_FOUND` | Application not found |
| 422 | `ALREADY_SUBMITTED` | Cannot delete a submitted application |

### Example

```bash
curl -X DELETE "https://api.admissions.institution.edu/api/v1/applications/125" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Get Required Documents

Retrieves a list of required documents for an application.

### Request

```http
GET /api/v1/applications/{id}/required-documents
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application |

### Response

```json
{
  "success": true,
  "data": [
    {
      "document_type": "transcript",
      "name": "Academic Transcript",
      "description": "Official high school or college transcript",
      "required": true,
      "file_types": ["pdf", "jpg", "png"],
      "max_size": 10485760
    },
    {
      "document_type": "personal_statement",
      "name": "Personal Statement",
      "description": "Essay describing your academic goals and interests",
      "required": true,
      "file_types": ["pdf", "doc", "docx"],
      "max_size": 5242880
    },
    {
      "document_type": "recommendation_letter",
      "name": "Recommendation Letter",
      "description": "Letter of recommendation from a teacher or counselor",
      "required": true,
      "file_types": ["pdf", "doc", "docx"],
      "max_size": 5242880
    }
  ]
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access this application |
| 404 | `NOT_FOUND` | Application not found |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications/123/required-documents" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Get Missing Documents

Retrieves a list of required documents that have not been uploaded yet for an application.

### Request

```http
GET /api/v1/applications/{id}/missing-documents
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application |

### Response

```json
{
  "success": true,
  "data": [
    {
      "document_type": "recommendation_letter",
      "name": "Recommendation Letter",
      "description": "Letter of recommendation from a teacher or counselor",
      "required": true,
      "file_types": ["pdf", "doc", "docx"],
      "max_size": 5242880
    }
  ]
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access this application |
| 404 | `NOT_FOUND` | Application not found |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications/123/missing-documents" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Check Application Completeness

Checks if an application is complete with all required information and documents.

### Request

```http
GET /api/v1/applications/{id}/check-complete
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application |

### Response

```json
{
  "success": true,
  "data": {
    "is_complete": false,
    "missing_sections": [
      "academic_history",
      "test_scores"
    ],
    "missing_documents": [
      "recommendation_letter"
    ]
  }
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access this application |
| 404 | `NOT_FOUND` | Application not found |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications/123/check-complete" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Get Application Timeline

Retrieves the status timeline for an application.

### Request

```http
GET /api/v1/applications/{id}/timeline
```

### Path Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | integer | Yes | ID of the application |

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "status": "Submitted",
      "notes": "Application submitted by applicant",
      "created_at": "2023-03-15T14:30:00Z",
      "created_by": {
        "id": 456,
        "name": "John Smith",
        "role": "applicant"
      }
    },
    {
      "id": 2,
      "status": "Under Review",
      "notes": "Application assigned to admissions officer",
      "created_at": "2023-03-20T11:30:00Z",
      "created_by": {
        "id": 789,
        "name": "Jane Doe",
        "role": "staff"
      }
    }
  ]
}
```

### Error Responses

| Status Code | Error Code | Description |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions to access this application |
| 404 | `NOT_FOUND` | Application not found |

### Example

```bash
curl -X GET "https://api.admissions.institution.edu/api/v1/applications/123/timeline" \
  -H "Authorization: Bearer {your_access_token}" \
  -H "Accept: application/json"
```

## Webhooks

The Applications API supports webhooks for real-time event notifications. You can subscribe to these events to receive push notifications when application status changes occur.

### Application Events

| Event | Description |
| --- | --- |
| `application.created` | A new application has been created |
| `application.updated` | An application has been updated |
| `application.submitted` | An application has been submitted |
| `application.status_changed` | An application's status has changed |
| `application.document_uploaded` | A document has been uploaded to an application |
| `application.document_verified` | A document for an application has been verified |

### Webhook Payload Example

```json
{
  "event": "application.submitted",
  "timestamp": "2023-04-15T10:30:00Z",
  "data": {
    "application_id": 125,
    "user_id": 456,
    "application_type": "undergraduate",
    "academic_term": "Fall",
    "academic_year": "2023-2024",
    "status": "Submitted"
  }
}
```

## Best Practices

This section provides recommendations for effectively using the Applications API.

### Saving Application Progress

- Use the Update Application endpoint to save progress frequently
- Implement auto-save functionality in your client application
- Validate form data on the client side before saving
- Handle validation errors gracefully and provide clear feedback to users

### Document Management

- Check required documents before allowing application submission
- Use the Documents API to upload and manage documents
- Implement file type and size validation on the client side
- Provide clear feedback on document verification status

### Application Submission

- Verify application completeness before submission
- Handle submission errors gracefully and provide clear feedback
- Implement a confirmation step before final submission
- Provide clear next steps after submission

### Error Handling

- Implement proper error handling for all API requests
- Check the `success` field in responses to determine if the request succeeded
- Display user-friendly error messages based on error codes
- Log detailed error information for troubleshooting

## Related Resources

- [Documents API](documents.md): API for managing application documents
- [Workflows API](workflows.md): API for interacting with the admissions workflow system
- [Payments API](payments.md): API for processing application fees
- [Messages API](messaging.md): API for communication between applicants and admissions staff