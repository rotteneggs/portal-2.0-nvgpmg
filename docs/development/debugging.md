## Introduction

This document provides comprehensive guidance for debugging the Student Admissions Enrollment Platform. It covers debugging techniques, tools, and common issues for both the Laravel backend and React frontend. Whether you're troubleshooting a production issue or developing new features, this guide will help you identify and resolve problems efficiently.

## Development Environment Setup for Debugging

Before diving into debugging, ensure your development environment is properly configured for effective debugging.

### Backend (Laravel) Debugging Setup

Configure your Laravel environment for effective debugging:

1. **Environment Configuration**:
   - Set `APP_DEBUG=true` in your `.env` file for detailed error messages
   - Set `APP_ENV=local` for development-specific behavior

2. **Laravel Telescope Installation**:
   - Telescope is already included in the project dependencies
   - Access Telescope at `/telescope` when running the application locally
   - Ensure your local user has the appropriate permissions to view Telescope

3. **Xdebug Configuration**:
   ```ini
   # Add to php.ini or php-fpm.conf
   [xdebug]
   xdebug.mode=debug
   xdebug.start_with_request=yes
   xdebug.client_port=9003
   xdebug.client_host=host.docker.internal
   xdebug.idekey=PHPSTORM
   ```

4. **IDE Configuration**:
   - **PhpStorm**: Configure path mappings between your local filesystem and Docker container
   - **VS Code**: Configure the PHP Debug extension with appropriate path mappings

5. **Docker Configuration**:
   If using Docker, ensure your `docker-compose.yml` includes the necessary configuration for Xdebug:
   ```yaml
   services:
     app:
       environment:
         PHP_IDE_CONFIG: "serverName=admissions-platform"
         XDEBUG_CONFIG: "client_host=host.docker.internal"
   ```

### Frontend (React) Debugging Setup

Configure your React environment for effective debugging:

1. **Environment Configuration**:
   - Ensure `.env.development` is properly configured
   - Set `REACT_APP_API_URL` to point to your local backend API
   - Set `REACT_APP_DEBUG=true` for additional debug logging

2. **Browser DevTools Extensions**:
   - Install [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - Install [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)

3. **Source Maps**:
   - Ensure source maps are enabled in your development build
   - In `craco.config.js`, verify that `devtool` is set to `'source-map'` or `'eval-source-map'`

4. **IDE Configuration**:
   - **VS Code**: Install the Chrome Debugger extension
   - **WebStorm/IntelliJ**: Configure JavaScript debugging

5. **Debugging Configuration**:
   For VS Code, create a `.vscode/launch.json` file:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome against localhost",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}/src/web",
         "sourceMapPathOverrides": {
           "webpack:///src/*": "${webRoot}/*"
         }
       }
     ]
   }
   ```

### Database Debugging Setup

Configure tools for database debugging:

1. **MySQL Client Tools**:
   - Install a database client like MySQL Workbench, TablePlus, or DBeaver
   - Configure connection to your development database

2. **Database Query Logging**:
   - Enable query logging in Laravel by setting `DB_QUERY_LOG=true` in your `.env` file
   - View queries in Laravel Telescope's database tab

3. **Database Seeding for Testing**:
   - Use the provided seeders to populate your database with test data:
   ```bash
   php artisan db:seed --class=TestDataSeeder
   ```

4. **Redis Monitoring**:
   - Install Redis Commander or another Redis GUI
   - Configure connection to your Redis instance
   - Monitor cache, queues, and session data

## Backend Debugging Techniques

Techniques for debugging the Laravel backend application.

### Laravel Logging

Use Laravel's logging system to track application behavior:

1. **Basic Logging**:
   ```php
   Log::info('Processing application submission', ['application_id' => $application->id]);
   Log::warning('Document verification failed', ['document_id' => $document->id, 'reason' => $exception->getMessage()]);
   Log::error('Payment processing error', ['payment_id' => $payment->id, 'exception' => $exception]);
   ```

2. **Channel-Specific Logging**:
   ```php
   // Log to a specific channel
   Log::channel('integration')->info('SIS integration successful', [
       'operation' => 'create_student',
       'student_id' => $studentId,
       'sis_student_id' => $sisStudentId,
   ]);
   ```

3. **Context-Enriched Logging**:
   ```php
   // Add request context to logs
   Log::withContext([
       'user_id' => Auth::id(),
       'request_id' => request()->header('X-Request-ID'),
   ]);
   ```

4. **Viewing Logs**:
   - Check `storage/logs/laravel.log` for default logs
   - Check channel-specific logs in `storage/logs/`
   - Use Laravel Telescope for a web interface to logs

### Debugging with Laravel Telescope

Laravel Telescope provides comprehensive insights into your application:

1. **Accessing Telescope**:
   - Navigate to `/telescope` in your browser
   - Ensure you're authenticated with appropriate permissions

2. **Key Telescope Features**:
   - **Requests**: View HTTP requests with detailed information
   - **Commands**: Monitor Artisan command execution
   - **Queries**: See database queries with execution time
   - **Models**: Track Eloquent model operations
   - **Jobs**: Monitor queue job execution
   - **Events**: Track event dispatching and handling
   - **Mail**: Preview sent emails
   - **Notifications**: View sent notifications
   - **Cache**: Monitor cache operations
   - **Redis**: Track Redis commands

3. **Filtering and Searching**:
   - Use the search functionality to find specific entries
   - Filter by type, status, or other attributes
   - View related entries for comprehensive debugging

4. **Telescope in Local Environment Only**:
   - Telescope is configured to run only in the local environment
   - For other environments, check the logs directly

### Debugging with Xdebug

Use Xdebug for step-by-step debugging of PHP code:

1. **Setting Breakpoints**:
   - In PhpStorm: Click in the gutter next to the line number
   - In VS Code: Click in the gutter or use F9

2. **Starting a Debug Session**:
   - Start listening for PHP debug connections in your IDE
   - Trigger the code execution (HTTP request, Artisan command, etc.)
   - The debugger will pause at your breakpoints

3. **Debugging Controls**:
   - Step Over (F8): Execute the current line and move to the next line
   - Step Into (F7): Enter a function call
   - Step Out (Shift+F8): Complete the current function and return to the caller
   - Continue (F9): Resume execution until the next breakpoint

4. **Inspecting Variables**:
   - View variables in the Variables panel
   - Evaluate expressions in the Evaluation panel
   - Modify variables during debugging to test different scenarios

5. **Debugging Artisan Commands**:
   ```bash
   # Start debugging an Artisan command
   php -dxdebug.start_with_request=yes artisan command:name
   ```

6. **Debugging Queue Workers**:
   ```bash
   # Start debugging a queue worker
   php -dxdebug.start_with_request=yes artisan queue:work
   ```

### Database Query Debugging

Debug database interactions and optimize queries:

1. **Query Logging**:
   ```php
   // Enable query logging for a specific section
   DB::enableQueryLog();
   
   // Your code with database queries
   $users = User::with('profile')->where('is_active', true)->get();
   
   // Dump the executed queries
   dd(DB::getQueryLog());
   ```

2. **Analyzing Slow Queries**:
   - Use Laravel Telescope to identify slow queries
   - Add indexes to improve query performance
   - Use `explain` to analyze query execution plans:
   ```php
   $query = User::with('profile')->where('is_active', true);
   dd($query->explain());
   ```

3. **Debugging Relationships**:
   - Use `dump()` or `dd()` to inspect relationship loading:
   ```php
   $application = Application::find(1);
   dump($application->documents->toArray());
   ```
   - Check for N+1 query problems using Telescope
   - Use eager loading to optimize relationship queries:
   ```php
   $applications = Application::with(['user', 'documents', 'currentStatus'])->get();
   ```

4. **Transaction Debugging**:
   - Wrap debugging code in transactions to avoid permanent changes:
   ```php
   DB::beginTransaction();
   try {
       // Test your code here
       $result = $this->processApplication($application);
       dump($result);
       
       // Roll back to avoid making actual changes
       DB::rollBack();
   } catch (Exception $e) {
       DB::rollBack();
       throw $e;
   }
   ```

### Event and Queue Debugging

Debug event dispatching and queue processing:

1. **Event Debugging**:
   - Use Laravel Telescope to monitor event dispatching
   - Temporarily replace event listeners with debugging code:
   ```php
   // In a service provider's boot method
   Event::listen('*', function ($eventName, array $data) {
       Log::info("Event triggered: {$eventName}", ['data' => $data]);
   });
   ```

2. **Fake Events for Testing**:
   ```php
   // In a test method
   Event::fake([ApplicationSubmittedEvent::class]);
   
   // Execute code that should dispatch events
   $this->applicationService->submitApplication($application);
   
   // Assert events were dispatched
   Event::assertDispatched(ApplicationSubmittedEvent::class, function ($event) use ($application) {
       return $event->application->id === $application->id;
   });
   ```

3. **Queue Debugging**:
   - Use Laravel Telescope to monitor queue jobs
   - Process jobs synchronously for debugging:
   ```php
   // In .env
   QUEUE_CONNECTION=sync
   ```
   - Or process a specific job synchronously:
   ```php
   ProcessDocumentVerification::dispatchSync($document);
   ```

4. **Failed Job Handling**:
   - Inspect failed jobs in the `failed_jobs` table
   - Retry failed jobs for debugging:
   ```bash
   php artisan queue:retry <job_id>
   ```
   - Or retry all failed jobs:
   ```bash
   php artisan queue:retry all
   ```

### API Request Debugging

Debug API requests and responses:

1. **Request Logging Middleware**:
   ```php
   namespace App\Http\Middleware;
   
   use Closure;
   use Illuminate\Support\Facades\Log;
   
   class RequestLogger
   {
       public function handle($request, Closure $next)
       {
           // Log the request
           Log::channel('api')->info('API Request', [
               'method' => $request->method(),
               'url' => $request->fullUrl(),
               'headers' => $request->headers->all(),
               'body' => $request->all(),
           ]);
           
           // Process the request
           $response = $next($request);
           
           // Log the response
           Log::channel('api')->info('API Response', [
               'status' => $response->getStatusCode(),
               'headers' => $response->headers->all(),
               'body' => $response->getContent(),
           ]);
           
           return $response;
       }
   }
   ```

2. **Testing API Endpoints**:
   - Use Postman or Insomnia for manual API testing
   - Create collections for common API scenarios
   - Use environment variables for different environments

3. **API Authentication Debugging**:
   - Check token validity and expiration
   - Verify that the token is being sent correctly in the Authorization header
   - Use Laravel Sanctum's token abilities for debugging specific permissions

### Integration Debugging

Debug integrations with external systems:

1. **HTTP Client Logging**:
   ```php
   // Log HTTP requests and responses
   Http::withOptions([
       'debug' => true, // Outputs to stderr
   ])->get('https://api.example.com/endpoint');
   ```

2. **Mock External Services**:
   - Create mock implementations for testing:
   ```php
   class MockSISService extends SISIntegrationService
   {
       public function createStudent(User $user, Application $application): array
       {
           Log::info('Mock SIS createStudent called', [
               'user_id' => $user->id,
               'application_id' => $application->id,
           ]);
           
           return [
               'student_id' => 'MOCK-' . $user->id,
               'status' => 'created',
           ];
       }
   }
   ```
   - Register the mock in a service provider for testing:
   ```php
   $this->app->bind(SISIntegrationService::class, MockSISService::class);
   ```

3. **Integration Logging**:
   - Use the dedicated integration log channel:
   ```php
   Log::channel('integration')->info('SIS API request', [
       'endpoint' => 'students',
       'method' => 'POST',
       'payload' => $data,
   ]);
   ```

4. **Retry and Circuit Breaker Debugging**:
   - Temporarily modify retry settings for testing:
   ```php
   // In the integration service
   protected $retryAttempts = 1; // Reduce for faster testing
   protected $retryDelay = 0; // No delay for testing
   ```
   - Log circuit breaker state changes:
   ```php
   Log::channel('integration')->warning('Circuit breaker opened', [
       'service' => 'SIS',
       'reason' => $exception->getMessage(),
   ]);
   ```

## Frontend Debugging Techniques

Techniques for debugging the React frontend application.

### Browser DevTools

Use browser developer tools for frontend debugging:

1. **Console Debugging**:
   - Use `console.log()`, `console.warn()`, and `console.error()` for basic logging
   - Use `console.table()` for tabular data:
   ```javascript
   console.table(applications.map(app => ({
     id: app.id,
     type: app.application_type,
     status: app.status.name,
     submitted: app.is_submitted
   })));
   ```
   - Use `console.group()` for grouped logging:
   ```javascript
   console.group('Application Submission');
   console.log('Application data:', applicationData);
   console.log('Validation result:', validationResult);
   console.log('Submission response:', response);
   console.groupEnd();
   ```

2. **Network Tab**:
   - Monitor API requests and responses
   - Filter requests by type (XHR, Fetch, etc.)
   - Inspect request and response headers and bodies
   - Simulate different network conditions

3. **Elements Tab**:
   - Inspect and modify the DOM
   - View and edit CSS styles
   - Check accessibility properties
   - Monitor DOM changes

4. **Sources Tab**:
   - Set breakpoints in JavaScript code
   - Step through code execution
   - Use the watch panel to monitor variables
   - Add conditional breakpoints

5. **Application Tab**:
   - Inspect localStorage and sessionStorage
   - View and modify cookies
   - Check the application cache
   - Manage service workers

### React Developer Tools

Use React Developer Tools for React-specific debugging:

1. **Components Tab**:
   - Inspect the React component tree
   - View component props and state
   - Modify state and props for testing
   - Track component renders and updates

2. **Profiler Tab**:
   - Record and analyze component rendering performance
   - Identify components that render too often
   - Measure render durations
   - Find performance bottlenecks

3. **Component Highlighting**:
   - Enable component highlighting to visualize component boundaries
   - Identify which component is responsible for specific UI elements

4. **Component Filtering**:
   - Filter components by name or type
   - Focus on specific parts of the component tree

5. **Component Inspection**:
   ```javascript
   // In your component
   const MyComponent = (props) => {
     // Add this line to inspect the component in React DevTools
     window.myComponent = { props, state: useState(initialState) };
     
     // Component implementation
   };
   ```

### Redux DevTools

Use Redux DevTools for debugging Redux state and actions:

1. **State Inspection**:
   - View the current Redux state
   - Explore state structure and values
   - Track state changes over time

2. **Action Tracing**:
   - Monitor dispatched actions
   - View action payloads
   - See how actions affect state

3. **Time Travel Debugging**:
   - Jump to previous states
   - Replay actions
   - Understand the sequence of state changes

4. **Action Filtering**:
   - Filter actions by type
   - Focus on specific parts of the application

5. **State Diffing**:
   - See exactly what changed between states
   - Identify unexpected state changes

6. **Custom Redux Logging**:
   ```javascript
   // In your code
   import { createLogger } from 'redux-logger';
   
   const logger = createLogger({
     collapsed: true,
     diff: true,
     // Only log specific actions
     predicate: (getState, action) => {
       return action.type.includes('application/');
     }
   });
   
   // Add to middleware in store configuration
   ```

### React Query DevTools

Use React Query DevTools for debugging data fetching:

1. **Query Inspection**:
   - View all active queries
   - See query states (loading, error, success)
   - Inspect query data and error details

2. **Query Refetching**:
   - Manually trigger query refetching
   - Test query behavior with fresh data

3. **Query Cache Inspection**:
   - View the query cache
   - Understand cache behavior and invalidation

4. **Query Timing**:
   - See how long queries take to execute
   - Identify slow queries

5. **Adding React Query DevTools**:
   ```javascript
   // In your App.tsx or index.tsx
   import { ReactQueryDevtools } from 'react-query/devtools';
   
   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         {/* Your app components */}
         <ReactQueryDevtools initialIsOpen={false} />
       </QueryClientProvider>
     );
   }
   ```

### Component Debugging

Debug React components effectively:

1. **Component Debugging with useEffect**:
   ```javascript
   useEffect(() => {
     console.log('Component mounted or updated', { props, state });
     
     return () => {
       console.log('Component will unmount');
     };
   }, [props, state]);
   ```

2. **Debugging Renders**:
   ```javascript
   // Add this to see when a component renders
   console.log(`${ComponentName} rendering`, { props, state });
   
   // Or create a custom hook
   function useRenderLog(componentName, props, dependencies = []) {
     useEffect(() => {
       console.log(`${componentName} rendered`, props);
     }, dependencies);
   }
   
   // Usage
   useRenderLog('UserProfile', props, [props.userId]);
   ```

3. **Debugging Props and State**:
   ```javascript
   // Destructure with default values to identify missing props
   const {
     user = 'MISSING_USER',
     onSubmit = 'MISSING_HANDLER',
     isLoading = 'MISSING_LOADING_STATE'
   } = props;
   
   // Log if unexpected
   if (user === 'MISSING_USER') console.warn('UserProfile: user prop is missing');
   ```

4. **Error Boundaries**:
   ```javascript
   // Create an error boundary component
   class ErrorBoundary extends React.Component {
     state = { hasError: false, error: null, errorInfo: null };
     
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
     
     componentDidCatch(error, errorInfo) {
       console.error('Component error:', error, errorInfo);
       this.setState({ errorInfo });
     }
     
     render() {
       if (this.state.hasError) {
         return (
           <div className="error-boundary">
             <h2>Something went wrong.</h2>
             <details>
               <summary>Error details</summary>
               <pre>{this.state.error?.toString()}</pre>
               <pre>{this.state.errorInfo?.componentStack}</pre>
             </details>
           </div>
         );
       }
       
       return this.props.children;
     }
   }
   
   // Usage
   <ErrorBoundary>
     <ComplexComponent />
   </ErrorBoundary>
   ```

5. **Custom Debug Component**:
   ```javascript
   const Debug = ({ data, name = 'Debug' }) => {
     return process.env.NODE_ENV === 'development' ? (
       <div style={{ 
         padding: '10px', 
         background: '#f0f0f0', 
         border: '1px solid #ddd',
         borderRadius: '4px',
         margin: '10px 0' 
       }}>
         <h4>{name}</h4>
         <pre>{JSON.stringify(data, null, 2)}</pre>
       </div>
     ) : null;
   };
   
   // Usage
   <Debug data={applicationData} name="Application Data" />
   ```

### Form Debugging

Debug form components and validation:

1. **Form State Logging**:
   ```javascript
   // Using the useForm hook
   const { values, errors, touched, handleChange, handleSubmit } = useForm({
     initialValues,
     validationSchema,
     onSubmit,
   });
   
   console.log('Form state:', { values, errors, touched });
   ```

2. **Form Submission Debugging**:
   ```javascript
   const handleSubmit = async (values) => {
     console.log('Form submitted with values:', values);
     
     try {
       const response = await submitForm(values);
       console.log('Submission response:', response);
     } catch (error) {
       console.error('Submission error:', error);
     }
   };
   ```

3. **Validation Debugging**:
   ```javascript
   // Log validation attempts
   const validateField = (name, value) => {
     console.log(`Validating field ${name} with value:`, value);
     
     try {
       const result = validationSchema.validateSyncAt(name, { [name]: value });
       console.log(`Validation passed for ${name}`);
       return null;
     } catch (error) {
       console.log(`Validation failed for ${name}:`, error.message);
       return error.message;
     }
   };
   ```

4. **Form Component Inspection**:
   - Use React DevTools to inspect form component state
   - Check controlled vs. uncontrolled component behavior
   - Verify that form values are updating correctly

5. **Form Submission Interception**:
   ```javascript
   // Intercept form submission for debugging
   const debugSubmit = (event) => {
     event.preventDefault();
     const formData = new FormData(event.target);
     const values = Object.fromEntries(formData.entries());
     
     console.log('Form values:', values);
     
     // Continue with normal submission if needed
     // handleSubmit(values);
   };
   
   // Usage
   <form onSubmit={debugSubmit}>
     {/* Form fields */}
   </form>
   ```

### API and Network Debugging

Debug API calls and network interactions:

1. **Axios Request/Response Logging**:
   ```javascript
   // Add interceptors to log requests and responses
   axios.interceptors.request.use(request => {
     console.log('API Request:', {
       url: request.url,
       method: request.method,
       data: request.data,
       headers: request.headers
     });
     return request;
   });
   
   axios.interceptors.response.use(
     response => {
       console.log('API Response:', {
         url: response.config.url,
         status: response.status,
         data: response.data
       });
       return response;
     },
     error => {
       console.error('API Error:', {
         url: error.config?.url,
         status: error.response?.status,
         data: error.response?.data,
         message: error.message
       });
       return Promise.reject(error);
     }
   );
   ```

2. **Mock API Responses**:
   ```javascript
   // Create a mock API service for testing
   const mockApiService = {
     getApplications: jest.fn().mockResolvedValue({
       data: [
         { id: 1, application_type: 'undergraduate', /* other fields */ },
         { id: 2, application_type: 'graduate', /* other fields */ }
       ]
     }),
     
     // Add other API methods as needed
   };
   
   // Use in components for testing
   // apiService.getApplications = mockApiService.getApplications;
   ```

3. **Network Condition Testing**:
   - Use Chrome DevTools to simulate different network conditions
   - Test slow connections, offline mode, and high latency
   - Verify that the application handles network issues gracefully

4. **API Error Simulation**:
   ```javascript
   // Simulate API errors for testing error handling
   const simulateApiError = async (apiCall, errorStatus = 500, errorMessage = 'Server error') => {
     // Replace the actual API call with a rejected promise
     const originalMethod = apiCall;
     apiCall = jest.fn().mockRejectedValue({
       response: {
         status: errorStatus,
         data: {
           message: errorMessage
         }
       }
     });
     
     // Return a cleanup function
     return () => {
       apiCall = originalMethod;
     };
   };
   
   // Usage
   const cleanup = await simulateApiError(apiService.getApplications, 401, 'Unauthorized');
   // Test unauthorized access handling
   cleanup();
   ```

## Common Issues and Solutions

Solutions for common issues encountered during development and debugging.

### Backend Issues

Common backend issues and their solutions:

1. **Database Connection Issues**:
   - **Symptom**: "SQLSTATE[HY000] [2002] Connection refused"
   - **Solution**: 
     - Check database credentials in `.env`
     - Verify database service is running
     - Check network connectivity to database host
     - For Docker, ensure service names match in `docker-compose.yml`

2. **Redis Connection Issues**:
   - **Symptom**: "Redis connection refused"
   - **Solution**:
     - Verify Redis service is running
     - Check Redis configuration in `.env`
     - For Docker, ensure service names match in `docker-compose.yml`

3. **Permission Issues**:
   - **Symptom**: "Permission denied" errors for storage or cache
   - **Solution**:
     ```bash
     # Fix permissions
     chmod -R 775 storage bootstrap/cache
     chown -R www-data:www-data storage bootstrap/cache
     ```

4. **Artisan Command Not Found**:
   - **Symptom**: "Command not found" when running Artisan commands
   - **Solution**:
     - Ensure you're in the project root directory
     - Run `composer dump-autoload`
     - Check command registration in `app/Console/Kernel.php`

5. **Queue Worker Not Processing Jobs**:
   - **Symptom**: Jobs remain in queue and aren't processed
   - **Solution**:
     - Verify queue worker is running: `php artisan queue:work`
     - Check queue connection in `.env`
     - Inspect failed jobs: `php artisan queue:failed`
     - Restart queue workers after code changes

6. **Class Not Found Errors**:
   - **Symptom**: "Class not found" exceptions
   - **Solution**:
     - Run `composer dump-autoload`
     - Check namespace and class name match file path
     - Verify class is imported with correct namespace

7. **Token Mismatch Errors**:
   - **Symptom**: CSRF token mismatch errors
   - **Solution**:
     - Include CSRF token in forms: `@csrf`
     - For API requests, ensure CSRF protection is properly configured
     - Check session configuration

8. **Middleware Issues**:
   - **Symptom**: Unexpected redirects or access denied
   - **Solution**:
     - Check middleware registration in `app/Http/Kernel.php`
     - Verify middleware order
     - Debug middleware behavior with logging

9. **Eloquent Relationship Issues**:
   - **Symptom**: "Undefined property" or "Call to undefined method" on relationships
   - **Solution**:
     - Verify relationship method names match usage
     - Check foreign key and local key definitions
     - Ensure models are properly imported

10. **Cache Issues**:
    - **Symptom**: Stale data or unexpected behavior after changes
    - **Solution**:
      ```bash
      # Clear various caches
      php artisan cache:clear
      php artisan config:clear
      php artisan route:clear
      php artisan view:clear