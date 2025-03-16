import React from 'react'; // react v18.2.0
import { Box, Typography, Paper } from '@mui/material'; // @mui/material v5.11.10
import SecurityIcon from '@mui/icons-material/Security'; // @mui/icons-material v5.11.10

import AdminLayout from '../../layouts/AdminLayout';
import RolePermissionManager from '../../components/Admin/RolePermissionManager';
import { Breadcrumbs, BreadcrumbItem } from '../../components/Common';

/**
 * @constant breadcrumbs
 * @type {BreadcrumbItem[]}
 * @purpose Define breadcrumb navigation items for the page
 */
const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Admin', path: '/admin' },
  { label: 'Roles & Permissions', path: '/admin/roles-permissions' }
];

/**
 * @function RolesPermissionsPage
 * @description Admin page component for managing roles and permissions
 * @returns {JSX.Element} Rendered page component
 */
const RolesPermissionsPage: React.FC = () => {
  return (
    <AdminLayout title="Roles & Permissions">
      {/* Render page header with title and description */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 1, fontSize: 36 }} color="primary" />
        <Box>
          <Typography variant="h4" component="h1">
            Roles & Permissions
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Manage user roles, permissions, and access controls
          </Typography>
        </Box>
      </Box>

      {/* Render Breadcrumbs component for navigation */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Render RolePermissionManager component inside a Paper container */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <RolePermissionManager />
      </Paper>
    </AdminLayout>
  );
};

export default RolesPermissionsPage;