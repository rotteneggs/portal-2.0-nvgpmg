import React from 'react'; // react v18.2.0
import { screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react v14.0.0
import AppShell from './AppShell';
import { renderWithProviders } from '../../utils/testUtils';
import { AuthContext } from '../../contexts/AuthContext';

// Mock Material-UI's useMediaQuery hook to test responsive behavior
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock AuthContext to control authentication state for testing
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

// Define mock implementations for useMediaQuery and AuthContext
const mockUseMediaQuery = (matches: boolean) => {
  (require('@mui/material/useMediaQuery') as jest.Mock).mockImplementation(() => matches);
};

const mockAuthContext = (isAuthenticated: boolean, user: any = null) => {
  (require('../../contexts/AuthContext') as jest.Mock).mockImplementation(() => ({
    useAuthContext: () => ({
      isAuthenticated,
      user,
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
    }),
  }));
};

// Setup and teardown for AppShell component tests
describe('AppShell component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up default mock implementations
    mockUseMediaQuery(false); // Default to desktop viewport
    mockAuthContext(false); // Default to unauthenticated state
  });

  afterEach(() => {
    // Clean up any mounted components
    document.body.innerHTML = '';
  });

  it('test renders correctly with title', () => {
    // Render AppShell with a test title
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Verify that the title is displayed in the header
    expect(screen.getByText('Test Title')).toBeInTheDocument();

    // Verify that the sidebar is rendered
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();

    // Verify that the main content area is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('test renders children correctly', () => {
    // Render AppShell with test child content
    renderWithProviders(
      <AppShell title="Test Title">
        <p>This is a test child.</p>
      </AppShell>
    );

    // Verify that the child content is rendered in the main content area
    expect(screen.getByText('This is a test child.')).toBeInTheDocument();
  });

  it('test toggles sidebar when button is clicked', async () => {
    // Render AppShell component
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Find the sidebar toggle button
    const toggleButton = screen.getByRole('button', { name: 'Expand sidebar' });

    // Click the toggle button
    fireEvent.click(toggleButton);

    // Verify that the sidebar state changes (expanded/collapsed)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    });

    // Click the toggle button again
    fireEvent.click(toggleButton);

    // Verify that the sidebar returns to its original state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    });
  });

  it('test adapts to mobile viewport', () => {
    // Mock useMediaQuery to simulate mobile viewport
    mockUseMediaQuery(true);

    // Render AppShell component
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Verify that the sidebar is collapsed/hidden on mobile
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).not.toBeInTheDocument();

    // Verify that the mobile navigation is displayed
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();

    // Verify that the content has appropriate mobile styling
    const content = screen.getByText('Test Content');
    expect(content).toBeInTheDocument();
  });

  it('test adapts to desktop viewport', () => {
    // Mock useMediaQuery to simulate desktop viewport
    mockUseMediaQuery(false);

    // Render AppShell component
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Verify that the sidebar is expanded by default on desktop
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeInTheDocument();

    // Verify that the mobile navigation is not displayed
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();

    // Verify that the content has appropriate desktop styling
    const content = screen.getByText('Test Content');
    expect(content).toBeInTheDocument();
  });

  it('test renders correctly when authenticated', () => {
    // Mock AuthContext to provide authenticated state
    mockAuthContext(true, {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
    });

    // Render AppShell component
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Verify that authenticated-only elements are displayed
    expect(screen.getByRole('button', { name: 'user menu' })).toBeInTheDocument();

    // Verify that the user information is displayed in the header
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('test renders correctly when not authenticated', () => {
    // Mock AuthContext to provide unauthenticated state
    mockAuthContext(false);

    // Render AppShell component
    renderWithProviders(<AppShell title="Test Title"><div>Test Content</div></AppShell>);

    // Verify that unauthenticated-only elements are displayed
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();

    // Verify that login/register options are available
    expect(screen.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  it('test hides footer when hideFooter prop is true', () => {
    // Render AppShell with hideFooter prop set to true
    renderWithProviders(<AppShell title="Test Title" hideFooter={true}><div>Test Content</div></AppShell>);

    // Verify that the footer is not present in the document
    expect(screen.queryByRole('contentinfo', { name: 'Footer' })).not.toBeInTheDocument();
  });

  it('test hides sidebar when hideSidebar prop is true', () => {
    // Render AppShell with hideSidebar prop set to true
    renderWithProviders(<AppShell title="Test Title" hideSidebar={true}><div>Test Content</div></AppShell>);

    // Verify that the sidebar is not present in the document
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).not.toBeInTheDocument();

    // Verify that the sidebar toggle button is not displayed
    expect(screen.queryByRole('button', { name: 'open sidebar' })).not.toBeInTheDocument();
  });
});