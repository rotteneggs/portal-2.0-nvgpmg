import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  FormControlLabel,
} from '@mui/material'; // Material-UI v5.11.10
import AddIcon from '@mui/icons-material/Add'; // Material-UI Icons v5.11.10
import EditIcon from '@mui/icons-material/Edit'; // Material-UI Icons v5.11.10
import DeleteIcon from '@mui/icons-material/Delete'; // Material-UI Icons v5.11.10
import PersonIcon from '@mui/icons-material/Person'; // Material-UI Icons v5.11.10
import SecurityIcon from '@mui/icons-material/Security'; // Material-UI Icons v5.11.10
import BlockIcon from '@mui/icons-material/Block'; // Material-UI Icons v5.11.10
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Material-UI Icons v5.11.10
import SearchIcon from '@mui/icons-material/Search'; // Material-UI Icons v5.11.10
import FilterListIcon from '@mui/icons-material/FilterList'; // Material-UI Icons v5.11.10
import AdminLayout from '../../layouts/AdminLayout';
import UserManagement from '../../components/Admin/UserManagement';
import Breadcrumbs from '../../components/Common/Breadcrumbs';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * Admin page component for user management
 * @returns Rendered users page component
 */
const UsersPage: React.FC = () => {
  // LD1: Get authentication context using useAuthContext hook
  const { isAuthenticated, hasRole } = useAuthContext();

  // LD1: Check if user is authenticated and has admin role
  if (!isAuthenticated || !hasRole('admin')) {
    return <Typography>Unauthorized</Typography>; // Or redirect to login
  }

  // LD1: Define breadcrumb items for navigation
  const breadcrumbItems = [
    { label: 'Admin', path: '/admin' },
    { label: 'Users', path: '/admin/users' },
  ];

  // LD1: Render AdminLayout with appropriate title
  return (
    <AdminLayout title="User Management">
      {/* LD1: Render Breadcrumbs component for navigation context */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* LD1: Render page title and description */}
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body1" paragraph>
        Manage users, roles, and permissions within the system.
      </Typography>

      {/* LD1: Render UserManagement component for user management functionality */}
      <UserManagement />
    </AdminLayout>
  );
};

// IE3: Export the UsersPage component as the default export
export default UsersPage;