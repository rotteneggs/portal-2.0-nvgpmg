# Developer Getting Started Guide

## Introduction

Welcome to the Student Admissions Enrollment Platform developer documentation. This guide will help you set up your development environment and get started with contributing to the project.

The Student Admissions Enrollment Platform is a comprehensive digital solution designed to streamline and enhance the entire student admissions lifecycle. Built with Laravel (backend), MySQL (database), React (frontend), and Redis (caching and session management), this platform provides a centralized hub for managing prospective and enrolled students by digitizing and automating critical admissions processes.

This guide covers everything you need to know to set up your local development environment, understand the project structure, and follow the development workflow.

## Prerequisites

Before you begin, ensure you have the following software installed on your development machine:

- **Git**: For version control and code management
- **Docker and Docker Compose**: For containerized development environment
- **Node.js (v18+)**: For frontend development
- **PHP 8.2+**: For backend development
- **Composer**: For PHP dependency management
- **MySQL client (optional)**: For direct database interaction
- **Redis client (optional)**: For cache inspection and debugging

### Installing Prerequisites

#### Windows

We recommend using WSL2 (Windows Subsystem for Linux) for development on Windows to provide a more consistent environment with Linux-based deployments.

1. Install WSL2 following [Microsoft's official guide](https://docs.microsoft.com/en-us/windows/wsl/install)
2. Install Docker Desktop for Windows with WSL2 integration
3. Install Node.js, PHP, and Composer within your WSL2 distribution

#### macOS

1. Install [Homebrew](https://brew.sh/)
2. Install the required dependencies:

```bash
brew install git node php@8.2 composer mysql-client redis
brew install --cask docker
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Git
sudo apt install git

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Install PHP 8.2
sudo apt install software-properties-common
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install php8.2 php8.2-cli php8.2-common php8.2-curl php8.2-mbstring php8.2-mysql php8.2-xml php8.2-zip

# Install Composer
curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

# Install MySQL and Redis clients
sudo apt install mysql-client redis-tools
```

## Repository Setup

### Cloning the Repository

```bash
git clone https://github.com/your-organization/student-admissions-platform.git
cd student-admissions-platform
```

### Repository Structure Overview

The repository is organized into the following main directories:

- `src/backend`: Laravel backend application
- `src/web`: React frontend application
- `infrastructure`: Infrastructure-related files (Docker, deployment configs)
- `docs`: Documentation files
- `tests`: End-to-end tests

## Backend Setup

### Environment Configuration

1. Navigate to the backend directory:

```bash
cd src/backend
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your local development settings. The most important variables to configure are:

```
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=admissions
DB_USERNAME=root
DB_PASSWORD=

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
CACHE_DRIVER=redis
```

### Installing Dependencies

Install PHP dependencies using Composer:

```bash
composer install
```

### Database Setup

1. Create a new MySQL database for the application (you can skip this if using Docker):

```bash
mysql -u root -p
```

```sql
CREATE DATABASE admissions;
EXIT;
```

2. Generate an application key:

```bash
php artisan key:generate
```

### Running Migrations and Seeders

Run database migrations to create the required tables:

```bash
php artisan migrate
```

Seed the database with initial data:

```bash
php artisan db:seed
```

For development, you can use the `--seed` flag with the migrate command to run both steps at once:

```bash
php artisan migrate:fresh --seed
```

### Starting the Backend Server

Start the Laravel development server:

```bash
php artisan serve
```

The backend API will be accessible at http://localhost:8000.

## Frontend Setup

### Environment Configuration

1. Navigate to the frontend directory:

```bash
cd src/web
```

2. Create a local environment file:

```bash
cp .env.development .env
```

3. Update the `.env` file with your local development settings. The most important variable to configure is:

```
REACT_APP_API_URL=http://localhost:8000/api
```

### Installing Dependencies

Install JavaScript dependencies using npm:

```bash
npm install
```

### Starting the Development Server

Start the React development server:

```bash
npm start
```

The frontend application will be accessible at http://localhost:3000.

## Docker Setup

Using Docker is the recommended way to set up a consistent development environment that closely mirrors the production setup.

### Docker Environment Configuration

1. Navigate to the Docker directory:

```bash
cd infrastructure/docker
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your preferred settings. The defaults should work for most development scenarios.

### Building and Starting Containers

From the project root directory, start the Docker environment:

```bash
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

This command starts the following services:
- `nginx`: Web server (http://localhost:8080)
- `php`: PHP-FPM service for backend
- `mysql`: MySQL database
- `redis`: Redis cache and queue
- `node`: Node.js service for frontend (http://localhost:3000)

### Accessing Services

- Backend API: http://localhost:8080/api
- Frontend: http://localhost:3000
- MySQL: localhost:3306 (user: root, password: set in .env)
- Redis: localhost:6379

### Common Docker Commands

```bash
# View running containers
docker-compose -f infrastructure/docker/docker-compose.dev.yml ps

# View logs for all services
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs

# View logs for a specific service
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs php

# SSH into a container
docker-compose -f infrastructure/docker/docker-compose.dev.yml exec php bash

# Stop all services
docker-compose -f infrastructure/docker/docker-compose.dev.yml down

# Rebuild containers after making changes to Dockerfile
docker-compose -f infrastructure/docker/docker-compose.dev.yml build

# Run Laravel Artisan commands
docker-compose -f infrastructure/docker/docker-compose.dev.yml exec php php artisan <command>

# Run npm commands
docker-compose -f infrastructure/docker/docker-compose.dev.yml exec node npm <command>
```

## Development Workflow

### Branching Strategy

We follow a Git Flow branching strategy:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `release/*`: Release branches
- `hotfix/*`: Hotfix branches

When starting new work:

1. Create a new branch from `develop`:

```bash
git checkout develop
git pull
git checkout -b feature/your-feature-name
```

2. Make your changes and commit frequently with meaningful messages.

### Code Style and Linting

#### Backend (PHP)

We follow PSR-12 coding standards for PHP. The project includes PHP_CodeSniffer for automated style checking:

```bash
cd src/backend
composer run lint
```

To automatically fix style issues:

```bash
composer run lint:fix
```

#### Frontend (JavaScript/TypeScript)

We use ESLint and Prettier for JavaScript/TypeScript code style:

```bash
cd src/web
npm run lint
```

To automatically fix style issues:

```bash
npm run lint:fix
```

### Running Tests

Always run tests before submitting a pull request.

#### Backend Tests

```bash
cd src/backend
php artisan test
```

#### Frontend Tests

```bash
cd src/web
npm test
```

### Making Pull Requests

1. Push your feature branch to the remote repository:

```bash
git push -u origin feature/your-feature-name
```

2. Open a pull request against the `develop` branch through GitHub.
3. Ensure all automated checks (tests, linting) pass.
4. Request a code review from at least one team member.
5. Address any feedback from the code review.
6. Once approved, your changes will be merged into the `develop` branch.

## Testing

### Backend Testing with PHPUnit

The backend uses PHPUnit for testing. Tests are located in the `src/backend/tests` directory.

```bash
cd src/backend
php artisan test
```

To run a specific test:

```bash
php artisan test --filter=TestClassName
```

#### Writing Backend Tests

- Unit tests should be placed in `tests/Unit`
- Feature tests should be placed in `tests/Feature`
- Use database transactions to reset state between tests
- Mock external services using Laravel's built-in mocking features

Example test:

```php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_example_endpoint()
    {
        $response = $this->getJson('/api/example');

        $response->assertStatus(200)
                 ->assertJson([
                     'message' => 'Success'
                 ]);
    }
}
```

### Frontend Testing with Jest

The frontend uses Jest and React Testing Library for testing. Tests are located next to the components they test with a `.test.jsx` or `.test.tsx` extension.

```bash
cd src/web
npm test
```

To run tests with coverage:

```bash
npm test -- --coverage
```

#### Writing Frontend Tests

- Focus on testing component behavior rather than implementation details
- Use React Testing Library to interact with components as users would
- Mock API calls using Mock Service Worker

Example test:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExampleComponent from './ExampleComponent';

test('renders the example component correctly', () => {
  render(<ExampleComponent />);
  
  expect(screen.getByText('Example')).toBeInTheDocument();
});

test('clicking the button calls the action', async () => {
  const mockAction = jest.fn();
  render(<ExampleComponent onAction={mockAction} />);
  
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(mockAction).toHaveBeenCalledTimes(1);
});
```

### E2E Testing with Cypress

End-to-end tests are located in the `tests/e2e` directory and use Cypress.

```bash
cd src/web
npm run cypress:open
```

To run tests headlessly:

```bash
npm run cypress:run
```

#### Writing E2E Tests

- Focus on critical user flows
- Use data attributes for selecting elements
- Setup and teardown test data using API calls or database seeding

Example test:

```javascript
describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login with valid credentials', () => {
    cy.get('[data-testid=email-input]').type('test@example.com');
    cy.get('[data-testid=password-input]').type('password123');
    cy.get('[data-testid=login-button]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid=user-greeting]').should('contain', 'Welcome');
  });
});
```

### Test Coverage Reports

Generate and view test coverage reports to ensure adequate test coverage.

Backend:

```bash
cd src/backend
php artisan test --coverage
```

Frontend:

```bash
cd src/web
npm test -- --coverage
```

## Common Issues and Troubleshooting

### Docker-related Issues

#### Port Conflicts

If you see an error like "port is already allocated", you may have another service using that port:

```bash
# Find process using the port (Linux/macOS)
sudo lsof -i :8080

# Windows
netstat -ano | findstr :8080

# Then stop the process or change the port in your .env file
```

#### Docker Container Not Starting

Check the logs for more details:

```bash
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs
```

### Database Issues

#### Migration Errors

If you encounter errors during migration:

```bash
# Reset the database and run migrations again
php artisan migrate:fresh --seed

# If using Docker
docker-compose -f infrastructure/docker/docker-compose.dev.yml exec php php artisan migrate:fresh --seed
```

#### Connection Errors

If the application can't connect to the database, verify your `.env` settings and ensure the database server is running.

### Frontend Issues

#### NPM Errors

If you encounter errors during npm install:

```bash
# Clear npm cache
npm cache clean --force

# Try installing again
npm install
```

#### API Connection Issues

If the frontend can't connect to the backend API, check that:
- The backend server is running
- Your `.env` file has the correct `REACT_APP_API_URL` value
- CORS is properly configured in the backend

### Cache-related Issues

If you're experiencing unexpected behavior that might be cache-related:

```bash
# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:clear

# Clear route cache
php artisan route:clear

# Clear view cache
php artisan view:clear

# Or all at once
php artisan optimize:clear
```

## Additional Resources

- [Architecture Documentation](../architecture/overview.md): Overview of the system architecture
- [API Documentation](../api/overview.md): Detailed API documentation
- [Coding Standards](../standards/coding-standards.md): Detailed coding standards and best practices
- [Deployment Guide](../deployment/deployment-guide.md): Instructions for deploying the application

### External Documentation

- [Laravel Documentation](https://laravel.com/docs) (v10.x)
- [React Documentation](https://reactjs.org/docs/getting-started.html) (v18.x)
- [Material-UI Documentation](https://mui.com/getting-started/usage/) (v5.x)
- [Docker Documentation](https://docs.docker.com/)

### Getting Help

If you encounter any issues not covered in this guide:

1. Check the project wiki
2. Search for existing issues in the GitHub repository
3. Ask in the team Slack channel
4. If all else fails, create a new issue on GitHub with detailed information about your problem