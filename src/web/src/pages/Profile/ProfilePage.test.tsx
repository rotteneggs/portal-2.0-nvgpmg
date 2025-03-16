import React from 'react'; // react v18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import { act } from '@testing-library/react'; // @testing-library/react v14.0.0
import ProfilePage from './ProfilePage'; // src/web/src/pages/Profile/ProfilePage.tsx
import { renderWithProviders, mockFetch, waitForComponentToPaint } from '../../utils/testUtils'; // src/web/src/utils/testUtils.ts
import { AuthContext } from '../../contexts/AuthContext'; // src/web/src/contexts/AuthContext.tsx
import { User } from '../../types/user'; // src/web/src/types/user.ts
import userService from '../../services/UserService'; // src/web/src/services/UserService.ts

// Mock the userService methods
jest.mock('../../services/UserService'); // userService v
const mockUpdateUserProfile = jest.mocked(userService.updateUserProfile);
const mockUploadUserProfilePicture = jest.mocked(userService.uploadUserProfilePicture);
const mockDeleteUserProfilePicture = jest.mocked(userService.deleteUserProfilePicture);

// Mock user data for testing
const mockUser: User = {
  id: 1,
  email: 'john.doe@example.com',
  email_verified_at: '2023-01-01T00:00:00Z',
  is_active: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  last_login_at: '2023-01-01T00:00:00Z',
  has_mfa_enabled: false,
  roles: [
    {
      id: 1,
      name: 'student',
      description: 'Student role',
      is_system_role: true,
      permissions: [],
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
  permissions: ['profile.view', 'profile.edit'],
  profile: {
    id: 1,
    user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: '1990-01-01',
    phone_number: '123-456-7890',
    address_line1: '123 Main St',
    address_line2: 'Apt 4B',
    city: 'Anytown',
    state: 'CA',
    postal_code: '12345',
    country: 'USA',
    notification_preferences: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    full_name: 'John Doe',
    formatted_address: '123 Main St, Apt 4B, Anytown, CA 12345, USA'
  },
  profile_picture_url: null,
};

const updatedMockUser: User = {
    ...mockUser,
    profile: {
        ...mockUser.profile,
        first_name: 'UpdatedFirstName',
        last_name: 'UpdatedLastName',
    },
};

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUpdateUserProfile.mockResolvedValue(updatedMockUser);
    mockUploadUserProfilePicture.mockResolvedValue({ success: true, profile_picture_url: 'https://example.com/profile.jpg' });
    mockDeleteUserProfilePicture.mockResolvedValue({ success: true, message: 'Profile picture deleted' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderProfilePage = (mockUser: User) => {
    const renderResult = renderWithProviders(<ProfilePage />, {
      preloadedState: {},
      wrapper: ({ children }) => (
        <AuthContext.Provider value={{
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null,
          requiresMfa: false,
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          verifyMfaCode: jest.fn()
        }}>
          {children}
        </AuthContext.Provider>
      ),
    });
    return renderResult;
  };

  it('renders loading state initially', () => {
    const { container } = renderWithProviders(<ProfilePage />, {
      preloadedState: {},
      wrapper: ({ children }) => (
        <AuthContext.Provider value={{
          isAuthenticated: true,
          user: mockUser,
          loading: true,
          error: null,
          requiresMfa: false,
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          verifyMfaCode: jest.fn()
        }}>
          {children}
        </AuthContext.Provider>
      ),
    });
    expect(container.querySelector('[data-testid="loading-skeleton-rectangular"]')).toBeInTheDocument();
  });

  it('renders personal information form with user data', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    expect(screen.getByLabelText('First Name')).toHaveValue('John');
    expect(screen.getByLabelText('Last Name')).toHaveValue('Doe');
  });

  it('renders contact details form with user data', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    fireEvent.click(screen.getByText('Contact Details'));
    expect(screen.getByLabelText('Phone Number')).toHaveValue('123-456-7890');
    expect(screen.getByLabelText('Address Line 1')).toHaveValue('123 Main St');
  });

  it('renders account information section with user data', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    fireEvent.click(screen.getByText('Account Information'));
    expect(screen.getByText(`Email Address: ${mockUser.email}`)).toBeInTheDocument();
  });

  it('submits personal information form successfully', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'UpdatedFirstName' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'UpdatedLastName' } });
    fireEvent.click(screen.getByText('Update Personal Information'));
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
  });

  it('shows validation errors when form is invalid', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Update Personal Information'));
    await waitFor(() => expect(screen.getByText('First name is required')).toBeInTheDocument());
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  it('handles profile picture upload successfully', async () => {
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    const input = screen.getByLabelText('Change Profile Picture');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockUploadUserProfilePicture).toHaveBeenCalledWith(file));
    expect(screen.getByText('Profile picture updated successfully')).toBeInTheDocument();
  });

  it('handles profile picture deletion successfully', async () => {
    const userWithPicture: User = {
      ...mockUser,
      profile_picture_url: 'https://example.com/profile.jpg',
    };
    renderProfilePage(userWithPicture);
    await waitForComponentToPaint();
    fireEvent.click(screen.getByText('Delete Profile Picture'));
    await waitFor(() => expect(mockDeleteUserProfilePicture).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Profile picture deleted successfully')).toBeInTheDocument();
  });

  it('handles error during form submission', async () => {
    mockUpdateUserProfile.mockRejectedValue(new Error('Update failed'));
    renderProfilePage(mockUser);
    await waitForComponentToPaint();
    fireEvent.click(screen.getByText('Update Personal Information'));
    await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
  });
});