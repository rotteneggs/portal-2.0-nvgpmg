import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import HelpIcon from '@mui/icons-material/Help';

import { useAuthContext } from '../../contexts/AuthContext';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Button } from '../Common';
import { colors, spacing } from '../../styles/variables';
import { flexBetween } from '../../styles/mixins';

// Path to the institution logo
const LOGO_PATH = '/assets/logo.png';

// Props interface for the Header component
interface HeaderProps {
  title: string;
  onSidebarToggle: () => void;
  showSidebarToggle?: boolean;
}

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: colors.white,
  color: colors.neutralDark,
  boxShadow: 'none',
  borderBottom: `1px solid ${colors.neutralLight}`,
  zIndex: theme.zIndex.drawer + 1,
}));

const LogoContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginRight: spacing.md,
});

const Logo = styled('img')({
  height: '40px',
  marginRight: spacing.sm,
});

const ActionButtons = styled(Box)({
  ...flexBetween,
  marginLeft: 'auto',
});

const UserInfo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: spacing.md,
});

const NotificationMenu = styled(Menu)({
  '& .MuiMenu-paper': {
    width: '320px',
    maxHeight: '400px',
    padding: spacing.sm,
  },
});

const UserMenu = styled(Menu)({
  '& .MuiMenu-paper': {
    width: '200px',
    padding: spacing.sm,
  },
});

/**
 * Header component that provides navigation, branding, and user account access
 */
const Header: React.FC<HeaderProps> = ({ 
  title, 
  onSidebarToggle,
  showSidebarToggle = true
}) => {
  // Get authentication state and user data
  const { isAuthenticated, user, logout } = useAuthContext();
  
  // Get notification count
  const { unreadCount, fetchUnreadCount } = useNotificationContext();
  
  // State for menus
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchorEl, setNotificationMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  // Navigation hook
  const navigate = useNavigate();
  
  // Theme and responsive behavior
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Handle user menu open/close functions
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };
  
  // Handle notifications menu open/close functions
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchorEl(event.currentTarget);
    fetchUnreadCount(); // Refresh count when opening menu
  };
  
  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchorEl(null);
  };
  
  // Handle logout function
  const handleLogout = async () => {
    await logout();
    handleUserMenuClose();
    navigate('/login');
  };
  
  // Fetch unread notification count on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);
  
  return (
    <StyledAppBar position="fixed">
      <Toolbar>
        {/* Sidebar toggle button - conditionally shown */}
        {showSidebarToggle && (
          <IconButton
            color="inherit"
            aria-label="open sidebar"
            edge="start"
            onClick={onSidebarToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        
        {/* Logo and title */}
        <LogoContainer>
          <Link to="/">
            <Logo src={LOGO_PATH} alt="Institution Logo" />
          </Link>
          
          <Typography
            variant="h6"
            component="h1"
            sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}
          >
            {title}
          </Typography>
        </LogoContainer>
        
        {/* Action buttons */}
        <ActionButtons>
          {/* Help button */}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<HelpIcon />}
            sx={{ marginRight: spacing.md, display: { xs: 'none', md: 'flex' } }}
            onClick={() => navigate('/help')}
          >
            Help
          </Button>
          
          {/* Only show these if user is authenticated */}
          {isAuthenticated && (
            <>
              {/* Notifications button */}
              <IconButton
                color="inherit"
                aria-label="notifications"
                onClick={handleNotificationMenuOpen}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              
              {/* User profile button */}
              <UserInfo>
                <IconButton
                  color="inherit"
                  aria-label="user menu"
                  onClick={handleUserMenuOpen}
                  size="large"
                  edge="end"
                >
                  <AccountCircleIcon />
                </IconButton>
                <Typography
                  variant="body2"
                  sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}
                >
                  {user?.full_name || user?.email}
                </Typography>
              </UserInfo>
            </>
          )}
          
          {/* Show login button if not authenticated */}
          {!isAuthenticated && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          )}
        </ActionButtons>
        
        {/* Notification Menu */}
        <NotificationMenu
          id="notifications-menu"
          anchorEl={notificationMenuAnchorEl}
          open={Boolean(notificationMenuAnchorEl)}
          onClose={handleNotificationMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Typography variant="h6" sx={{ p: 1 }}>
            Notifications
          </Typography>
          
          {/* Show notifications or empty state */}
          {unreadCount === 0 ? (
            <MenuItem disabled>No new notifications</MenuItem>
          ) : (
            <MenuItem onClick={() => navigate('/notifications')}>
              <Typography variant="body2">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Typography>
            </MenuItem>
          )}
          
          <MenuItem onClick={() => navigate('/notifications')}>
            <Typography variant="body2" color="primary">
              View all notifications
            </Typography>
          </MenuItem>
        </NotificationMenu>
        
        {/* User Menu */}
        <UserMenu
          id="user-menu"
          anchorEl={userMenuAnchorEl}
          open={Boolean(userMenuAnchorEl)}
          onClose={handleUserMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => {
            handleUserMenuClose();
            navigate('/profile');
          }}>
            Profile
          </MenuItem>
          
          <MenuItem onClick={() => {
            handleUserMenuClose();
            navigate('/settings');
          }}>
            Settings
          </MenuItem>
          
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </UserMenu>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;