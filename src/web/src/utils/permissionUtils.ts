import { User, Role, Permission } from '../types/auth';

/**
 * Configuration for route access control
 */
interface RouteConfig {
  /**
   * Array of permissions required to access the route
   */
  requiredPermissions?: Array<{ action: string; resource: string }>;
  
  /**
   * Array of role names required to access the route
   */
  requiredRoles?: string[];
}

/**
 * Check if a user has permission to perform a specific action on a resource
 * 
 * @param user - The user to check permissions for
 * @param action - The action to check (e.g., 'view', 'create', 'update', 'delete')
 * @param resource - The resource to check (e.g., 'applications', 'documents')
 * @returns True if the user has the permission, false otherwise
 */
export const hasPermission = (
  user: User | null,
  action: string,
  resource: string
): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  // Check if any of the user's roles has the permission
  return user.roles.some((role) => {
    if (!role.permissions || role.permissions.length === 0) {
      return false;
    }
    
    return role.permissions.some(
      (permission) => 
        permission.resource === resource && 
        permission.action === action
    );
  });
};

/**
 * Check if a user has a specific role
 * 
 * @param user - The user to check roles for
 * @param roleName - The name of the role to check
 * @returns True if the user has the role, false otherwise
 */
export const hasRole = (
  user: User | null,
  roleName: string
): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  return user.roles.some((role) => role.name === roleName);
};

/**
 * Check if a user has any of the specified roles
 * 
 * @param user - The user to check roles for
 * @param roleNames - Array of role names to check
 * @returns True if the user has any of the roles, false otherwise
 */
export const hasAnyRole = (
  user: User | null,
  roleNames: string[]
): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  return user.roles.some((role) => roleNames.includes(role.name));
};

/**
 * Check if a user has all of the specified roles
 * 
 * @param user - The user to check roles for
 * @param roleNames - Array of role names to check
 * @returns True if the user has all of the roles, false otherwise
 */
export const hasAllRoles = (
  user: User | null,
  roleNames: string[]
): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  const userRoleNames = user.roles.map((role) => role.name);
  return roleNames.every((roleName) => userRoleNames.includes(roleName));
};

/**
 * Get all permissions assigned to a user through their roles
 * 
 * @param user - The user to get permissions for
 * @returns Array of unique permissions
 */
export const getAllPermissions = (
  user: User | null
): Permission[] => {
  if (!user || !user.roles || user.roles.length === 0) {
    return [];
  }

  // Gather all permissions from all roles
  const allPermissions: Permission[] = [];
  
  user.roles.forEach((role) => {
    if (role.permissions && role.permissions.length > 0) {
      allPermissions.push(...role.permissions);
    }
  });

  // Remove duplicates by creating a unique key for each permission
  const uniquePermissions: Record<string, Permission> = {};
  
  allPermissions.forEach((permission) => {
    const key = `${permission.resource}:${permission.action}`;
    uniquePermissions[key] = permission;
  });
  
  return Object.values(uniquePermissions);
};

/**
 * Check if a user can access a specific route based on required permissions or roles
 * 
 * @param user - The user to check access for
 * @param routeConfig - Configuration object with required permissions or roles
 * @returns True if the user can access the route, false otherwise
 */
export const canAccessRoute = (
  user: User | null,
  routeConfig: RouteConfig
): boolean => {
  // If no permissions or roles are required, the route is public
  if (
    (!routeConfig.requiredPermissions || routeConfig.requiredPermissions.length === 0) &&
    (!routeConfig.requiredRoles || routeConfig.requiredRoles.length === 0)
  ) {
    return true;
  }

  // If user is not authenticated, deny access to protected routes
  if (!user) {
    return false;
  }

  // Check if user has any of the required permissions
  if (routeConfig.requiredPermissions && routeConfig.requiredPermissions.length > 0) {
    const hasRequiredPermission = routeConfig.requiredPermissions.some(
      (permission) => hasPermission(user, permission.action, permission.resource)
    );
    
    if (hasRequiredPermission) {
      return true;
    }
  }

  // Check if user has any of the required roles
  if (routeConfig.requiredRoles && routeConfig.requiredRoles.length > 0) {
    return hasAnyRole(user, routeConfig.requiredRoles);
  }

  // If we get here, user does not have any of the required permissions or roles
  return false;
};