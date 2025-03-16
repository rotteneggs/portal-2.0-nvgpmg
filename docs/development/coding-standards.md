# Coding Standards

## Introduction

This document outlines the coding standards and guidelines for the Student Admissions Enrollment Platform. Following these standards ensures code quality, consistency, and maintainability across the project. All developers contributing to the platform are expected to adhere to these standards.

The platform consists of a Laravel backend and a React frontend, each with its own set of standards while sharing common principles. These standards are enforced through automated tools in the CI/CD pipeline and code review processes.

### Purpose

The purpose of these coding standards is to:

- Ensure consistent code style across the codebase
- Improve code readability and maintainability
- Reduce the likelihood of bugs and security vulnerabilities
- Facilitate collaboration among team members
- Support the onboarding of new developers
- Enable automated code quality checks

### Scope

These standards apply to all code written for the Student Admissions Enrollment Platform, including:

- Backend PHP/Laravel code
- Frontend TypeScript/React code
- Database migrations and queries
- Configuration files
- Build scripts and tooling
- Test code

Third-party libraries and generated code are exempt from these standards but should be selected and configured to align with our overall architecture and quality goals.

### Enforcement

These standards are enforced through:

- Automated linting and static analysis in the CI/CD pipeline
- Pre-commit hooks for local validation
- Code review processes
- Pair programming and knowledge sharing

Pull requests that do not meet these standards will not be merged until issues are addressed.

## General Principles

These principles apply to all code in the project, regardless of language or framework.

### Code Readability

- Write code for humans first, computers second
- Use meaningful and descriptive names for variables, functions, classes, and files
- Keep functions and methods small and focused on a single responsibility
- Limit nesting levels to improve readability (maximum 3-4 levels)
- Use comments to explain "why" not "what" (the code should be self-explanatory)
- Use consistent formatting and indentation
- Avoid abbreviations unless they are widely understood

### Documentation

- Document all public APIs, classes, and functions
- Include parameter types, return types, and descriptions
- Document exceptions and error conditions
- Keep documentation up-to-date with code changes
- Use inline comments for complex algorithms or business logic
- Document architectural decisions and patterns
- Include examples for complex or non-obvious usage

### Error Handling

- Never silently catch exceptions without proper handling
- Use specific exception types rather than generic ones
- Include contextual information in exception messages
- Log exceptions with appropriate severity levels
- Handle errors at the appropriate level of abstraction
- Validate input data at system boundaries
- Provide clear error messages for end users

### Security Practices

- Never trust user input - validate and sanitize all input data
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization checks
- Protect against common web vulnerabilities (XSS, CSRF, etc.)
- Follow the principle of least privilege
- Keep dependencies up-to-date to address security vulnerabilities
- Encrypt sensitive data at rest and in transit
- Do not commit secrets or credentials to version control

### Performance Considerations

- Write efficient algorithms and data structures
- Optimize database queries and minimize N+1 query problems
- Use appropriate caching strategies
- Lazy load resources when possible
- Minimize HTTP requests and payload sizes
- Consider the impact of code changes on performance
- Profile and benchmark performance-critical code
- Balance performance with readability and maintainability

## PHP/Laravel Standards

These standards apply to all PHP code in the Laravel backend application.

### PHP Version and Compatibility

- Use PHP 8.2 or higher
- Utilize PHP 8.x features where appropriate (named arguments, attributes, etc.)
- Ensure compatibility with the target deployment environment
- Follow Laravel 10.x conventions and best practices

### Code Style

- Follow PSR-12 coding style standard
- Use 4 spaces for indentation (not tabs)
- Line length should not exceed 120 characters
- Use camelCase for variables and methods
- Use PascalCase for classes and interfaces
- Use UPPERCASE for constants
- Use snake_case for database columns
- Add a single blank line at the end of each file
- Use single quotes for strings unless interpolation is needed
- Always use strict comparison operators (=== and !==)
- Always use braces for control structures, even for single-line statements

Example:
```php
<?php

namespace App\Services;

use App\Models\User;
use App\Exceptions\AuthenticationException;

class AuthService
{
    private const MAX_LOGIN_ATTEMPTS = 5;
    
    public function authenticateUser(string $email, string $password): User
    {
        $user = User::where('email', $email)->first();
        
        if ($user === null) {
            throw new AuthenticationException('User not found');
        }
        
        if (!Hash::check($password, $user->password)) {
            // Increment failed login attempts
            $this->incrementFailedAttempts($user);
            
            throw new AuthenticationException('Invalid credentials');
        }
        
        return $user;
    }
    
    private function incrementFailedAttempts(User $user): void
    {
        // Implementation details
    }
}
```

### Type Declarations

- Use strict type declarations at the top of each file: `declare(strict_types=1);`
- Always use type hints for method parameters and return types
- Use union types when necessary (e.g., `string|null`)
- Use nullable types when appropriate (e.g., `?string`)
- Use docblocks to provide additional type information when PHP's type system is insufficient

Example:
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use App\Exceptions\DocumentProcessingException;

class DocumentService
{
    /**
     * Process a document upload for a user.
     *
     * @param User $user The user uploading the document
     * @param array{file: UploadedFile, type: string, metadata?: array<string, mixed>} $data Document data
     * @return Document The processed document
     * @throws DocumentProcessingException If processing fails
     */
    public function processUpload(User $user, array $data): Document
    {
        // Implementation
    }
    
    /**
     * Find a document by ID, optionally scoped to a user.
     */
    public function findDocument(int $id, ?User $user = null): ?Document
    {
        // Implementation
    }
}
```

### Laravel-Specific Standards

- Follow Laravel naming conventions for controllers, models, migrations, etc.
- Use Laravel's built-in features rather than reinventing functionality
- Utilize Laravel's service container for dependency injection
- Use Eloquent ORM for database interactions
- Define relationships in model classes
- Use Laravel's validation system for input validation
- Use resource classes for API responses
- Use form requests for complex validation scenarios
- Use policies for authorization logic
- Use events and listeners for decoupled communication
- Use queued jobs for background processing

Example of a controller following Laravel conventions:
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApplicationStoreRequest;
use App\Http\Resources\ApplicationResource;
use App\Services\ApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function __construct(private ApplicationService $applicationService)
    {
        $this->middleware('auth:sanctum');
    }
    
    public function index(Request $request): JsonResponse
    {
        $applications = $this->applicationService->getUserApplications(
            $request->user()->id,
            $request->only(['type', 'term', 'year', 'status'])
        );
        
        return response()->json([
            'success' => true,
            'data' => ApplicationResource::collection($applications),
        ]);
    }
    
    public function store(ApplicationStoreRequest $request): JsonResponse
    {
        $application = $this->applicationService->createApplication(
            $request->user()->id,
            $request->validated()
        );
        
        return response()->json([
            'success' => true,
            'data' => new ApplicationResource($application),
        ], 201);
    }
}
```

### Service Layer

- Implement business logic in service classes
- Keep controllers thin, focused on HTTP concerns
- Use dependency injection for service dependencies
- Make services focused on a specific domain or functionality
- Use interfaces for service contracts when appropriate
- Document service methods with PHPDoc
- Handle exceptions at the appropriate level

Example of a service class:
```php
<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Document;
use App\Events\DocumentUploadedEvent;
use App\Exceptions\DocumentProcessingException;
use Illuminate\Support\Facades\Storage;

class DocumentService
{
    public function __construct(
        private StorageService $storageService,
        private AuditService $auditService
    ) {}
    
    /**
     * Upload and process a document for an application.
     */
    public function uploadDocument(int $applicationId, array $data): Document
    {
        $application = Application::findOrFail($applicationId);
        
        // Authorize the operation
        $this->authorizeUpload($application);
        
        // Process the file
        $path = $this->storageService->storeDocument(
            $data['file'],
            "applications/{$applicationId}/documents"
        );
        
        // Create document record
        $document = new Document([
            'application_id' => $applicationId,
            'user_id' => $application->user_id,
            'document_type' => $data['type'],
            'file_name' => $data['file']->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $data['file']->getMimeType(),
            'file_size' => $data['file']->getSize(),
        ]);
        
        $document->save();
        
        // Log the activity
        $this->auditService->logCreate(
            'document',
            $document->id,
            $document->toArray(),
            $application->user_id
        );
        
        // Dispatch event for further processing
        DocumentUploadedEvent::dispatch($document);
        
        return $document;
    }
    
    /**
     * Authorize document upload for an application.
     */
    private function authorizeUpload(Application $application): void
    {
        // Authorization logic
    }
}
```

### Database and Eloquent

- Use migrations for all database schema changes
- Use Eloquent models for database interactions
- Define relationships in model classes
- Use eager loading to prevent N+1 query problems
- Use database transactions for operations that modify multiple records
- Define table names, primary keys, and timestamps explicitly when they differ from conventions
- Use model factories for test data
- Use seeders for reference data
- Use query scopes for common query patterns
- Use model events judiciously

Example of an Eloquent model:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'user_id',
        'application_type',
        'academic_term',
        'academic_year',
        'application_data',
        'is_submitted',
        'submitted_at',
    ];
    
    protected $casts = [
        'application_data' => 'array',
        'is_submitted' => 'boolean',
        'submitted_at' => 'datetime',
    ];
    
    /**
     * Get the user that owns the application.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the documents for the application.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
    
    /**
     * Get the statuses for the application.
     */
    public function statuses(): HasMany
    {
        return $this->hasMany(ApplicationStatus::class);
    }
    
    /**
     * Get the current status for the application.
     */
    public function currentStatus(): BelongsTo
    {
        return $this->belongsTo(ApplicationStatus::class, 'current_status_id');
    }
    
    /**
     * Scope a query to only include applications of a specific type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('application_type', $type);
    }
    
    /**
     * Scope a query to only include submitted applications.
     */
    public function scopeSubmitted($query)
    {
        return $query->where('is_submitted', true);
    }
}
```

### Testing

- Write tests for all features and bug fixes
- Use PHPUnit for testing
- Organize tests into Unit and Feature directories
- Use descriptive test method names that explain the expected behavior
- Follow the Arrange-Act-Assert pattern
- Use database transactions to isolate tests
- Use factories to create test data
- Mock external dependencies
- Test happy paths and edge cases
- Aim for high code coverage, especially for business logic

Example of a test class:
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_user_can_create_application()
    {
        // Arrange
        $user = User::factory()->create();
        $this->actingAs($user);
        
        $data = [
            'application_type' => 'undergraduate',
            'academic_term' => 'fall',
            'academic_year' => '2023-2024',
            'application_data' => [
                'personal_information' => [
                    'first_name' => 'John',
                    'last_name' => 'Doe',
                ],
            ],
        ];
        
        // Act
        $response = $this->postJson('/api/v1/applications', $data);
        
        // Assert
        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'application_type',
                    'academic_term',
                    'academic_year',
                ],
            ]);
        
        $this->assertDatabaseHas('applications', [
            'user_id' => $user->id,
            'application_type' => 'undergraduate',
            'academic_term' => 'fall',
            'academic_year' => '2023-2024',
        ]);
    }
    
    public function test_user_cannot_submit_application_with_missing_required_fields()
    {
        // Arrange
        $user = User::factory()->create();
        $this->actingAs($user);
        
        $data = [
            'application_type' => 'undergraduate',
            // Missing required fields
        ];
        
        // Act
        $response = $this->postJson('/api/v1/applications', $data);
        
        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['academic_term', 'academic_year', 'application_data']);
    }
}
```

## TypeScript/React Standards

These standards apply to all TypeScript and React code in the frontend application.

### TypeScript Version and Configuration

- Use TypeScript 4.9 or higher
- Enable strict mode in tsconfig.json
- Use ESNext for target and module settings
- Enable all recommended type checking options
- Use path aliases for imports

Example tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "components/*": ["components/*"],
      "hooks/*": ["hooks/*"],
      "utils/*": ["utils/*"],
      "api/*": ["api/*"],
      "types/*": ["types/*"],
      "contexts/*": ["contexts/*"],
      "redux/*": ["redux/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### Code Style

- Use 2 spaces for indentation (not tabs)
- Line length should not exceed 100 characters
- Use camelCase for variables, functions, and methods
- Use PascalCase for components, interfaces, and types
- Use UPPERCASE for constants
- Use single quotes for strings
- Use template literals for string interpolation
- Add semicolons at the end of statements
- Use trailing commas in multi-line arrays and objects
- Use parentheses around arrow function parameters, even when there is only one parameter
- Use explicit return types for functions when they're not obvious

Example:
```typescript
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, TextField } from 'components/Common';
import { loginUser } from 'redux/slices/authSlice';
import { RootState } from 'redux/store';
import { LoginCredentials } from 'types/auth';

const LOGIN_ATTEMPTS_LIMIT = 5;

interface LoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, redirectUrl = '/dashboard' }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await dispatch(loginUser(credentials));
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Email Address"
        name="email"
        value={credentials.email}
        onChange={handleChange}
        error={errors.email}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        value={credentials.password}
        onChange={handleChange}
        error={errors.password}
        fullWidth
        margin="normal"
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        loading={loading}
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
```

### Type Definitions

- Define types for all data structures
- Use interfaces for objects that represent entities or props
- Use type aliases for unions, intersections, and simple types
- Use generics for reusable type patterns
- Avoid using `any` type; use `unknown` when the type is truly unknown
- Use type assertions sparingly and only when necessary
- Define types in dedicated files when they are used across multiple components

Example:
```typescript
// src/types/application.ts
export interface Application {
  id: number;
  application_type: 'undergraduate' | 'graduate' | 'transfer';
  academic_term: string;
  academic_year: string;
  status: ApplicationStatus;
  is_submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  documents?: Document[];
}

export interface ApplicationStatus {
  id: number;
  name: string;
  updated_at: string;
}

export interface Document {
  id: number;
  document_type: string;
  file_name: string;
  file_path: string;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export type ApplicationFormData = {
  application_type: Application['application_type'];
  academic_term: string;
  academic_year: string;
  application_data: {
    personal_information: {
      first_name: string;
      last_name: string;
      date_of_birth?: string;
      gender?: string;
      // Other personal information fields
    };
    contact_details?: {
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    // Other application data sections
  };
};

export type ApplicationFilter = {
  type?: Application['application_type'];
  term?: string;
  year?: string;
  status?: string;
};
```

### React Component Structure

- Use functional components with hooks
- Use TypeScript interfaces for component props
- Destructure props in function parameters
- Use named exports for components
- Co-locate component files with their styles and tests
- Keep components focused on a single responsibility
- Extract complex logic into custom hooks
- Use React.memo for performance optimization when appropriate
- Use React.lazy for code splitting

Example component structure:
```
src/components/Applications/
├── ApplicationForm/
│   ├── ApplicationForm.tsx
│   ├── ApplicationForm.test.tsx
│   ├── ApplicationForm.styles.ts
│   └── index.ts
├── ApplicationList/
│   ├── ApplicationList.tsx
│   ├── ApplicationList.test.tsx
│   ├── ApplicationList.styles.ts
│   └── index.ts
└── index.ts
```

Example component:
```typescript
// src/components/Applications/ApplicationForm/ApplicationForm.tsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Stepper, Step } from 'components/Common';
import PersonalInformation from './steps/PersonalInformation';
import ContactDetails from './steps/ContactDetails';
import AcademicHistory from './steps/AcademicHistory';
import ReviewSubmit from './steps/ReviewSubmit';
import { createApplication } from 'redux/slices/applicationsSlice';
import { ApplicationFormData } from 'types/application';
import { useFormData } from 'hooks/useFormData';
import * as Styled from './ApplicationForm.styles';

interface ApplicationFormProps {
  initialData?: Partial<ApplicationFormData>;
  onSubmit?: (data: ApplicationFormData) => void;
}

const steps = [
  'Personal Information',
  'Contact Details',
  'Academic History',
  'Review & Submit',
];

const ApplicationForm: React.FC<ApplicationFormProps> = ({ initialData, onSubmit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const { formData, updateFormData, formErrors, validateStep } = useFormData<ApplicationFormData>(
    initialData || {
      application_type: 'undergraduate',
      academic_term: '',
      academic_year: '',
      application_data: {
        personal_information: {
          first_name: '',
          last_name: '',
        },
      },
    }
  );
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const handleNext = (): void => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = (): void => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSubmit = async (): Promise<void> => {
    if (validateStep(activeStep)) {
      try {
        await dispatch(createApplication(formData));
        if (onSubmit) {
          onSubmit(formData);
        }
        navigate('/applications');
      } catch (error) {
        console.error('Application submission failed:', error);
      }
    }
  };
  
  const renderStepContent = (): React.ReactNode => {
    switch (activeStep) {
      case 0:
        return (
          <PersonalInformation
            data={formData.application_data.personal_information}
            errors={formErrors.application_data?.personal_information || {}}
            onChange={(data) => updateFormData('application_data.personal_information', data)}
          />
        );
      case 1:
        return (
          <ContactDetails
            data={formData.application_data.contact_details || {}}
            errors={formErrors.application_data?.contact_details || {}}
            onChange={(data) => updateFormData('application_data.contact_details', data)}
          />
        );
      case 2:
        return (
          <AcademicHistory
            data={formData.application_data.academic_history || {}}
            errors={formErrors.application_data?.academic_history || {}}
            onChange={(data) => updateFormData('application_data.academic_history', data)}
          />
        );
      case 3:
        return <ReviewSubmit data={formData} />;
      default:
        return null;
    }
  };
  
  return (
    <Styled.FormContainer>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>{label}</Step>
        ))}
      </Stepper>
      
      <Styled.StepContent>
        {renderStepContent()}
      </Styled.StepContent>
      
      <Styled.ButtonContainer>
        {activeStep > 0 && (
          <Button onClick={handleBack} variant="outlined">
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained" color="primary">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Submit Application
          </Button>
        )}
      </Styled.ButtonContainer>
    </Styled.FormContainer>
  );
};

export default ApplicationForm;
```

### State Management

- Use React hooks (useState, useReducer) for component-local state
- Use Redux for global application state
- Use Redux Toolkit for Redux implementation
- Use React Query for server state management
- Use context API for theme, authentication, and other cross-cutting concerns
- Keep Redux state normalized
- Use selectors for accessing Redux state
- Use thunks or middleware for async operations

Example Redux slice:
```typescript
// src/redux/slices/applicationsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Application, ApplicationFormData, ApplicationFilter } from 'types/application';
import { fetchApplications, createApplication as apiCreateApplication } from 'api/applications';

interface ApplicationsState {
  items: Application[];
  loading: boolean;
  error: string | null;
  filters: ApplicationFilter;
}

const initialState: ApplicationsState = {
  items: [],
  loading: false,
  error: null,
  filters: {},
};

export const getApplications = createAsyncThunk(
  'applications/getApplications',
  async (filters: ApplicationFilter, { rejectWithValue }) => {
    try {
      const response = await fetchApplications(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch applications');
    }
  }
);

export const createApplication = createAsyncThunk(
  'applications/createApplication',
  async (data: ApplicationFormData, { rejectWithValue }) => {
    try {
      const response = await apiCreateApplication(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create application');
    }
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ApplicationFilter>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(getApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters } = applicationsSlice.actions;
export default applicationsSlice.reducer;
```

### API Integration

- Use Axios for API requests
- Centralize API configuration and request handling
- Use interceptors for authentication and error handling
- Organize API functions by resource
- Use React Query for data fetching, caching, and synchronization
- Handle loading and error states consistently
- Implement retry logic for transient failures

Example API client:
```typescript
// src/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getAuthToken, refreshToken, logout } from 'services/AuthService';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Try to refresh the token
        await refreshToken();
        // Retry the original request with the new token
        const token = getAuthToken();
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout the user
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;
```

Example API function:
```typescript
// src/api/applications.ts
import apiClient from './apiClient';
import { Application, ApplicationFormData, ApplicationFilter } from 'types/application';

export const fetchApplications = async (filters: ApplicationFilter = {}) => {
  return apiClient.get('/applications', { params: filters });
};

export const fetchApplicationById = async (id: number) => {
  return apiClient.get(`/applications/${id}`);
};

export const createApplication = async (data: ApplicationFormData) => {
  return apiClient.post('/applications', data);
};

export const updateApplication = async (id: number, data: Partial<ApplicationFormData>) => {
  return apiClient.put(`/applications/${id}`, data);
};

export const submitApplication = async (id: number) => {
  return apiClient.post(`/applications/${id}/submit`);
};

export const deleteApplication = async (id: number) => {
  return apiClient.delete(`/applications/${id}`);
};
```

Example React Query usage:
```typescript
// src/hooks/useApplications.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { fetchApplications, createApplication, updateApplication, deleteApplication } from 'api/applications';
import { ApplicationFormData, ApplicationFilter } from 'types/application';

export const useApplications = (filters: ApplicationFilter = {}) => {
  return useQuery(
    ['applications', filters],
    () => fetchApplications(filters).then((res) => res.data.data),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useApplication = (id: number) => {
  return useQuery(
    ['application', id],
    () => fetchApplicationById(id).then((res) => res.data.data),
    {
      enabled: !!id,
    }
  );
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: ApplicationFormData) => createApplication(data).then((res) => res.data.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
      },
    }
  );
};

export const useUpdateApplication = (id: number) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data: Partial<ApplicationFormData>) => updateApplication(id, data).then((res) => res.data.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['application', id]);
        queryClient.invalidateQueries('applications');
      },
    }
  );
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id: number) => deleteApplication(id).then((res) => res.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('applications');
      },
    }
  );
};
```

### Testing

- Write tests for all components and utilities
- Use Jest for testing framework
- Use React Testing Library for component testing
- Use Mock Service Worker for API mocking
- Use Cypress for end-to-end testing
- Test component rendering, interactions, and edge cases
- Mock external dependencies and services
- Use test data factories for consistent test data
- Aim for high code coverage, especially for business logic

Example component test:
```typescript
// src/components/Auth/LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loginUser } from 'redux/slices/authSlice';
import LoginForm from './LoginForm';

// Mock the loginUser thunk
jest.mock('redux/slices/authSlice', () => ({
  ...jest.requireActual('redux/slices/authSlice'),
  loginUser: jest.fn(),
}));

const mockLoginUser = loginUser as jest.Mock;

const renderWithRedux = (ui: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
  });
  
  return {
    ...render(<Provider store={store}>{ui}</Provider>),
    store,
  };
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the login form correctly', () => {
    renderWithRedux(<LoginForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('validates form inputs', async () => {
    renderWithRedux(<LoginForm />);
    
    // Submit without filling the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for validation errors
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    
    // Fill with invalid email
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'invalid-email' },
    });
    
    // Submit again
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for email validation error
    expect(await screen.findByText(/email is invalid/i)).toBeInTheDocument();
  });
  
  it('submits the form with valid data', async () => {
    mockLoginUser.mockResolvedValue({});
    
    const onSuccess = jest.fn();
    renderWithRedux(<LoginForm onSuccess={onSuccess} />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check if loginUser was called with correct data
    expect(mockLoginUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    
    // Check if onSuccess callback was called
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
  
  it('handles login failure', async () => {
    mockLoginUser.mockRejectedValue(new Error('Invalid credentials'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    renderWithRedux(<LoginForm />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong-password' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check if error was logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});
```

## CSS and Styling Standards

These standards apply to all CSS and styling code in the application.

### Styling Approach

- Use CSS-in-JS with Emotion for component styling
- Use Material-UI's styling system for consistency
- Use theme variables for colors, typography, spacing, etc.
- Avoid inline styles except for dynamic values
- Use responsive design principles
- Follow mobile-first approach

Example styled component:
```typescript
// src/components/Applications/ApplicationForm/ApplicationForm.styles.ts
import styled from '@emotion/styled';
import { Paper } from '@mui/material';

export const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

export const StepContent = styled.div(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  minHeight: '300px',
}));

export const ButtonContainer = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(3),
}));
```

### Theme Configuration

- Define a consistent theme with colors, typography, spacing, etc.
- Use Material-UI's theme provider
- Support light and dark modes
- Use semantic color names
- Define breakpoints for responsive design

Example theme configuration:
```typescript
// src/styles/themes/default.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#03A9F4',
      light: '#4fc3f7',
      dark: '#0288d1',
      contrastText: '#ffffff',
    },
    error: {
      main: '#F44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#FFC107',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: '#4CAF50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

export default theme;
```

### Responsive Design

- Use responsive units (rem, %, vh/vw) instead of fixed units (px)
- Use flexbox and grid for layouts
- Use media queries for breakpoint-specific styles
- Test on multiple screen sizes and devices
- Use Material-UI's responsive utilities (Grid, Hidden, etc.)
- Implement mobile-first approach

Example responsive component:
```typescript
// src/components/Dashboard/StatusCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Grid, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Application } from 'types/application';
import * as Styled from './StatusCard.styles';

interface StatusCardProps {
  application: Application;
  onClick?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ application, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Styled.CardWrapper onClick={onClick}>
      <Card>
        <CardContent>
          <Grid container spacing={isMobile ? 1 : 2}>
            <Grid item xs={12} sm={8}>
              <Typography variant="h6" component="h2">
                {application.application_type.charAt(0).toUpperCase() + application.application_type.slice(1)} Application
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {application.academic_term} {application.academic_year}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Styled.StatusBadge status={application.status.name}>
                {application.status.name}
              </Styled.StatusBadge>
              <Typography variant="caption" display="block">
                Updated: {new Date(application.status.updated_at).toLocaleDateString()}
              </Typography>
            </Grid>
            {!isMobile && (
              <Grid item xs={12}>
                <Styled.ProgressBar
                  variant="determinate"
                  value={getProgressValue(application.status.name)}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Styled.CardWrapper>
  );
};

const getProgressValue = (status: string): number => {
  // Implementation details
  return 75; // Example value
};

export default StatusCard;
```

## Database Standards

These standards apply to database design, migrations, and queries.

### Database Design

- Use meaningful table and column names
- Use snake_case for table and column names
- Use singular form for table names (e.g., `user` not `users`)
- Define primary keys for all tables
- Define foreign keys for relationships
- Use appropriate data types for columns
- Include created_at and updated_at timestamps
- Use soft deletes when appropriate
- Normalize data to reduce redundancy
- Use indexes for frequently queried columns

Example migration:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('application', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('user');
            $table->string('application_type');
            $table->string('academic_term');
            $table->string('academic_year');
            $table->foreignId('current_status_id')->nullable()->constrained('application_status');
            $table->json('application_data');
            $table->boolean('is_submitted')->default(false);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'application_type']);
            $table->index(['academic_term', 'academic_year']);
            $table->index('is_submitted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('application');
    }
};
```

### Query Optimization

- Use eager loading to prevent N+1 query problems
- Use query builders or Eloquent for database queries
- Use appropriate indexes for frequently queried columns
- Use database transactions for operations that modify multiple records
- Avoid raw queries when possible
- Use query caching for expensive queries
- Monitor and optimize slow queries

Example optimized query:
```php
// Bad: N+1 query problem
$applications = Application::all();
foreach ($applications as $application) {
    $user = $application->user; // Separate query for each application
    $documents = $application->documents; // Separate query for each application
}

// Good: Eager loading relationships
$applications = Application::with(['user', 'documents', 'currentStatus'])->get();
foreach ($applications as $application) {
    $user = $application->user; // No additional query
    $documents = $application->documents; // No additional query
}

// Good: Using query builder with joins
$applications = DB::table('application')
    ->select('application.*', 'user.name as user_name', 'application_status.status')
    ->join('user', 'application.user_id', '=', 'user.id')
    ->leftJoin('application_status', 'application.current_status_id', '=', 'application_status.id')
    ->where('application.is_submitted', true)
    ->orderBy('application.submitted_at', 'desc')
    ->get();
```

### Migrations

- Use migrations for all database schema changes
- Make migrations reversible with up and down methods
- Use descriptive migration names
- Keep migrations small and focused
- Test migrations before applying to production
- Use foreign key constraints for relationships
- Include appropriate indexes
- Use timestamps for all tables

Example migration naming:
```
2023_01_01_000001_create_user_table.php
2023_01_01_000002_create_role_table.php
2023_01_01_000003_create_permission_table.php
2023_01_01_000004_create_role_permission_table.php
2023_01_01_000005_create_user_role_table.php
2023_01_01_000006_create_application_table.php
2023_01_01_000007_create_application_status_table.php
2023_01_01_000008_create_document_table.php
2023_01_01_000009_add_verification_fields_to_document_table.php
```

## API Standards

These standards apply to API design and implementation.

### RESTful API Design

- Use RESTful principles for API design
- Use resource-oriented URLs
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Use plural nouns for resource collections
- Use nested resources for relationships
- Use query parameters for filtering, sorting, and pagination
- Use HTTP status codes appropriately
- Version APIs in the URL path

Example API endpoints:
```
# User resources
GET    /api/v1/users                # List users
POST   /api/v1/users                # Create user
GET    /api/v1/users/{id}           # Get user
PUT    /api/v1/users/{id}           # Update user
DELETE /api/v1/users/{id}           # Delete user

# Application resources
GET    /api/v1/applications                # List applications
POST   /api/v1/applications                # Create application
GET    /api/v1/applications/{id}           # Get application
PUT    /api/v1/applications/{id}           # Update application
DELETE /api/v1/applications/{id}           # Delete application
POST   /api/v1/applications/{id}/submit    # Submit application

# Document resources
GET    /api/v1/applications/{id}/documents           # List documents for application
POST   /api/v1/applications/{id}/documents           # Upload document for application
GET    /api/v1/applications/{id}/documents/{doc_id}  # Get document
DELETE /api/v1/applications/{id}/documents/{doc_id}  # Delete document
```

### Request and Response Format

- Use JSON for request and response bodies
- Use consistent response structure
- Include success/error indicators in responses
- Use descriptive error messages
- Include validation errors in response
- Use camelCase for JSON property names
- Use ISO 8601 format for dates and times

Example response format:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "application_type": "undergraduate",
    "academic_term": "fall",
    "academic_year": "2023-2024",
    "status": {
      "id": 456,
      "name": "Under Review",
      "updated_at": "2023-04-15T14:30:00Z"
    },
    "is_submitted": true,
    "submitted_at": "2023-03-15T10:30:00Z",
    "created_at": "2023-03-10T08:15:00Z",
    "updated_at": "2023-04-15T14:30:00Z"
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
  }
}
```

Example error response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "application_type": ["The application type field is required."],
      "academic_term": ["The academic term field is required."],
      "academic_year": ["The academic year field is required."]
    }
  }
}
```

### API Documentation

- Document all API endpoints
- Include request and response examples
- Document query parameters and request body schema
- Document authentication requirements
- Document error responses
- Use OpenAPI/Swagger for API documentation
- Keep documentation up-to-date with code changes

Example OpenAPI documentation:
```yaml
openapi: 3.0.0
info:
  title: Student Admissions Enrollment Platform API
  version: 1.0.0
  description: API for managing student admissions and enrollment
paths:
  /applications:
    get:
      summary: List applications
      description: Returns a list of applications for the authenticated user
      parameters:
        - name: type
          in: query
          description: Filter by application type
          schema:
            type: string
            enum: [undergraduate, graduate, transfer]
        - name: term
          in: query
          description: Filter by academic term
          schema:
            type: string
        - name: year
          in: query
          description: Filter by academic year
          schema:
            type: string
        - name: status
          in: query
          description: Filter by status
          schema:
            type: string
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Application'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    post:
      summary: Create application
      description: Creates a new application for the authenticated user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApplicationInput'
      responses:
        '201':
          description: Application created
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Application'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationError'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
components:
  schemas:
    Application:
      type: object
      properties:
        id:
          type: integer
          example: 123
        application_type:
          type: string
          enum: [undergraduate, graduate, transfer]
          example: undergraduate
        academic_term:
          type: string
          example: fall
        academic_year:
          type: string
          example: 2023-2024
        status:
          type: object
          properties:
            id:
              type: integer
              example: 456
            name:
              type: string
              example: Under Review
            updated_at:
              type: string
              format: date-time
              example: 2023-04-15T14:30:00Z
        is_submitted:
          type: boolean
          example: true
        submitted_at:
          type: string
          format: date-time
          example: 2023-03-15T10:30:00Z
        created_at:
          type: string
          format: date-time
          example: 2023-03-10T08:15:00Z
        updated_at:
          type: string
          format: date-time
          example: 2023-04-15T14:30:00Z
    # Other schema definitions...
```

### API Security

- Use HTTPS for all API endpoints
- Use token-based authentication
- Implement proper authorization checks
- Use rate limiting to prevent abuse
- Validate and sanitize all input data
- Use CSRF protection for browser-based clients
- Implement proper error handling
- Log security-related events

Example security implementation:
```php
// API routes with authentication and rate limiting
Route::middleware(['auth:sanctum', 'throttle:api'])
    ->prefix('api/v1')
    ->group(function () {
        // User routes
        Route::get('/user', [UserController::class, 'show']);
        Route::put('/user', [UserController::class, 'update']);
        
        // Application routes
        Route::apiResource('applications', ApplicationController::class);
        Route::post('/applications/{id}/submit', [ApplicationController::class, 'submit']);
        
        // Document routes
        Route::get('/applications/{id}/documents', [DocumentController::class, 'index']);
        Route::post('/applications/{id}/documents', [DocumentController::class, 'store']);
        Route::delete('/applications/{id}/documents/{document}', [DocumentController::class, 'destroy']);
    });

// Public routes with rate limiting
Route::middleware(['throttle:api'])
    ->prefix('api/v1')
    ->group(function () {
        Route::post('/auth/login', [AuthController::class, 'login']);
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    });
```

## Git and Version Control

These standards apply to Git usage and version control practices.

### Branching Strategy

- Use Git Flow branching model
- Main branches: main (production), develop (integration)
- Supporting branches: feature/*, hotfix/*, release/*
- Feature branches should be created from develop
- Hotfix branches should be created from main
- Release branches should be created from develop
- All branches should be merged via pull requests

Example branch naming:
```
main                      # Production branch
develop                   # Development branch
feature/user-registration # Feature branch
hotfix/login-error        # Hotfix branch
release/v1.0.0            # Release branch
```

### Commit Messages

- Use conventional commits format
- Start with a type: feat, fix, docs, style, refactor, test, chore
- Include a scope in parentheses (optional)
- Use imperative mood in the subject line
- Limit the subject line to 72 characters
- Separate subject from body with a blank line
- Use the body to explain what and why, not how
- Reference issues and pull requests in the footer

Example commit messages:
```
feat(auth): implement multi-factor authentication

Add support for TOTP-based multi-factor authentication using Google Authenticator.
This includes:
- QR code generation for setup
- TOTP validation during login
- Backup codes for recovery

Resolves #123
```

```
fix(api): correct validation error in application submission

Fix incorrect validation rule for academic_year field that was causing
valid submissions to be rejected.

Resolves #456
```

```
docs: update API documentation with new endpoints

Add documentation for the recently added document verification endpoints.
```

### Pull Requests

- Create pull requests for all changes
- Use descriptive titles for pull requests
- Include a detailed description of the changes
- Reference related issues
- Assign reviewers
- Keep pull requests focused on a single concern
- Ensure all tests pass before requesting review
- Address all review comments
- Squash commits before merging when appropriate

Example pull request template:
```markdown
## Description
[Provide a brief description of the changes in this pull request]

## Related Issues
[Reference any related issues, e.g., "Resolves #123"]

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
[Describe the tests that you ran to verify your changes]

## Checklist
- [ ] My code follows the code style of this project
- [ ] I have added tests to cover my changes
- [ ] All new and existing tests passed
- [ ] I have updated the documentation accordingly
- [ ] I have added appropriate comments to my code, particularly in hard-to-understand areas
```

### Code Reviews

- Review all code changes before merging
- Focus on code quality, correctness, and adherence to standards
- Check for security vulnerabilities
- Verify test coverage
- Provide constructive feedback
- Approve only when all issues are addressed
- Use automated tools to assist with code reviews
- Document review decisions

Code review checklist:
1. Does the code follow the project's coding standards?
2. Is the code well-structured and maintainable?
3. Are there appropriate tests for the changes?
4. Are there any security vulnerabilities?
5. Is the code efficient and performant?
6. Is the documentation updated?
7. Are there any edge cases not handled?
8. Could any parts be simplified or improved?

## Documentation Standards

These standards apply to code documentation and project documentation.

### Code Documentation

- Document all classes, methods, and functions
- Use PHPDoc for PHP code
- Use JSDoc for JavaScript/TypeScript code
- Include parameter types, return types, and descriptions
- Document exceptions and error conditions
- Keep documentation up-to-date with code changes
- Use inline comments for complex algorithms or business logic

Example PHPDoc:
```php
/**
 * Process a document upload for an application.
 *
 * This method handles the upload, storage, and processing of a document
 * for a specific application. It performs validation, stores the file,
 * creates a database record, and triggers further processing.
 *
 * @param int $applicationId The ID of the application
 * @param array $data The document data including the file and metadata
 * @return Document The created document record
 * @throws DocumentProcessingException If the document cannot be processed
 * @throws AuthorizationException If the user is not authorized to upload documents
 */
public function uploadDocument(int $applicationId, array $data): Document
{
    // Implementation
}
```

Example JSDoc:
```typescript
/**
 * Fetches applications based on the provided filters.
 *
 * @param {ApplicationFilter} filters - The filters to apply to the query
 * @returns {Promise<AxiosResponse<ApiResponse<Application[]>>>} A promise that resolves to the API response
 * @throws {Error} If the API request fails
 */
export const fetchApplications = async (filters: ApplicationFilter = {}): Promise<AxiosResponse<ApiResponse<Application[]>>> => {
    return apiClient.get('/applications', { params: filters });
};
```

### Project Documentation

- Maintain comprehensive project documentation
- Use Markdown for documentation files
- Organize documentation in a logical structure
- Include setup and installation instructions
- Document architecture and design decisions
- Provide user guides and tutorials
- Keep documentation up-to-date with code changes

Example documentation structure:
```
docs/
├── architecture/
│   ├── overview.md
│   ├── backend.md
│   ├── frontend.md
│   ├── database-schema.md
│   ├── workflows.md
│   └── integration-points.md
├── api/
│   ├── overview.md
│   ├── authentication.md
│   ├── applications.md
│   ├── documents.md
│   ├── workflows.md
│   ├── messaging.md
│   ├── payments.md
│   └── openapi.yaml
├── development/
│   ├── getting-started.md
│   ├── coding-standards.md
│   └── deployment.md
└── user-guides/
    ├── student-guide.md
    ├── admin-guide.md
    ├── workflow-editor-guide.md
    └── reporting-guide.md
```

### README Files

- Include a README.md file in the root directory
- Provide a brief project description
- Include setup and installation instructions
- Document available commands (build, test, etc.)
- List dependencies and requirements
- Include links to more detailed documentation
- Provide contact information for support

Example README.md structure:
```markdown
# Student Admissions Enrollment Platform

A comprehensive digital solution designed to streamline and enhance the entire student admissions lifecycle.

## Features

- Online application submission and management
- Document upload and verification system
- Application status tracking and notifications
- Personalized student dashboards
- Integration with SIS and LMS
- In-app messaging and communication tools
- AI-driven guidance and recommendations
- Financial aid processing and payment handling
- Administrative workflow management with WYSIWYG editor

## Technology Stack

- **Backend:** Laravel 10.x, PHP 8.2+
- **Frontend:** React 18.x, TypeScript 4.9+
- **Database:** MySQL 8.0+
- **Caching:** Redis 7.0+
- **Other:** Docker, AWS S3, Stripe, OpenAI API

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- PHP 8.2+
- Composer

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-organization/student-admissions-platform.git
   cd student-admissions-platform
   ```

2. Set up the backend
   ```bash
   cd src/backend
   cp .env.example .env
   composer install
   php artisan key:generate
   ```

3. Set up the frontend
   ```bash
   cd src/web
   cp .env.development .env
   npm install
   ```

4. Start the development environment
   ```bash
   docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
   ```

5. Run migrations and seeders
   ```bash
   php artisan migrate --seed
   ```

6. Start the frontend development server
   ```bash
   cd src/web
   npm start
   ```

## Available Commands

### Backend

- `php artisan test` - Run tests
- `php artisan migrate` - Run database migrations
- `php artisan db:seed` - Seed the database
- `php artisan serve` - Start the development server

### Frontend

- `npm start` - Start the development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run lint` - Run linting

## Documentation

For more detailed documentation, see the [docs](./docs) directory.

## Contributing

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
```

## Accessibility Standards

These standards ensure that the application is accessible to all users, including those with disabilities.

### WCAG Compliance

- Follow WCAG 2.1 AA guidelines
- Ensure sufficient color contrast
- Provide text alternatives for non-text content
- Make all functionality available from a keyboard
- Provide clear focus indicators
- Ensure content is readable and understandable
- Make content appear and operate in predictable ways
- Help users avoid and correct mistakes
- Maximize compatibility with assistive technologies

Example color contrast requirements:
- Normal text (less than 18pt): Contrast ratio of at least 4.5:1
- Large text (18pt or larger): Contrast ratio of at least 3:1
- UI components and graphical objects: Contrast ratio of at least 3:1

### Semantic HTML

- Use semantic HTML elements (header, nav, main, section, article, footer, etc.)
- Use appropriate heading levels (h1-h6) in a logical hierarchy
- Use lists (ul, ol, dl) for list content
- Use tables for tabular data with proper headers
- Use buttons for interactive elements that trigger actions
- Use links for navigation to other pages or resources
- Use form elements with proper labels

Example semantic HTML:
```html
<header>
  <h1>Student Admissions Portal</h1>
  <nav>
    <ul>
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/applications">Applications</a></li>
      <li><a href="/documents">Documents</a></li>
    </ul>
  </nav>
</header>

<main>
  <section aria-labelledby="application-heading">
    <h2 id="application-heading">Your Applications</h2>
    <ul>
      <li>
        <article>
          <h3>Undergraduate Application</h3>
          <p>Status: <span>Under Review</span></p>
          <button type="button">View Details</button>
        </article>
      </li>
    </ul>
  </section>
</main>

<footer>
  <p>&copy; 2023 University Name. All rights reserved.</p>
</footer>
```

### ARIA Attributes

- Use ARIA attributes only when necessary
- Prefer semantic HTML over ARIA when possible
- Use aria-label for elements without visible text
- Use aria-labelledby to associate elements with their labels
- Use aria-describedby for additional descriptions
- Use aria-expanded for expandable elements
- Use aria-hidden to hide decorative elements
- Use aria-live for dynamic content updates

Example ARIA usage:
```html
<!-- Dialog with ARIA attributes -->
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  aria-modal="true"
>
  <h2 id="dialog-title">Confirm Submission</h2>
  <p id="dialog-description">Are you sure you want to submit your application? This action cannot be undone.</p>
  <div>
    <button type="button">Cancel</button>
    <button type="button">Submit</button>
  </div>
</div>

<!-- Status message with ARIA live region -->
<div aria-live="polite" role="status">
  <p>Your application has been saved.</p>
</div>

<!-- Icon button with ARIA label -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false"><!-- Icon SVG --></svg>
</button>
```

### Keyboard Navigation

- Ensure all interactive elements are keyboard accessible
- Use logical tab order (tabindex="0" or natural order)
- Avoid using tabindex values greater than 0
- Implement keyboard shortcuts for common actions
- Ensure focus is visible at all times
- Trap focus in modal dialogs
- Provide skip links for navigation

Example keyboard navigation implementation:
```typescript
// Focus trap for modal dialogs
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Save the element that had focus before opening the modal
      const previouslyFocused = document.activeElement as HTMLElement;
      
      // Focus the modal when it opens
      modalRef.current?.focus();
      
      // Handle tab key to trap focus within the modal
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }
        
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || [];
          
          if (focusableElements.length === 0) return;
          
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus when the modal closes
        previouslyFocused?.focus();
      };
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      // Other props and styling
    >
      <h2 id="modal-title">{title}</h2>
      <div>{children}</div>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
};
```

### Form Accessibility

- Associate labels with form controls using for/id attributes
- Group related form controls with fieldset and legend
- Provide clear error messages and validation feedback
- Use aria-invalid for invalid form fields
- Use aria-describedby to associate error messages with form fields
- Ensure form controls have sufficient size and spacing
- Provide clear instructions for form completion

Example accessible form:
```tsx
import React, { useState } from 'react';
import { TextField, Button, FormHelperText, FormControl, FormLabel } from 'components/Common';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(email, password);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormControl error={!!errors.email}>
        <FormLabel htmlFor="email">Email Address</FormLabel>
        <TextField
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
          required
        />
        {errors.email && (
          <FormHelperText id="email-error" error>
            {errors.email}
          </FormHelperText>
        )}
      </FormControl>
      
      <FormControl error={!!errors.password}>
        <FormLabel htmlFor="password">Password</FormLabel>
        <TextField
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          aria-invalid={!!errors.password}
          required
        />
        {errors.password && (
          <FormHelperText id="password-error" error>
            {errors.password}
          </FormHelperText>
        )}
      </FormControl>
      
      <Button type="submit">Sign In</Button>
    </form>
  );
};

export default LoginForm;
```

## Security Standards

These standards ensure that the application is secure and protects user data.

### Authentication and Authorization

- Use secure authentication mechanisms
- Implement proper password hashing (bcrypt)
- Support multi-factor authentication
- Implement proper session management
- Use token-based authentication for APIs
- Implement role-based access control
- Validate permissions for all actions
- Log authentication and authorization events

Example Laravel authentication implementation:
```php
// app/Http/Controllers/Api/V1/AuthController.php
public function login(AuthLoginRequest $request)
{
    $credentials = $request->validated();
    
    if (!Auth::attempt($credentials)) {
        return response()->json([
            'success' => false,
            'error' => [
                'code' => 'INVALID_CREDENTIALS',
                'message' => 'The provided credentials are incorrect.',
            ],
        ], 401);
    }
    
    $user = Auth::user();
    $token = $user->createToken('auth_token')->plainTextToken;
    
    // Log successful login
    Log::channel('security')->info('User logged in', [
        'user_id' => $user->id,
        'email' => $user->email,
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent(),
    ]);
    
    return response()->json([
        'success' => true,
        'data' => [
            'token' => $token,
            'user' => new UserResource($user),
        ],
    ]);
}
```

Example React authentication implementation:
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, logout, refreshToken, getUser } from 'api/auth';
import { User, LoginCredentials } from 'types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Verify token and get user data
          const userData = await getUser();
          setUser(userData);
        } catch (err) {
          // Token is invalid or expired
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);
  
  const handleLogin = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { token, user } = await login(credentials);
      localStorage.setItem('auth_token', token);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsLoading(false);
      navigate('/login');
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Data Protection

- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper data access controls
- Use parameterized queries to prevent SQL injection
- Sanitize user input to prevent XSS attacks
- Implement CSRF protection
- Follow the principle of least privilege
- Implement proper error handling to prevent information leakage

Example data encryption implementation:
```php
// app/Models/User.php
class User extends Authenticatable
{
    // ...
    
    /**
     * Get the user's social security number.
     */
    public function getSsnAttribute($value)
    {
        return $value ? decrypt($value) : null;
    }
    
    /**
     * Set the user's social security number.
     */
    public function setSsnAttribute($value)
    {
        $this->attributes['ssn'] = $value ? encrypt($value) : null;
    }
}
```

Example CSRF protection in Laravel:
```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'web' => [
        // ...
        \App\Http\Middleware\VerifyCsrfToken::class,
        // ...
    ],
];
```

Example XSS prevention in React:
```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};

// Usage in component
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = sanitizeHtml(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};
```

### Secure Configuration

- Store sensitive configuration in environment variables
- Use secure defaults for all configuration
- Disable debugging features in production
- Implement proper error handling and logging
- Use secure headers (Content-Security-Policy, X-XSS-Protection, etc.)
- Implement rate limiting for API endpoints
- Configure proper file permissions
- Keep dependencies up-to-date

Example secure headers middleware:
```php
// app/Http/Middleware/SecurityHeaders.php
class SecurityHeaders
{
    public function handle($request, Closure $next)
    {
        $response = $next($request);
        
        $response->headers->set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.example.com");
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
        
        return $response;
    }
}
```

Example rate limiting configuration:
```php
// app/Providers/RouteServiceProvider.php
protected function configureRateLimiting()
{
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });
    
    RateLimiter::for('auth', function (Request $request) {
        return Limit::perMinute(5)->by($request->ip());
    });
}
```

### Security Testing

- Implement automated security testing
- Use static analysis tools to identify vulnerabilities
- Perform regular dependency scanning
- Conduct penetration testing
- Implement security code reviews
- Test for common vulnerabilities (OWASP Top 10)
- Verify security controls in CI/CD pipeline
- Document security testing results

Example security testing in CI/CD:
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      
      - name: Install dependencies
        run: composer install --no-dev --no-interaction --prefer-dist
      
      - name: PHP Security Checker
        uses: symfonycorp/security-checker-action@v4
      
      - name: Run PHPCS Security Audit
        run: |
          composer require --dev squizlabs/php_codesniffer
          composer require --dev pheromone/phpcs-security-audit
          vendor/bin/phpcs --standard=Security src
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: cd src/web && npm ci
      
      - name: Run npm audit
        run: cd src/web && npm audit --production
```

## Performance Standards

These standards ensure that the application performs well and provides a good user experience.

### Frontend Performance

- Minimize initial load time
- Optimize bundle size with code splitting
- Implement lazy loading for components and routes
- Optimize images and assets
- Minimize HTTP requests
- Use efficient rendering techniques
- Implement proper caching strategies
- Monitor and optimize performance metrics

Example code splitting implementation:
```typescript
// src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import AppShell from 'components/AppShell';
import ProtectedRoute from 'components/Common/ProtectedRoute';

// Eagerly loaded components
import LoginPage from 'pages/Auth/LoginPage';
import RegisterPage from 'pages/Auth/RegisterPage';
import NotFoundPage from 'pages/NotFoundPage';

// Lazily loaded components
const DashboardPage = lazy(() => import('pages/DashboardPage'));
const ApplicationsListPage = lazy(() => import('pages/Applications/ApplicationsListPage'));
const CreateApplicationPage = lazy(() => import('pages/Applications/CreateApplicationPage'));
const EditApplicationPage = lazy(() => import('pages/Applications/EditApplicationPage'));
const ViewApplicationPage = lazy(() => import('pages/Applications/ViewApplicationPage'));
const DocumentsPage = lazy(() => import('pages/Documents/DocumentsPage'));
const MessagesPage = lazy(() => import('pages/Messages/MessagesPage'));
const PaymentsPage = lazy(() => import('pages/Payments/PaymentsPage'));

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div className="loading-container"><CircularProgress /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsListPage />} />
            <Route path="applications/new" element={<CreateApplicationPage />} />
            <Route path="applications/:id/edit" element={<EditApplicationPage />} />
            <Route path="applications/:id" element={<ViewApplicationPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
```

Example image optimization:
```typescript
// src/components/Common/OptimizedImage.tsx
import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
}) => {
  // Generate srcSet for responsive images
  const generateSrcSet = () => {
    if (!src.includes('.jpg') && !src.includes('.png') && !src.includes('.webp')) {
      return undefined;
    }
    
    const basePath = src.substring(0, src.lastIndexOf('.'));
    const extension = src.substring(src.lastIndexOf('.'));
    
    return `
      ${basePath}-small${extension} 400w,
      ${basePath}-medium${extension} 800w,
      ${basePath}-large${extension} 1200w,
      ${src} 2000w
    `;
  };
  
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      srcSet={generateSrcSet()}
      sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
    />
  );
};

export default OptimizedImage;
```

### Backend Performance

- Optimize database queries
- Implement appropriate caching strategies
- Use eager loading to prevent N+1 query problems
- Optimize API responses
- Implement pagination for large datasets
- Use queues for background processing
- Monitor and optimize server performance
- Scale horizontally when necessary

Example caching implementation:
```php
// app/Services/ApplicationService.php
public function getUserApplications(int $userId, array $filters = [])
{
    $cacheKey = 'user_applications:' . $userId . ':' . md5(json_encode($filters));
    
    return Cache::tags(['applications', 'user:' . $userId])
        ->remember($cacheKey, now()->addMinutes(15), function () use ($userId, $filters) {
            $query = Application::with(['currentStatus', 'documents'])
                ->where('user_id', $userId);
            
            if (isset($filters['type'])) {
                $query->where('application_type', $filters['type']);
            }
            
            if (isset($filters['term'])) {
                $query->where('academic_term', $filters['term']);
            }
            
            if (isset($filters['year'])) {
                $query->where('academic_year', $filters['year']);
            }
            
            if (isset($filters['status'])) {
                $query->whereHas('currentStatus', function ($q) use ($filters) {
                    $q->where('status', $filters['status']);
                });
            }
            
            return $query->latest()->get();
        });
}

public function updateApplication(Application $application, array $data)
{
    DB::transaction(function () use ($application, $data) {
        $application->update($data);
        
        // Invalidate related caches
        Cache::tags(['applications', 'user:' . $application->user_id])->flush();
    });
    
    return $application->fresh();
}
```

Example background processing:
```php
// app/Http/Controllers/Api/V1/DocumentController.php
public function store(DocumentUploadRequest $request, int $applicationId)
{
    $application = Application::findOrFail($applicationId);
    
    // Authorize the request
    $this->authorize('uploadDocument', $application);
    
    // Store the document
    $document = $this->documentService->uploadDocument($applicationId, $request->validated());
    
    // Dispatch background job for processing
    ProcessDocumentVerification::dispatch($document);
    
    return response()->json([
        'success' => true,
        'data' => new DocumentResource($document),
    ], 201);
}

// app/Jobs/ProcessDocumentVerification.php
class ProcessDocumentVerification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    protected $document;
    
    public function __construct(Document $document)
    {
        $this->document = $document;
    }
    
    public function handle(DocumentVerificationService $verificationService)
    {
        $verificationService->verifyDocument($this->document);
    }
}
```

### Performance Testing

- Implement performance testing in the development process
- Establish performance baselines and targets
- Test under various load conditions
- Monitor key performance metrics
- Identify and address performance bottlenecks
- Conduct regular performance reviews
- Document performance testing results

Key performance metrics to monitor:
- Page load time
- Time to first byte (TTFB)
- Time to interactive (TTI)
- API response time
- Database query time
- Memory usage
- CPU utilization

## Conclusion

These coding standards provide a comprehensive guide for developing the Student Admissions Enrollment Platform. By following these standards, we ensure code quality, consistency, and maintainability across the project. All team members are expected to adhere to these standards and contribute to their ongoing improvement.

The standards will be regularly reviewed and updated to reflect evolving best practices and project requirements. Suggestions for improvements are welcome and should be submitted through the established review process.