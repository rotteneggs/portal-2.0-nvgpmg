import React, { useState, useEffect, useCallback, useMemo } from 'react'; // React v18.0.0
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
} from '@mui/material'; // Material-UI v5.0.0
import AddIcon from '@mui/icons-material/Add'; // Material-UI Icons v5.0.0
import EditIcon from '@mui/icons-material/Edit'; // Material-UI Icons v5.0.0
import DeleteIcon from '@mui/icons-material/Delete'; // Material-UI Icons v5.0.0
import PersonIcon from '@mui/icons-material/Person'; // Material-UI Icons v5.0.0
import SecurityIcon from '@mui/icons-material/Security'; // Material-UI Icons v5.0.0
import BlockIcon from '@mui/icons-material/Block'; // Material-UI Icons v5.0.0
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Material-UI Icons v5.0.0
import SearchIcon from '@mui/icons-material/Search'; // Material-UI Icons v5.0.0
import FilterListIcon from '@mui/icons-material/FilterList'; // Material-UI Icons v5.0.0

import Table from '../Common/Table';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Checkbox from '../Common/Checkbox';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import EmptyState from '../Common/EmptyState';
import useNotification from '../../hooks/useNotification';
import UserService from '../../services/UserService';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  Role,
} from '../../types/user';
import { SortDirection } from '../../types/common';

/**
 * Main component for user management in the admin interface
 */
const UserManagement: React.FC = () => {
  // State for users data, loading state, pagination, sorting, and filters
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('email');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.ASC);
  const [filters, setFilters] = useState<UserFilters>({});

  // State for modals (create, edit, delete, roles)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  // State for selected user and form data
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>({
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
    roles: [],
    is_active: true,
  });

  // State for search term
  const [searchTerm, setSearchTerm] = useState('');

  // Notification hook for displaying success/error messages
  const { displaySuccess, displayError } = useNotification();

  // UserService instance
  const userService = useMemo(() => new UserService(), []);

  /**
   * Function to load users with pagination, sorting, and filtering
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        per_page: rowsPerPage,
        sort_by: sortBy,
        sort_direction: sortDirection,
        ...filters,
      };
      const response = await userService.getUsersList(params);
      setUsers(response.data);
    } catch (error: any) {
      displayError(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, sortBy, sortDirection, filters, userService, displayError]);

  /**
   * Function to search users by term
   */
  const searchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        per_page: rowsPerPage,
        sort_by: sortBy,
        sort_direction: sortDirection,
        ...filters,
      };
      const response = await userService.searchForUsers(searchTerm, params);
      setUsers(response.data);
    } catch (error: any) {
      displayError(`Failed to search users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, sortBy, sortDirection, filters, searchTerm, userService, displayError]);

  /**
   * Function to handle sort order
   */
  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDirection(direction);
  };

  /**
   * Function for pagination
   */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  /**
   * Function for rows per page
   */
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  /**
   * Function for filtering users
   */
  const handleFilterChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  /**
   * Function for search input
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  /**
   * Function for search form submission
   */
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    searchUsers();
  };

  /**
   * Function to open create user modal
   */
  const openCreateModal = () => {
    setFormData({
      email: '',
      password: '',
      password_confirmation: '',
      first_name: '',
      last_name: '',
      roles: [],
      is_active: true,
    });
    setCreateModalOpen(true);
  };

  /**
   * Function to close create user modal
   */
  const closeCreateModal = () => {
    setCreateModalOpen(false);
  };

  /**
   * Function to submit new user data
   */
  const handleCreateUser = async () => {
    try {
      await userService.createNewUser(formData as CreateUserRequest);
      displaySuccess('User created successfully');
      closeCreateModal();
      fetchUsers();
    } catch (error: any) {
      displayError(`Failed to create user: ${error.message}`);
    }
  };

  /**
   * Function to open edit user modal with selected user data
   */
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      roles: user.roles.map((role) => role.name),
      is_active: user.is_active,
    });
    setEditModalOpen(true);
  };

  /**
   * Function to close edit user modal
   */
  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  /**
   * Function to submit updated user data
   */
  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.updateExistingUser(selectedUser.id, formData as UpdateUserRequest);
      displaySuccess('User updated successfully');
      closeEditModal();
      fetchUsers();
    } catch (error: any) {
      displayError(`Failed to update user: ${error.message}`);
    }
  };

  /**
   * Function to open delete confirmation modal
   */
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  /**
   * Function to close delete confirmation modal
   */
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedUser(null);
  };

  /**
   * Function to delete selected user
   */
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await userService.deleteExistingUser(selectedUser.id);
      displaySuccess('User deleted successfully');
      closeDeleteModal();
      fetchUsers();
    } catch (error: any) {
      displayError(`Failed to delete user: ${error.message}`);
    }
  };

  /**
   * Function to open roles management modal
   */
  const openRolesModal = (user: User) => {
    setSelectedUser(user);
    setRolesModalOpen(true);
  };

  /**
   * Function to close roles management modal
   */
  const closeRolesModal = () => {
    setRolesModalOpen(false);
    setSelectedUser(null);
  };

  /**
   * Function to toggle role selection
   */
  const handleRoleChange = (roleName: string, checked: boolean) => {
    setFormData((prevData: any) => ({
      ...prevData,
      roles: checked
        ? [...prevData.roles, roleName]
        : prevData.roles.filter((role: string) => role !== roleName),
    }));
  };

  /**
   * Function to save user roles
   */
  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    try {
      await userService.syncUserRoles(selectedUser.id, formData.roles as string[]);
      displaySuccess('User roles updated successfully');
      closeRolesModal();
      fetchUsers();
    } catch (error: any) {
      displayError(`Failed to update user roles: ${error.message}`);
    }
  };

  /**
   * Function to activate/deactivate users
   */
  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.is_active) {
        await userService.deactivateUserAccount(user.id);
        displaySuccess('User deactivated successfully');
      } else {
        await userService.activateUserAccount(user.id);
        displaySuccess('User activated successfully');
      }
      fetchUsers();
    } catch (error: any) {
      displayError(`Failed to toggle user status: ${error.message}`);
    }
  };

  // Fetch users on component mount and when dependencies change
  useEffect(() => {
    if (searchTerm) {
      searchUsers();
    } else {
      fetchUsers();
    }
  }, [fetchUsers, searchUsers, searchTerm]);

  // Define table columns with appropriate cell renderers for user data
  const columns = useMemo(() => [
    {
      id: 'email',
      label: 'Email',
      sortable: true,
      render: (value: string) => <Typography>{value}</Typography>,
    },
    {
      id: 'name',
      label: 'Name',
      sortable: false,
      render: (value: any, row: User) => (
        <Typography>{row.profile ? `${row.profile.first_name} ${row.profile.last_name}` : 'N/A'}</Typography>
      ),
    },
    {
      id: 'roles',
      label: 'Roles',
      sortable: false,
      render: (value: any, row: User) => (
        <Box>
          {row.roles.map((role) => (
            <Chip key={role.id} label={role.name} sx={{ mr: 1 }} />
          ))}
        </Box>
      ),
    },
    {
      id: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <Chip label={value ? 'Active' : 'Inactive'} color={value ? 'success' : 'error'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      render: (value: any, row: User) => (
        <Box>
          <Tooltip title="Edit User">
            <IconButton onClick={() => openEditModal(row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Manage Roles">
            <IconButton onClick={() => openRolesModal(row)}>
              <SecurityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.is_active ? 'Deactivate User' : 'Activate User'}>
            <IconButton onClick={() => handleToggleUserStatus(row)}>
              {row.is_active ? <BlockIcon /> : <CheckCircleIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User">
            <IconButton onClick={() => openDeleteModal(row)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [openEditModal, openRolesModal, openDeleteModal, handleToggleUserStatus]);

  return (
    <Box>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">User Management</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                size="small"
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  endAdornment: (
                    <IconButton type="submit">
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </form>
            <Tooltip title="Add User">
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateModal}>
                Add User
              </Button>
            </Tooltip>
          </Box>
        </Box>
        <Divider />
        {users.length > 0 ? (
          <Table
            data={users}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            pagination={{ page, per_page: rowsPerPage }}
            totalCount={users.length} // Replace with actual total count from API
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            loading={loading}
          />
        ) : (
          <EmptyState message="No users found." />
        )}
      </Paper>

      {/* Create User Modal */}
      <Modal open={createModalOpen} onClose={closeCreateModal} title="Create New User">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              value={(formData as CreateUserRequest).first_name || ''}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last Name"
              value={(formData as CreateUserRequest).last_name || ''}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={(formData as CreateUserRequest).email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Password"
              type="password"
              value={(formData as CreateUserRequest).password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Confirm Password"
              type="password"
              value={(formData as CreateUserRequest).password_confirmation || ''}
              onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
              fullWidth
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={closeCreateModal}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser}>
            Create
          </Button>
        </Box>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editModalOpen} onClose={closeEditModal} title="Edit User">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={(formData as UpdateUserRequest).email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={(formData as UpdateUserRequest).is_active || false}
                  onChange={(e, checked) => setFormData({ ...formData, is_active: checked })}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={closeEditModal}>Cancel</Button>
          <Button variant="contained" onClick={handleEditUser}>
            Save
          </Button>
        </Box>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={closeDeleteModal} title="Delete User">
        <Typography>Are you sure you want to delete this user?</Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={closeDeleteModal}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            Delete
          </Button>
        </Box>
      </Modal>

      {/* Roles Management Modal */}
      <Modal open={rolesModalOpen} onClose={closeRolesModal} title="Manage User Roles">
        <Grid container spacing={2}>
          {selectedUser &&
            selectedUser.roles.map((role) => (
              <Grid item xs={12} key={role.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={(formData as any).roles?.includes(role.name) || false}
                      onChange={(e, checked) => handleRoleChange(role.name, checked)}
                    />
                  }
                  label={role.name}
                />
              </Grid>
            ))}
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={closeRolesModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRoles}>
            Save
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default UserManagement;