import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import EmailIcon from '@mui/icons-material/Email';
import PaymentIcon from '@mui/icons-material/Payment';

import { useAuthContext } from '../../contexts/AuthContext';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { hasRole } from '../../utils/permissionUtils';
import { colors } from '../../styles/variables';

/**
 * Interface for mobile navigation item configuration
 */
interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  requiredRoles: string[];
}

// Styled components for the mobile navigation
const StyledPaper = styled(Paper)(() => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  width: '100%',
  elevation: 3
}));

const StyledBottomNavigation = styled(BottomNavigation)(() => ({
  height: '60px',
  width: '100%'
}));

const StyledBottomNavigationAction = styled(BottomNavigationAction)(() => ({
  color: colors.neutralMedium,
  '&.Mui-selected': {
    color: colors.primary
  },
  padding: '6px 12px 8px',
  minWidth: 0
}));

// Navigation items for the mobile navigation
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    requiresAuth: true,
    requiredRoles: []
  },
  {
    label: 'Applications',
    path: '/applications',
    icon: <DescriptionIcon />,
    requiresAuth: true,
    requiredRoles: []
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: <FolderIcon />,
    requiresAuth: true,
    requiredRoles: []
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: <EmailIcon />,
    requiresAuth: true,
    requiredRoles: []
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: <PaymentIcon />,
    requiresAuth: true,
    requiredRoles: []
  }
];

/**
 * Mobile navigation component that displays at the bottom of the screen on small devices
 * Provides easy access to key application features with visual feedback for the active route
 * and notification badges for unread messages.
 * 
 * @returns Rendered mobile navigation component
 */
const MobileNavigation: React.FC = () => {
  // Get authentication state and user data from AuthContext
  const { isAuthenticated, user } = useAuthContext();
  
  // Get unread notification count from NotificationContext
  const { unreadCount } = useNotificationContext();
  
  // Get current location to determine active route
  const location = useLocation();
  
  // Filter navigation items based on authentication status and roles
  const availableNavItems = NAVIGATION_ITEMS.filter(item => {
    // If item requires auth and user is not authenticated, don't show it
    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }
    
    // If item requires specific roles, check if user has any of them
    if (item.requiredRoles.length > 0 && user) {
      return item.requiredRoles.some(role => hasRole(user, role));
    }
    
    return true;
  });
  
  // Determine which navigation item is active based on current path
  const currentValue = (() => {
    const path = location.pathname;
    
    // Check if current path starts with any of the navigation item paths
    const matchingItem = availableNavItems.find(item => 
      path === item.path || 
      (path.startsWith(item.path) && item.path !== '/dashboard')
    );
    
    return matchingItem ? matchingItem.path : '/dashboard';
  })();
  
  return (
    <StyledPaper elevation={3} square aria-label="Mobile navigation">
      <StyledBottomNavigation 
        value={currentValue}
        showLabels
      >
        {availableNavItems.map((item) => (
          <StyledBottomNavigationAction
            key={item.path}
            label={item.label}
            value={item.path}
            icon={
              item.path === '/messages' && unreadCount > 0 ? (
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                  aria-label={`${unreadCount} unread messages`}
                >
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )
            }
            component={Link}
            to={item.path}
            aria-current={currentValue === item.path ? 'page' : undefined}
          />
        ))}
      </StyledBottomNavigation>
    </StyledPaper>
  );
};

export default MobileNavigation;