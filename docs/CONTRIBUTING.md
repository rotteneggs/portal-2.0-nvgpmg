# Contributing to the Student Admissions Enrollment Platform

Thank you for your interest in contributing to the Student Admissions Enrollment Platform! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Coding Standards](#coding-standards)
- [Branching Strategy](#branching-strategy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](../.github/CODE_OF_CONDUCT.md) before contributing to the project.

We are committed to providing a welcoming and inclusive environment for all contributors regardless of gender, sexual orientation, ability, ethnicity, socioeconomic status, and religion.

## Getting Started

Before you begin contributing, please:

1. Ensure you have a GitHub account
2. Familiarize yourself with the project by reading the documentation in the `docs/` directory
3. Check the [issue tracker](https://github.com/organization/student-admissions-platform/issues) for open issues that need attention
4. For new features or significant changes, open an issue first to discuss your proposed changes

## Development Environment Setup

### Prerequisites

- PHP 8.2+
- Composer 2.x
- Node.js 18.x
- npm or Yarn
- MySQL 8.0
- Redis 7.0
- Docker and Docker Compose (recommended)

### Local Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/student-admissions-platform.git
   cd student-admissions-platform
   ```

3. Set up the development environment using Docker:
   ```bash
   # Start the development environment
   docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
   ```

   Or manually:
   ```bash
   # Backend setup
   cd src/backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate
   php artisan db:seed
   php artisan serve

   # Frontend setup
   cd src/web
   npm install
   npm start
   ```

4. Run the setup script to initialize the development environment:
   ```bash
   ./scripts/setup-dev-environment.sh
   ```

## Coding Standards

### PHP (Laravel)

- Follow PSR-12 coding standards
- Use Laravel's conventions for controllers, models, and services
- Document all methods and classes with PHPDoc comments
- Use type hints and return types

### JavaScript/TypeScript (React)

- Follow the Airbnb JavaScript Style Guide
- Use TypeScript for all new components and features
- Use functional components with hooks instead of class components
- Document components with JSDoc comments

### CSS/SCSS

- Use the BEM (Block Element Modifier) methodology
- Prefer component-scoped styles
- Follow the project's design system

We use automated tools to enforce coding standards:

- PHP_CodeSniffer for PHP
- ESLint for JavaScript/TypeScript
- Prettier for code formatting

Run linting before submitting a PR:

```bash
# Backend
cd src/backend
composer lint

# Frontend
cd src/web
npm run lint
```

## Branching Strategy

We follow a simplified Git flow branching model:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Urgent fixes for production

Always create new branches from `develop` for features and bug fixes:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

For hotfixes to production:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/your-hotfix-name
```

## Commit Message Guidelines

We follow the Conventional Commits specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

Examples:
```
feat(applications): add document upload progress indicator
fix(auth): resolve issue with password reset tokens
docs: update API documentation for workflow endpoints
```

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation as necessary
3. Include tests for new features or bug fixes
4. Ensure all tests pass locally
5. Create a pull request against the `develop` branch (or `main` for hotfixes)
6. Fill out the pull request template completely
7. Request review from at least one maintainer
8. Address any feedback from reviewers

Pull requests will be merged once they:
- Pass all automated checks (CI/CD pipeline)
- Receive approval from at least one maintainer
- Meet the project's quality standards

## Testing Guidelines

All code contributions should include appropriate tests:

### Backend Testing

- Unit tests for services and models
- Feature tests for API endpoints
- Use PHPUnit for testing

```bash
cd src/backend
php artisan test
```

### Frontend Testing

- Unit tests for utilities and hooks
- Component tests for React components
- Use Jest and React Testing Library

```bash
cd src/web
npm test
```

### End-to-End Testing

- Use Cypress for critical user flows

```bash
cd src/web
npm run cypress:open
```

Ensure test coverage meets the project's requirements:
- Backend: Minimum 80% code coverage
- Frontend: Minimum 75% code coverage for components and utilities

## Documentation

Documentation is a crucial part of the project. Please update documentation when making changes:

- Update API documentation when changing endpoints
- Update component documentation for frontend changes
- Add or update user guides for new features
- Document complex algorithms or business logic

Documentation is located in the `docs/` directory and organized by topic.

## Issue Reporting

When reporting issues, please use the appropriate issue template and provide:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots or logs if applicable
- Environment information

For security vulnerabilities, please do not open a public issue. Instead, email security@example.com with details about the vulnerability.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license. See the [LICENSE](../LICENSE) file for details.