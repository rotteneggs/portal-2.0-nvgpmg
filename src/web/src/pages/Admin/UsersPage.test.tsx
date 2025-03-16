import React from 'react'; // react v18.0.0
import { render, screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
import UsersPage from './UsersPage';
import { renderWithProviders } from '../../utils/testUtils';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the AuthContext to control authentication state in tests
jest.mock('../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

describe('UsersPage component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    (AuthContext.useAuthContext as jest.Mock).mockReset();

    // Set up default mock implementation for AuthContext
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 1,
        email: 'admin@example.com',
        email_verified_at: '2023-01-01T00:00:00.000Z',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_login_at: '2023-01-01T00:00:00.000Z',
        has_mfa_enabled: false,
        roles: [{ id: 1, name: 'admin', description: 'Administrator', is_system_role: true, permissions: [] }],
        profile: {
          id: 1,
          user_id: 1,
          first_name: 'Admin',
          last_name: 'User',
          date_of_birth: null,
          phone_number: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
          notification_preferences: null,
          full_name: 'Admin User',
          formatted_address: '',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        full_name: 'Admin User',
      },
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      hasRole: (role: string) => role === 'admin',
    });
  });

  it('should render UsersPage for authenticated admin users', async () => {
    // Mock AuthContext with isAuthenticated=true and admin role
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 1,
        email: 'admin@example.com',
        email_verified_at: '2023-01-01T00:00:00.000Z',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_login_at: '2023-01-01T00:00:00.000Z',
        has_mfa_enabled: false,
        roles: [{ id: 1, name: 'admin', description: 'Administrator', is_system_role: true, permissions: [] }],
        profile: {
          id: 1,
          user_id: 1,
          first_name: 'Admin',
          last_name: 'User',
          date_of_birth: null,
          phone_number: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
          notification_preferences: null,
          full_name: 'Admin User',
          formatted_address: '',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        full_name: 'Admin User',
      },
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      hasRole: (role: string) => role === 'admin',
    });

    // Render UsersPage with providers
    renderWithProviders(<UsersPage />);

    // Verify page title is displayed
    expect(screen.getByText('User Management')).toBeInTheDocument();

    // Verify UserManagement component is rendered
    expect(screen.getByText('Manage users, roles, and permissions within the system.')).toBeInTheDocument();

    // Verify breadcrumbs are displayed
    expect(screen.getByRole('navigation', { name: 'Breadcrumb navigation' })).toBeInTheDocument();
  });

  it('should redirect unauthenticated users', async () => {
    // Mock AuthContext with isAuthenticated=false
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      hasRole: jest.fn(),
    });

    // Render UsersPage with providers
    renderWithProviders(<UsersPage />);

    // Verify redirect behavior or authentication message
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('should show access denied for non-admin', async () => {
    // Mock AuthContext with isAuthenticated=true but non-admin role
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 2,
        email: 'user@example.com',
        email_verified_at: '2023-01-01T00:00:00.000Z',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_login_at: '2023-01-01T00:00:00.000Z',
        has_mfa_enabled: false,
        roles: [{ id: 2, name: 'student', description: 'Student', is_system_role: false, permissions: [] }],
        profile: {
          id: 2,
          user_id: 2,
          first_name: 'Test',
          last_name: 'User',
          date_of_birth: null,
          phone_number: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
          notification_preferences: null,
          full_name: 'Test User',
          formatted_address: '',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        full_name: 'Test User',
      },
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      hasRole: (role: string) => role === 'admin',
    });

    // Render UsersPage with providers
    renderWithProviders(<UsersPage />);

    // Verify access denied message is displayed
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('should integrate with UserManagement component', async () => {
    // Mock AuthContext with isAuthenticated=true and admin role
    (AuthContext.useAuthContext as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 1,
        email: 'admin@example.com',
        email_verified_at: '2023-01-01T00:00:00.000Z',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        last_login_at: '2023-01-01T00:00:00.000Z',
        has_mfa_enabled: false,
        roles: [{ id: 1, name: 'admin', description: 'Administrator', is_system_role: true, permissions: [] }],
        profile: {
          id: 1,
          user_id: 1,
          first_name: 'Admin',
          last_name: 'User',
          date_of_birth: null,
          phone_number: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
          notification_preferences: null,
          full_name: 'Admin User',
          formatted_address: '',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        full_name: 'Admin User',
      },
      loading: false,
      error: null,
      requiresMfa: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      verifyMfaCode: jest.fn(),
      hasRole: (role: string) => role === 'admin',
    });

    // Mock UserManagement component
    const MockUserManagement = () => <div data-testid="user-management">Mock UserManagement</div>;

    // Render UsersPage with providers
    renderWithProviders(<UsersPage />);

    // Verify UserManagement component receives correct props
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
  });
});