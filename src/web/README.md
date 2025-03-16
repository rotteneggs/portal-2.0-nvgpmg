# Student Admissions Enrollment Platform - Frontend

This repository contains the frontend application for the Student Admissions Enrollment Platform, a comprehensive digital solution designed to streamline and enhance the entire student admissions lifecycle. The frontend is built with React, TypeScript, and Material-UI to provide a responsive and accessible user interface.

## Technology Stack

- **React 18**: Core UI library with hooks and functional components
- **TypeScript 4.9+**: Type safety and improved developer experience
- **Redux Toolkit**: State management with simplified Redux setup
- **React Router 6**: Client-side routing
- **Material-UI 5**: UI component library following Material Design guidelines
- **React Query**: Data fetching, caching, and state management for API calls
- **Axios**: HTTP client for API requests
- **React Flow**: Interactive components for the WYSIWYG workflow editor
- **Chart.js**: Data visualization for analytics dashboards
- **Formik & Yup**: Form handling and validation
- **Jest & React Testing Library**: Unit and integration testing
- **Cypress**: End-to-end testing

## Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Docker and Docker Compose (optional, for containerized development)

## Getting Started

### Local Development Setup

1. Clone the repository
```bash
git clone [repository-url]
cd src/web
```

2. Install dependencies
```bash
npm ci
```

3. Set up environment variables
```bash
cp .env.development.example .env.development.local
```
Edit `.env.development.local` with your local configuration.

4. Start the development server
```bash
npm start
```
The application will be available at http://localhost:3000.

### Docker Development Setup

1. Build and start the container
```bash
docker-compose -f docker-compose.yml up -d
```
The application will be available at http://localhost:3000.

## Available Scripts

- `npm start`: Start the development server
- `npm run build`: Build the application for production
- `npm test`: Run unit and integration tests
- `npm run test:coverage`: Run tests with coverage report
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Check for linting issues
- `npm run lint:fix`: Fix linting issues automatically
- `npm run format`: Format code using Prettier
- `npm run cypress:open`: Open Cypress test runner
- `npm run cypress:run`: Run Cypress tests headlessly

## Project Structure

```
src/
├── api/            # API client and service functions
├── components/     # Reusable UI components
│   ├── Admin/      # Admin-specific components
│   ├── AIAssistant/ # AI-related components
│   ├── Applications/ # Application form components
│   ├── AppShell/   # Layout components
│   ├── Auth/       # Authentication components
│   ├── Common/     # Shared UI components
│   ├── Dashboard/  # Dashboard components
│   ├── Documents/  # Document management components
│   ├── FinancialAid/ # Financial aid components
│   ├── Messages/   # Messaging components
│   ├── Payments/   # Payment processing components
│   └── WorkflowEditor/ # Workflow editor components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── layouts/        # Page layout components
├── pages/          # Page components
├── redux/          # Redux state management
│   └── slices/     # Redux Toolkit slices
├── services/       # Business logic services
├── styles/         # Global styles and themes
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── App.tsx         # Main application component
└── index.tsx       # Application entry point
```

## Architecture Overview

The frontend application follows a modular architecture with clear separation of concerns:

- **Components**: Reusable UI components organized by feature domain
- **Pages**: Top-level components that represent routes in the application
- **Layouts**: Wrapper components that provide consistent page structure
- **Contexts**: React context providers for global state that doesn't fit in Redux
- **Redux**: Global state management using Redux Toolkit
- **Services**: Business logic and API interaction
- **Hooks**: Reusable logic extracted into custom hooks
- **Utils**: Pure utility functions

The application uses a combination of global state management (Redux) and local component state, with React Query for server state management.

## State Management

The application uses a hybrid state management approach:

- **Redux**: Global application state (authentication, user data, UI state)
- **React Query**: Server state management (data fetching, caching, synchronization)
- **Context API**: Theme settings, feature flags, and localization
- **Local Component State**: Form inputs, UI interactions, and component-specific state

## Routing

Routing is handled by React Router v6 with the following route categories:

- **Public Routes**: Accessible without authentication (login, register, etc.)
- **Protected Routes**: Require authentication (dashboard, applications, etc.)
- **Admin Routes**: Require admin role (workflow editor, user management, etc.)

The routing configuration is centralized in `App.tsx`.

## Testing Strategy

The application employs a comprehensive testing strategy:

- **Unit Tests**: Testing individual components and functions using Jest and React Testing Library
- **Integration Tests**: Testing component interactions and service integrations
- **End-to-End Tests**: Testing complete user flows using Cypress

Test files are co-located with the components they test, with the `.test.tsx` or `.test.ts` extension for Jest tests and `.cy.ts` extension for Cypress tests.

## Code Style and Linting

The project uses ESLint and Prettier for code quality and formatting:

- ESLint with TypeScript support for static code analysis
- Prettier for consistent code formatting
- Husky and lint-staged for pre-commit hooks

Follow the existing code style and run linting before committing changes:
```bash
npm run lint
npm run format
```

## Building for Production

To build the application for production:

```bash
npm run build
```

This creates an optimized production build in the `build` directory.

For Docker-based deployment:

```bash
docker build -t admissions-platform-frontend:latest .
```

This builds a production-ready Docker image using the multi-stage Dockerfile.

## Environment Configuration

The application supports different environment configurations:

- `.env.development`: Development environment variables
- `.env.test`: Test environment variables
- `.env.production`: Production environment variables

Environment-specific variables should be prefixed with `REACT_APP_` to be accessible in the application.

## Accessibility

The application is designed to meet WCAG 2.1 AA compliance standards. Key accessibility features include:

- Semantic HTML structure
- Keyboard navigation support
- ARIA attributes for screen readers
- Sufficient color contrast
- Focus management

All new components should be tested for accessibility compliance.

## Browser Support

The application supports the following browsers:

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers: iOS Safari and Android Chrome (latest versions)

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure linting passes: `npm run lint`
5. Submit a pull request

Please follow the existing code style and include appropriate tests for new features.

## License

This project is licensed under the terms specified in the LICENSE file at the root of the repository.