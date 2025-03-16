import { useState, useEffect, useCallback } from 'react'; // react v18.x
import AuthService from '../services/AuthService';
import { User, LoginRequest, RegisterRequest, MfaVerifyRequest } from '../types/auth';
import { getToken } from '../utils/storageUtils';

/**
 * Return type for the useAuth hook
 */
interface AuthHookReturn {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  requiresMfa: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (userData: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  verifyMfaCode: (data: MfaVerifyRequest) => Promise<User>;
}

/**
 * Custom hook that provides authentication functionality for the Student Admissions Enrollment Platform.
 * Encapsulates authentication state management and operations, making them easily accessible
 * to components throughout the application.
 * 
 * @returns Object containing authentication state and methods
 */
const useAuth = (): AuthHookReturn => {
  // Initialize AuthService instance
  const authService = new AuthService();
  
  // Set up state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresMfa, setRequiresMfa] = useState<boolean>(false);
  
  /**
   * Authenticates a user with email and password
   * @param credentials - Login credentials (email, password, remember)
   * @returns Promise resolving to the authenticated user
   */
  const login = useCallback(async (credentials: LoginRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await authService.login(credentials);
      
      // Check if MFA is required
      if (authService.requiresMfa) {
        setRequiresMfa(true);
      } else {
        setUser(user);
      }
      
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Registers a new user account
   * @param userData - Registration data (email, password, name, etc.)
   * @returns Promise resolving to the registered user
   */
  const register = useCallback(async (userData: RegisterRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await authService.register(userData);
      setUser(user);
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Logs out the current user
   * @returns Promise resolving when logout is complete
   */
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.logout();
      setUser(null);
      setRequiresMfa(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during logout';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Verifies a multi-factor authentication code
   * @param data - MFA verification data (email, method, code)
   * @returns Promise resolving to the authenticated user
   */
  const verifyMfaCode = useCallback(async (data: MfaVerifyRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await authService.verifyMfa(data);
      setUser(user);
      setRequiresMfa(false);
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during MFA verification';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // If token exists, try to get current user
        const user = await authService.getCurrentUser();
        setUser(user);
      } catch (error) {
        // Token might be invalid or expired
        setError('Authentication failed. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  return {
    isAuthenticated: !!user,
    user,
    loading,
    error,
    requiresMfa,
    login,
    register,
    logout,
    verifyMfaCode
  };
};

export default useAuth;