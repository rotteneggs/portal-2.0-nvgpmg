# Student Admissions Enrollment Platform - Backend

Backend API for the Student Admissions Enrollment Platform built with Laravel 10.x, MySQL, and Redis.

## System Requirements

- PHP 8.2+
- Composer 2.x
- MySQL 8.0+
- Redis 7.0+
- Node.js 18+ (for asset compilation)
- Docker (optional, for containerized development)

## Installation

### Local Setup

1. Clone the repository
   ```bash
   git clone [repository-url]
   cd src/backend
   ```

2. Install dependencies
   ```bash
   composer install
   npm install
   ```

3. Configure environment
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Configure your database in the `.env` file
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=admissions_platform
   DB_USERNAME=root
   DB_PASSWORD=
   ```

5. Configure Redis for caching and queues
   ```
   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379
   ```

6. Run migrations and seeders
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

7. Start the development server
   ```bash
   php artisan serve
   ```

### Docker Setup

1. Configure environment
   ```bash
   cp .env.example .env
   ```

2. Start Docker containers
   ```bash
   docker-compose up -d
   ```

3. Install dependencies and run migrations
   ```bash
   docker-compose exec app composer install
   docker-compose exec app php artisan key:generate
   docker-compose exec app php artisan migrate --seed
   ```

## Architecture Overview

The backend follows a service-oriented architecture within a monolithic Laravel application:

- **Controllers**: Handle HTTP requests and delegate to services (`app/Http/Controllers/Api/V1`)
- **Services**: Contain business logic and orchestrate operations (`app/Services`)
- **Models**: Represent database entities and relationships (`app/Models`)
- **Events & Listeners**: Handle asynchronous processes (`app/Events`, `app/Listeners`)
- **Jobs**: Background processing tasks (`app/Jobs`)
- **Middleware**: Request filtering and modification (`app/Http/Middleware`)

Key components include:

- **Authentication**: Laravel Sanctum for API token authentication
- **Caching**: Redis-based caching for performance optimization
- **Queue Processing**: Redis queues for background jobs
- **Storage**: S3-compatible storage for documents
- **AI Services**: Integration with document analysis and chatbot services

## API Documentation

API documentation is available at `/api/documentation` when running the application in development mode.

The API follows RESTful principles with the following base URL structure:

```
/api/v1/[resource]
```

All endpoints require authentication except for registration and login.

For detailed API documentation, refer to the OpenAPI specification in `docs/api/openapi.yaml`.

## Testing

The application uses PHPUnit for testing. Tests are organized into Feature and Unit tests.

```bash
# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit

# Run specific test file
php artisan test tests/Feature/ApplicationTest.php
```

## Development Guidelines

### Coding Standards

- Follow PSR-12 coding standards
- Use type hints and return types
- Document all public methods with PHPDoc
- Use dependency injection

### Git Workflow

1. Create a feature branch from `develop`
2. Make changes and commit with descriptive messages
3. Push branch and create a pull request to `develop`
4. Ensure CI passes and request code review
5. Merge after approval

### Database Changes

- Always use migrations for database changes
- Create seeders for test data
- Document complex relationships

### Adding New Features

1. Create necessary migrations
2. Create or update models
3. Implement service classes with business logic
4. Create controller methods
5. Define routes in `routes/api.php`
6. Write tests

## Key Configuration Files

- `config/app.php`: Application configuration
- `config/auth.php`: Authentication settings
- `config/cache.php`: Cache configuration
- `config/database.php`: Database connections
- `config/filesystems.php`: File storage configuration
- `config/queue.php`: Queue configuration
- `config/services.php`: Third-party service configuration
- `config/ai.php`: AI services configuration
- `config/workflow.php`: Workflow engine configuration
- `config/integrations.php`: External system integration settings

## Troubleshooting

### Common Issues

1. **Permission Issues**
   ```bash
   chmod -R 777 storage bootstrap/cache
   ```

2. **Composer Dependencies**
   ```bash
   composer dump-autoload
   ```

3. **Cache Issues**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   ```

4. **Queue Not Processing**
   ```bash
   php artisan queue:restart
   ```

5. **Database Connection Issues**
   - Verify credentials in `.env`
   - Check database server is running
   - Ensure proper privileges

## Deployment

### Production Deployment Checklist

1. Set environment to production
   ```
   APP_ENV=production
   APP_DEBUG=false
   ```

2. Optimize the application
   ```bash
   php artisan optimize
   php artisan route:cache
   php artisan config:cache
   ```

3. Set up proper queue workers
   ```bash
   php artisan queue:work --tries=3 --timeout=90
   ```

4. Configure supervisor for queue workers
   - See `docker/supervisord.conf` for example configuration

5. Set up proper caching
   - Configure Redis for production use
   - Set appropriate cache TTLs

6. Configure proper logging
   - Set up log rotation
   - Configure error reporting

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.