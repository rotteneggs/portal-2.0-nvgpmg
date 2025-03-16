import React, { createContext, useContext, ReactNode } from 'react'; // react v18.x
import useAuth from '../hooks/useAuth';
import { User, LoginRequest, RegisterRequest, MfaVerifyRequest } from '../types/auth';

/**
 * Type definition for authentication context value
 */
interface AuthContextType {
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
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * React context for authentication state and functions
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider component that makes authentication available to child components
 * This component wraps the application and provides authentication state and
 * functionality to all child components through the React context API.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Use the useAuth hook to get authentication state and functions
  const {
    isAuthenticated,
    user,
    loading,
    error,
    requiresMfa,
    login,
    register,
    logout,
    verifyMfaCode
  } = useAuth();

  // Create the context value object
  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    error,
    requiresMfa,
    login,
    register,
    logout,
    verifyMfaCode
  };

  // Provide the authentication context to children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access the authentication context
 * This hook provides a convenient way for components to access the authentication
 * state and functions from the AuthContext.
 * 
 * @throws Error if used outside of an AuthProvider
 * @returns The authentication context value
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  // Ensure the hook is used within an AuthProvider
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};