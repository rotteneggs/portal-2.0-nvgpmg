import {
  User,
  UpdateProfileRequest,
  UpdateNotificationPreferencesRequest,
  ChangePasswordRequest,
  UserFilters,
  UserListResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserStatistics
} from '../types/user';
import { ApiQueryParams } from '../types/api';
import {
  getCurrentUser,
  updateProfile,
  updateNotificationPreferences,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture,
  checkEmailAvailability,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  assignRole,
  removeRole,
  syncRoles,
  activateUser,
  deactivateUser,
  getUserPermissions,
  getUserStatistics,
  bulkCreateUsers,
  bulkUpdateUsers,
  bulkDeleteUsers,
  getUserActivityLogs
} from '../api/users';

/**
 * Service class that provides user management functionality for the Student Admissions Enrollment Platform.
 * This class encapsulates user-related operations such as profile management, notification 
 * preferences, and administrative user management.
 */
class UserService {
  /**
   * The current authenticated user, or null if not authenticated
   */
  public currentUser: User | null = null;

  /**
   * Initializes the UserService
   */
  constructor() {
    this.currentUser = null;
  }

  /**
   * Fetches the current user's profile
   * @returns Promise resolving to user profile data
   */
  async fetchCurrentUser(): Promise<User> {
    const user = await getCurrentUser();
    this.currentUser = user;
    return user;
  }

  /**
   * Updates the current user's profile information
   * @param profileData - Profile data to update
   * @returns Promise resolving to updated user data
   */
  async updateUserProfile(profileData: UpdateProfileRequest): Promise<User> {
    const updatedUser = await updateProfile(profileData);
    this.currentUser = updatedUser;
    return updatedUser;
  }

  /**
   * Updates the current user's notification preferences
   * @param preferences - Notification preferences to update
   * @returns Promise resolving to updated user data
   */
  async updateUserNotificationPreferences(
    preferences: UpdateNotificationPreferencesRequest
  ): Promise<User> {
    const updatedUser = await updateNotificationPreferences(preferences);
    this.currentUser = updatedUser;
    return updatedUser;
  }

  /**
   * Changes the current user's password
   * @param passwordData - Object containing current and new password
   * @returns Promise resolving to success status and message
   */
  async changeUserPassword(
    passwordData: ChangePasswordRequest
  ): Promise<{ success: boolean; message: string }> {
    return await changePassword(passwordData);
  }

  /**
   * Uploads a profile picture for the current user
   * @param file - The image file to upload
   * @returns Promise resolving to success status and the URL of the uploaded picture
   */
  async uploadUserProfilePicture(
    file: File
  ): Promise<{ success: boolean; profile_picture_url: string }> {
    const result = await uploadProfilePicture(file);
    
    // Update current user's profile picture URL if available
    if (result.success && this.currentUser) {
      this.currentUser.profile_picture_url = result.profile_picture_url;
    }
    
    return result;
  }

  /**
   * Deletes the current user's profile picture
   * @returns Promise resolving to success status and message
   */
  async deleteUserProfilePicture(): Promise<{ success: boolean; message: string }> {
    const result = await deleteProfilePicture();
    
    // Clear profile picture URL in current user if successful
    if (result.success && this.currentUser) {
      this.currentUser.profile_picture_url = null;
    }
    
    return result;
  }

  /**
   * Checks if an email address is available for registration
   * @param email - Email address to check
   * @returns Promise resolving to availability status
   */
  async checkIfEmailIsAvailable(email: string): Promise<{ available: boolean }> {
    return await checkEmailAvailability(email);
  }

  /**
   * Gets a paginated list of users (admin only)
   * @param params - Query parameters for filtering, pagination, and sorting
   * @returns Promise resolving to paginated list of users
   */
  async getUsersList(
    params: ApiQueryParams & UserFilters = {}
  ): Promise<UserListResponse> {
    return await getUsers(params);
  }

  /**
   * Gets a specific user by ID (admin only)
   * @param userId - The ID of the user to retrieve
   * @returns Promise resolving to the user data
   */
  async getUserById(userId: number): Promise<User> {
    return await getUser(userId);
  }

  /**
   * Creates a new user (admin only)
   * @param userData - The user data to create
   * @returns Promise resolving to the created user data
   */
  async createNewUser(userData: CreateUserRequest): Promise<User> {
    return await createUser(userData);
  }

  /**
   * Updates a user (admin only)
   * @param userId - The ID of the user to update
   * @param userData - The user data to update
   * @returns Promise resolving to the updated user data
   */
  async updateExistingUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    return await updateUser(userId, userData);
  }

  /**
   * Deletes a user (admin only)
   * @param userId - The ID of the user to delete
   * @returns Promise resolving to success status and message
   */
  async deleteExistingUser(userId: number): Promise<{ success: boolean; message: string }> {
    return await deleteUser(userId);
  }

  /**
   * Searches for users by name, email, or other criteria (admin only)
   * @param searchTerm - The search term to query
   * @param params - Additional query parameters for filtering, pagination, and sorting
   * @returns Promise resolving to paginated search results
   */
  async searchForUsers(
    searchTerm: string,
    params: ApiQueryParams & UserFilters = {}
  ): Promise<UserListResponse> {
    return await searchUsers(searchTerm, params);
  }

  /**
   * Assigns a role to a user (admin only)
   * @param userId - The ID of the user
   * @param roleName - The name of the role to assign
   * @returns Promise resolving to the updated user data
   */
  async assignRoleToUser(userId: number, roleName: string): Promise<User> {
    return await assignRole(userId, roleName);
  }

  /**
   * Removes a role from a user (admin only)
   * @param userId - The ID of the user
   * @param roleName - The name of the role to remove
   * @returns Promise resolving to the updated user data
   */
  async removeRoleFromUser(userId: number, roleName: string): Promise<User> {
    return await removeRole(userId, roleName);
  }

  /**
   * Syncs a user's roles with the provided roles (admin only)
   * @param userId - The ID of the user
   * @param roleNames - Array of role names to assign to the user
   * @returns Promise resolving to the updated user data
   */
  async syncUserRoles(userId: number, roleNames: string[]): Promise<User> {
    return await syncRoles(userId, roleNames);
  }

  /**
   * Activates a user account (admin only)
   * @param userId - The ID of the user to activate
   * @returns Promise resolving to the updated user data
   */
  async activateUserAccount(userId: number): Promise<User> {
    return await activateUser(userId);
  }

  /**
   * Deactivates a user account (admin only)
   * @param userId - The ID of the user to deactivate
   * @returns Promise resolving to the updated user data
   */
  async deactivateUserAccount(userId: number): Promise<User> {
    return await deactivateUser(userId);
  }

  /**
   * Gets all permissions for a user (admin only)
   * @param userId - The ID of the user
   * @returns Promise resolving to array of permission names
   */
  async getUserPermissionsList(userId: number): Promise<string[]> {
    return await getUserPermissions(userId);
  }

  /**
   * Gets user statistics (counts by role, active/inactive) (admin only)
   * @returns Promise resolving to user statistics
   */
  async getUsersStatistics(): Promise<UserStatistics> {
    return await getUserStatistics();
  }

  /**
   * Creates multiple users in bulk (admin only)
   * @param usersData - Array of user data objects to create
   * @returns Promise resolving to bulk creation results
   */
  async bulkCreateNewUsers(
    usersData: CreateUserRequest[]
  ): Promise<{ success: boolean; created: number; errors: any[] }> {
    return await bulkCreateUsers(usersData);
  }

  /**
   * Updates multiple users in bulk (admin only)
   * @param usersData - Array of user data objects with IDs to update
   * @returns Promise resolving to bulk update results
   */
  async bulkUpdateExistingUsers(
    usersData: Array<{ id: number } & UpdateUserRequest>
  ): Promise<{ success: boolean; updated: number; errors: any[] }> {
    return await bulkUpdateUsers(usersData);
  }

  /**
   * Deletes multiple users in bulk (admin only)
   * @param userIds - Array of user IDs to delete
   * @returns Promise resolving to bulk deletion results
   */
  async bulkDeleteExistingUsers(
    userIds: number[]
  ): Promise<{ success: boolean; deleted: number; errors: any[] }> {
    return await bulkDeleteUsers(userIds);
  }

  /**
   * Gets activity logs for a specific user (admin only)
   * @param userId - The ID of the user
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated activity logs
   */
  async getUserActivityHistory(userId: number, params: ApiQueryParams = {}): Promise<any> {
    return await getUserActivityLogs(userId, params);
  }

  /**
   * Clears the current user data from the service
   */
  clearCurrentUser(): void {
    this.currentUser = null;
  }
}

export default UserService;