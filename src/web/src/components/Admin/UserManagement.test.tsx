import React from 'react'; // React v18.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event ^14.0.0
import UserManagement from './UserManagement';
import { renderWithProviders, mockFetch, waitForComponentToPaint } from '../../utils/testUtils';
import UserService from '../../services/UserService';

// Mock the UserService module
jest.mock('../../services/UserService');

/**
 * Sets up the UserService mock with default implementations
 * @returns Mocked UserService instance
 */
const setupUserServiceMock = () => {
  // Create mock implementations for all UserService methods
  const mockedUserService = {
    getUsersList: jest.fn(),
    searchForUsers: jest.fn(),
    createNewUser: jest.fn(),
    updateExistingUser: jest.fn(),
    deleteExistingUser: jest.fn(),
    syncUserRoles: jest.fn(),
    activateUserAccount: jest.fn(),
    deactivateUserAccount: jest.fn(),
	getUsersStatistics: jest.fn()
  };

  // Set up getUsersList to return mock user data
  (UserService as jest.Mock).mockImplementation(() => mockedUserService);

  // Set up searchForUsers to return filtered mock user data
  mockedUserService.searchForUsers.mockImplementation((searchTerm: string, params: any) => {
    const mockUsers = generateMockUsers(5);
    const filteredUsers = mockUsers.filter(user =>
      user.email.includes(searchTerm) || user.profile?.first_name.includes(searchTerm) || user.profile?.last_name.includes(searchTerm)
    );
    return Promise.resolve({ data: filteredUsers });
  });

  // Set up createNewUser to return a new mock user
  mockedUserService.createNewUser.mockImplementation((userData: any) => {
    const mockUsers = generateMockUsers(5);
    const newUser = { id: mockUsers.length + 1, ...userData };
    return Promise.resolve(newUser);
  });

  // Set up updateExistingUser to return updated mock user
  mockedUserService.updateExistingUser.mockImplementation((userId: number, userData: any) => {
    const mockUsers = generateMockUsers(5);
    const updatedUser = { id: userId, ...mockUsers[0], ...userData };
    return Promise.resolve(updatedUser);
  });

  // Set up deleteExistingUser to return success response
  mockedUserService.deleteExistingUser.mockImplementation((userId: number) => {
    return Promise.resolve({ success: true, message: 'User deleted successfully' });
  });

  // Set up syncUserRoles to return user with updated roles
  mockedUserService.syncUserRoles.mockImplementation((userId: number, roles: string[]) => {
    const mockUsers = generateMockUsers(5);
    const updatedUser = { id: userId, ...mockUsers[0], roles: roles.map(role => ({ id: 1, name: role })) };
    return Promise.resolve(updatedUser);
  });

  // Set up activateUserAccount to return user with active status
  mockedUserService.activateUserAccount.mockImplementation((userId: number) => {
    const mockUsers = generateMockUsers(5);
    const updatedUser = { id: userId, ...mockUsers[0], is_active: true };
    return Promise.resolve(updatedUser);
  });

  // Set up deactivateUserAccount to return user with inactive status
  mockedUserService.deactivateUserAccount.mockImplementation((userId: number) => {
    const mockUsers = generateMockUsers(5);
    const updatedUser = { id: userId, ...mockUsers[0], is_active: false };
    return Promise.resolve(updatedUser);
  });
  
  // Set up getUsersStatistics to return mock statistics
  mockedUserService.getUsersStatistics.mockImplementation(() => {
	  return Promise.resolve({
		  roleStats: { admin: 1, student: 4 },
		  activeStats: { active: 3, inactive: 2 },
		  verificationStats: { verified: 4, unverified: 1 },
		  registrationTrend: { '2024-05-01': 1, '2024-05-02': 2 }
	  });
  });

  return mockedUserService;
};

/**
 * Generates an array of mock users for testing
 * @param number count
 * @returns Array of mock user objects
 */
const generateMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    email: `test${i + 1}@example.com`,
    email_verified_at: '2023-05-03T00:00:00.000Z',
    is_active: true,
    created_at: '2023-05-01T00:00:00.000Z',
    updated_at: '2023-05-02T00:00:00.000Z',
    last_login_at: '2023-05-02T12:00:00.000Z',
    has_mfa_enabled: false,
    roles: [{ id: 1, name: 'student' }],
    permissions: [],
    profile: {
      id: i + 1,
      user_id: i + 1,
      first_name: `Test${i + 1}`,
      last_name: 'User',
      date_of_birth: '1990-01-01',
      phone_number: '123-456-7890',
      address_line1: '123 Main St',
      address_line2: null,
      city: 'Anytown',
      state: 'CA',
      postal_code: '12345',
      country: 'USA',
      notification_preferences: null,
      created_at: '2023-05-01T00:00:00.000Z',
      updated_at: '2023-05-02T00:00:00.000Z'
    },
    profile_picture_url: null
  }));
};

describe('UserManagement Component', () => {
  let userServiceMock: any;

  beforeEach(() => {
    userServiceMock = setupUserServiceMock();
    userServiceMock.getUsersList.mockResolvedValue({ data: generateMockUsers(5) });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render user list', async () => {
    renderWithProviders(<UserManagement />);
    await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test1 User')).toBeInTheDocument();
  });

  it('should open create user modal', async () => {
    renderWithProviders(<UserManagement />);
    const addUserButton = await screen.findByText('Add User');
    fireEvent.click(addUserButton);
    expect(screen.getByText('Create New User')).toBeInTheDocument();
  });

  it('should create a new user', async () => {
    renderWithProviders(<UserManagement />);
    const addUserButton = await screen.findByText('Add User');
    fireEvent.click(addUserButton);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123!' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(userServiceMock.createNewUser).toHaveBeenCalled();
    });
    expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
  });

  it('should open edit user modal', async () => {
    renderWithProviders(<UserManagement />);
    await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const editUserButton = await screen.findAllByTitle('Edit User');
    fireEvent.click(editUserButton[0]);
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('should update an existing user', async () => {
    renderWithProviders(<UserManagement />);
    await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const editUserButton = await screen.findAllByTitle('Edit User');
    fireEvent.click(editUserButton[0]);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'updated@example.com' } });
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userServiceMock.updateExistingUser).toHaveBeenCalled();
    });
    expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
  });

  it('should open delete user modal', async () => {
    renderWithProviders(<UserManagement />);
     await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const deleteUserButton = await screen.findAllByTitle('Delete User');
    fireEvent.click(deleteUserButton[0]);
    expect(screen.getByText('Delete User')).toBeInTheDocument();
  });

  it('should delete a user', async () => {
    renderWithProviders(<UserManagement />);
     await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const deleteUserButton = await screen.findAllByTitle('Delete User');
    fireEvent.click(deleteUserButton[0]);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(userServiceMock.deleteExistingUser).toHaveBeenCalled();
    });
    expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
  });

  it('should open roles management modal', async () => {
    renderWithProviders(<UserManagement />);
     await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const manageRolesButton = await screen.findAllByTitle('Manage Roles');
    fireEvent.click(manageRolesButton[0]);
    expect(screen.getByText('Manage User Roles')).toBeInTheDocument();
  });

  it('should update user roles', async () => {
    renderWithProviders(<UserManagement />);
     await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const manageRolesButton = await screen.findAllByTitle('Manage Roles');
    fireEvent.click(manageRolesButton[0]);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(userServiceMock.syncUserRoles).toHaveBeenCalled();
    });
    expect(screen.queryByText('Manage User Roles')).not.toBeInTheDocument();
  });

  it('should toggle user status', async () => {
    renderWithProviders(<UserManagement />);
     await waitFor(() => {
      expect(userServiceMock.getUsersList).toHaveBeenCalled();
    });
    const toggleStatusButton = await screen.findAllByTitle('Deactivate User');
    fireEvent.click(toggleStatusButton[0]);

    await waitFor(() => {
      expect(userServiceMock.deactivateUserAccount).toHaveBeenCalled();
    });
  });
  
  it('should perform user search', async () => {
	  renderWithProviders(<UserManagement />);
	  
	  const searchInput = screen.getByPlaceholderText('Search users...');
	  fireEvent.change(searchInput, { target: { value: 'test1@example.com' } });
	  
	  const searchButton = screen.getByRole('button', { name: /search/i });
	  fireEvent.click(searchButton);
	  
	  await waitFor(() => {
		  expect(userServiceMock.searchForUsers).toHaveBeenCalledWith(
			  'test1@example.com',
			  expect.anything()
		  );
	  });
	  
	  expect(screen.getByText('test1@example.com')).toBeInTheDocument();
  });
});