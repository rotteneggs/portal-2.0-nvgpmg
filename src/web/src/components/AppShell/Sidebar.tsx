import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Tooltip,
  Divider,
  IconButton,
  Box,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

import { useAuthContext } from '../../contexts/AuthContext';
import { hasRole, hasAnyRole } from '../../utils/permissionUtils';
import { colors, spacing, transitions } from '../../styles/variables';
import { hideOnMobile } from '../../styles/mixins';

// Constants
const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

// Navigation items configuration
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
  {
    label: 'Applications',
    path: '/applications',
    icon: <DescriptionIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: <FolderIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: <EmailIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
  {
    label: 'Payments',
    path: '/payments',
    icon: <PaymentIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
  {
    label: 'Financial Aid',
    path: '/financial-aid',
    icon: <AccountBalanceIcon />,
    requiresAuth: true,
    requiredRoles: [],
  },
];

// Admin navigation items configuration
const ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Users',
    path: '/admin/users',
    icon: <PeopleIcon />,
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
  {
    label: 'Workflows',
    path: '/admin/workflows',
    icon: <SettingsIcon />,
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
  {
    label: 'Reports',
    path: '/admin/reports',
    icon: <DescriptionIcon />,
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: <SettingsIcon />,
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
];

// Interfaces
interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  requiredRoles: string[];
}

// Styled components
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
    transition: transitions.default,
    overflowX: 'hidden',
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutralLight}`,
  },
}));

const DrawerHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: spacing.sm,
  minHeight: '56px',
});

const NavList = styled(List)({
  padding: `${spacing.sm} 0`,
});

const NavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open, selected }) => ({
  minHeight: 48,
  padding: spacing.sm,
  justifyContent: open ? 'initial' : 'center',
  borderLeft: selected ? `4px solid ${colors.primary}` : '4px solid transparent',
  '&:hover': {
    backgroundColor: colors.neutralLight,
  },
  '&.Mui-selected': {
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
  },
}));

const NavItemIcon = styled(ListItemIcon)({
  minWidth: 0,
  marginRight: 'auto',
  justifyContent: 'center',
  color: colors.neutralMedium,
  '.Mui-selected &': {
    color: colors.primary,
  },
});

const NavItemText = styled(ListItemText, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ open }) => ({
  opacity: open ? 1 : 0,
  transition: transitions.default,
  marginLeft: spacing.sm,
  '& .MuiTypography-root': {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
}));

const SectionDivider = styled(Divider)({
  margin: `${spacing.md} 0`,
});

const SectionTitle = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ open }) => ({
  padding: `${spacing.sm} ${spacing.md}`,
  color: colors.neutralMedium,
  fontSize: '0.75rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  opacity: open ? 1 : 0,
  transition: transitions.default,
  overflow: 'hidden',
}));

/**
 * Sidebar navigation component that provides access to key application features
 * The sidebar adapts to different screen sizes, supports collapsed/expanded states,
 * and displays navigation options based on user roles.
 */
const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const location = useLocation();
  const theme = useTheme();
  const { isAuthenticated, user } = useAuthContext();
  
  // Filter navigation items based on authentication and roles
  const filteredNavItems = NAVIGATION_ITEMS.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.requiredRoles.length > 0 && !hasAnyRole(user, item.requiredRoles)) return false;
    return true;
  });
  
  // Check if user has admin access
  const hasAdminAccess = user && hasAnyRole(user, ['admin']);
  
  // Filter admin navigation items
  const filteredAdminItems = ADMIN_NAVIGATION_ITEMS.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.requiredRoles.length > 0 && !hasAnyRole(user, item.requiredRoles)) return false;
    return true;
  });
  
  return (
    <StyledDrawer
      variant="permanent"
      open={open}
      sx={{
        ...(!open && {
          [theme.breakpoints.down('md')]: {
            display: 'none',
          },
        }),
      }}
      aria-label="Main navigation"
    >
      <DrawerHeader>
        <IconButton 
          onClick={onToggle} 
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          edge="start"
        >
          {theme.direction === 'rtl' ? (
            open ? <ChevronRightIcon /> : <ChevronLeftIcon />
          ) : (
            open ? <ChevronLeftIcon /> : <ChevronRightIcon />
          )}
        </IconButton>
      </DrawerHeader>
      
      <Divider />
      
      <NavList role="navigation" aria-label="Main menu">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <Tooltip
              key={item.path}
              title={open ? '' : item.label}
              placement="right"
              arrow
              disableHoverListener={open}
              disableFocusListener={open}
              disableTouchListener={open}
            >
              <NavItem
                component={NavLink}
                to={item.path}
                selected={isActive}
                open={open}
                aria-current={isActive ? 'page' : undefined}
              >
                <NavItemIcon>{item.icon}</NavItemIcon>
                <NavItemText
                  primary={item.label}
                  open={open}
                />
              </NavItem>
            </Tooltip>
          );
        })}
      </NavList>
      
      {hasAdminAccess && filteredAdminItems.length > 0 && (
        <>
          <SectionDivider />
          
          <SectionTitle open={open}>
            Administration
          </SectionTitle>
          
          <NavList role="navigation" aria-label="Administration menu">
            {filteredAdminItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              
              return (
                <Tooltip
                  key={item.path}
                  title={open ? '' : item.label}
                  placement="right"
                  arrow
                  disableHoverListener={open}
                  disableFocusListener={open}
                  disableTouchListener={open}
                >
                  <NavItem
                    component={NavLink}
                    to={item.path}
                    selected={isActive}
                    open={open}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <NavItemIcon>{item.icon}</NavItemIcon>
                    <NavItemText
                      primary={item.label}
                      open={open}
                    />
                  </NavItem>
                </Tooltip>
              );
            })}
          </NavList>
        </>
      )}
    </StyledDrawer>
  );
};

export default Sidebar;