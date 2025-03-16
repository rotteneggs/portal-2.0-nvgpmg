import React, { useState, useEffect, useCallback } from 'react'; // react ^17.0.0
import { Grid, Box, Typography, Chip, IconButton, Tab, FormControlLabel, Divider } from '@mui/material'; // @mui/material 5.x
import { EditIcon, DeleteIcon, AddIcon, SecurityIcon, FilterListIcon } from '@mui/icons-material'; // @mui/icons-material 5.x
import {
  Card, Button, Table, Modal, TextField, Form, Tabs, LoadingSkeleton, Notification, Checkbox
} from '../Common';
import { Role, Permission } from '../../types/auth';
import adminApi from '../../api/admin';
import { SortDirection, TableColumn } from '../../types/common';
import useNotification from '../../hooks/useNotification';

/**
 * Custom hook to manage the state and logic for the role and permission management component
 */
const useRolePermissionManager = () => {
  // 1. Initialize state for active tab (roles or permissions)
  const [activeTab, setActiveTab] = useState(0); // 0 for roles, 1 for permissions

  // 2. Initialize state for roles, permissions, loading states, and selected items
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // 3. Initialize state for modals (create/edit role, create/edit permission, delete confirmation)
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [createPermissionModalOpen, setCreatePermissionModalOpen] = useState(false);
  const [editPermissionModalOpen, setEditPermissionModalOpen] = useState(false);
  const [deletePermissionModalOpen, setDeletePermissionModalOpen] = useState(false);
  const [rolePermissionsModalOpen, setRolePermissionsModalOpen] = useState(false);

  // Notification hook for displaying success/error messages
  const { displayNotification } = useNotification();

  // 4. Create fetchRoles function to load all roles with their permissions
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const rolesData = await adminApi.getRoles();
      setRoles(rolesData);
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to fetch roles' });
    } finally {
      setLoading(false);
    }
  }, [displayNotification]);

  // 5. Create fetchPermissions function to load all permissions
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const permissionsData = await adminApi.getPermissions();
      setPermissions(permissionsData);
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to fetch permissions' });
    } finally {
      setLoading(false);
    }
  }, [displayNotification]);

  // 6. Create handleCreateRole function to open the create role modal
  const handleCreateRole = () => {
    setCreateRoleModalOpen(true);
  };

  // 7. Create handleEditRole function to open the edit role modal with selected role
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditRoleModalOpen(true);
  };

  // 8. Create handleDeleteRole function to open the delete confirmation modal for roles
  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setDeleteRoleModalOpen(true);
  };

  // 9. Create submitCreateRole function to create a new role
  const submitCreateRole = async (values: { name: string; description: string }) => {
    setLoading(true);
    try {
      await adminApi.createRole({ name: values.name, description: values.description });
      displayNotification({ type: 'success', message: 'Role created successfully' });
      setCreateRoleModalOpen(false);
      await fetchRoles();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to create role' });
    } finally {
      setLoading(false);
    }
  };

  // 10. Create submitEditRole function to update an existing role
  const submitEditRole = async (values: { name: string; description: string }) => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      await adminApi.updateRole(selectedRole.id, { name: values.name, description: values.description });
      displayNotification({ type: 'success', message: 'Role updated successfully' });
      setEditRoleModalOpen(false);
      await fetchRoles();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to update role' });
    } finally {
      setLoading(false);
    }
  };

  // 11. Create confirmDeleteRole function to delete a role
  const confirmDeleteRole = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      await adminApi.deleteRole(selectedRole.id);
      displayNotification({ type: 'success', message: 'Role deleted successfully' });
      setDeleteRoleModalOpen(false);
      await fetchRoles();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to delete role' });
    } finally {
      setLoading(false);
    }
  };

  // 12. Create handleCreatePermission function to open the create permission modal
  const handleCreatePermission = () => {
    setCreatePermissionModalOpen(true);
  };

  // 13. Create handleEditPermission function to open the edit permission modal with selected permission
  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setEditPermissionModalOpen(true);
  };

  // 14. Create handleDeletePermission function to open the delete confirmation modal for permissions
  const handleDeletePermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setDeletePermissionModalOpen(true);
  };

  // 15. Create submitCreatePermission function to create a new permission
  const submitCreatePermission = async (values: { resource: string; action: string; description: string }) => {
    setLoading(true);
    try {
      await adminApi.createPermission({ resource: values.resource, action: values.action, description: values.description });
      displayNotification({ type: 'success', message: 'Permission created successfully' });
      setCreatePermissionModalOpen(false);
      await fetchPermissions();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to create permission' });
    } finally {
      setLoading(false);
    }
  };

  // 16. Create submitEditPermission function to update an existing permission
  const submitEditPermission = async (values: { description: string }) => {
    if (!selectedPermission) return;
    setLoading(true);
    try {
      await adminApi.updatePermission(selectedPermission.id, { description: values.description });
      displayNotification({ type: 'success', message: 'Permission updated successfully' });
      setEditPermissionModalOpen(false);
      await fetchPermissions();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to update permission' });
    } finally {
      setLoading(false);
    }
  };

  // 17. Create confirmDeletePermission function to delete a permission
  const confirmDeletePermission = async () => {
    if (!selectedPermission) return;
    setLoading(true);
    try {
      await adminApi.deletePermission(selectedPermission.id);
      displayNotification({ type: 'success', message: 'Permission deleted successfully' });
      setDeletePermissionModalOpen(false);
      await fetchPermissions();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || 'Failed to delete permission' });
    } finally {
      setLoading(false);
    }
  };

  // 18. Create handleTabChange function to switch between roles and permissions tabs
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // 19. Create handlePermissionToggle function to toggle permissions for a role
  const handlePermissionToggle = (role: Role, permission: Permission, checked: boolean) => {
    setSelectedRole(role);
    setLoading(true);
    if (checked) {
      adminApi.assignRoleToUser(role.id, permission.id)
        .then(() => {
          displayNotification({ type: 'success', message: `Permission "${permission.name}" assigned to role "${role.name}"` });
          fetchRoles();
        })
        .catch((error: any) => {
          displayNotification({ type: 'error', message: error.message || `Failed to assign permission "${permission.name}" to role "${role.name}"` });
        })
        .finally(() => setLoading(false));
    } else {
      adminApi.removeRoleFromUser(role.id, permission.id)
        .then(() => {
          displayNotification({ type: 'success', message: `Permission "${permission.name}" removed from role "${role.name}"` });
          fetchRoles();
        })
        .catch((error: any) => {
          displayNotification({ type: 'error', message: error.message || `Failed to remove permission "${permission.name}" from role "${role.name}"` });
        })
        .finally(() => setLoading(false));
    }
  };

  // 20. Create handleSaveRolePermissions function to save updated permissions for a role
  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      // Extract permission IDs from the selected role
      const permissionIds = selectedRole.permissions.map(permission => permission.id);

      // Update the role with the new permissions
      await adminApi.updateRole(selectedRole.id, { permissions: permissionIds });

      displayNotification({ type: 'success', message: `Permissions updated for role "${selectedRole.name}"` });
      setRolePermissionsModalOpen(false);
      await fetchRoles();
    } catch (error: any) {
      displayNotification({ type: 'error', message: error.message || `Failed to update permissions for role "${selectedRole.name}"` });
    } finally {
      setLoading(false);
    }
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setRolePermissionsModalOpen(true);
  };

  // 21. Load roles and permissions on component mount
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // 22. Return state and handlers for use in the component
  return {
    activeTab,
    roles,
    permissions,
    loading,
    createRoleModalOpen,
    editRoleModalOpen,
    deleteRoleModalOpen,
    createPermissionModalOpen,
    editPermissionModalOpen,
    deletePermissionModalOpen,
    rolePermissionsModalOpen,
    handleCreateRole,
    handleEditRole,
    handleDeleteRole,
    submitCreateRole,
    submitEditRole,
    confirmDeleteRole,
    handleCreatePermission,
    handleEditPermission,
    handleDeletePermission,
    submitCreatePermission,
    submitEditPermission,
    confirmDeletePermission,
    handleTabChange,
    handlePermissionToggle,
    handleSaveRolePermissions,
    handleManagePermissions,
    setRolePermissionsModalOpen
  };
};

/**
 * Component for managing roles and permissions in the admin interface
 */
const RolePermissionManager: React.FC = () => {
  // 1. Use the useRolePermissionManager hook to get state and handlers
  const {
    activeTab,
    roles,
    permissions,
    loading,
    createRoleModalOpen,
    editRoleModalOpen,
    deleteRoleModalOpen,
    createPermissionModalOpen,
    editPermissionModalOpen,
    deletePermissionModalOpen,
    rolePermissionsModalOpen,
    handleCreateRole,
    handleEditRole,
    handleDeleteRole,
    submitCreateRole,
    submitEditRole,
    confirmDeleteRole,
    handleCreatePermission,
    handleEditPermission,
    handleDeletePermission,
    submitCreatePermission,
    submitEditPermission,
    confirmDeletePermission,
    handleTabChange,
    handlePermissionToggle,
    handleSaveRolePermissions,
    handleManagePermissions,
    setRolePermissionsModalOpen
  } = useRolePermissionManager();

  // 2. Render tabs for switching between roles and permissions views
  return (
    <Card title="Role and Permission Management">
      <Tabs value={activeTab} onChange={handleTabChange} tabs={[
        { label: 'Roles', content: null },
        { label: 'Permissions', content: null }
      ]} />

      {/* 3. Render role management interface when roles tab is active */}
      {activeTab === 0 && (
        <RolesTab
          roles={roles}
          loading={loading}
          onCreateRole={handleCreateRole}
          onEditRole={handleEditRole}
          onDeleteRole={handleDeleteRole}
          onManagePermissions={handleManagePermissions}
        />
      )}

      {/* 4. Render permission management interface when permissions tab is active */}
      {activeTab === 1 && (
        <PermissionsTab
          permissions={permissions}
          loading={loading}
          onCreatePermission={handleCreatePermission}
          onEditPermission={handleEditPermission}
          onDeletePermission={handleDeletePermission}
        />
      )}

      {/* 5. Render modals for creating, editing, and deleting roles */}
      <RoleFormModal
        open={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        onSubmit={submitCreateRole}
        isLoading={loading}
        editRole={null}
      />
      <RoleFormModal
        open={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        onSubmit={submitEditRole}
        isLoading={loading}
        editRole={selectedRole}
      />
      <DeleteConfirmationModal
        open={deleteRoleModalOpen}
        onClose={() => setDeleteRoleModalOpen(false)}
        onConfirm={confirmDeleteRole}
        isLoading={loading}
        itemType="role"
        itemName={selectedRole?.name || ''}
      />

      {/* 6. Render modals for creating, editing, and deleting permissions */}
      <PermissionFormModal
        open={createPermissionModalOpen}
        onClose={() => setCreatePermissionModalOpen(false)}
        onSubmit={submitCreatePermission}
        isLoading={loading}
        editPermission={null}
      />
      <PermissionFormModal
        open={editPermissionModalOpen}
        onClose={() => setEditPermissionModalOpen(false)}
        onSubmit={submitEditPermission}
        isLoading={loading}
        editPermission={selectedPermission}
      />
      <DeleteConfirmationModal
        open={deletePermissionModalOpen}
        onClose={() => setDeletePermissionModalOpen(false)}
        onConfirm={confirmDeletePermission}
        isLoading={loading}
        itemType="permission"
        itemName={selectedPermission?.name || ''}
      />

      {/* 7. Render modal for managing role permissions */}
      <RolePermissionsModal
        open={rolePermissionsModalOpen}
        onClose={() => setRolePermissionsModalOpen(false)}
        role={selectedRole}
        allPermissions={permissions}
        onSave={handleSaveRolePermissions}
        isLoading={loading}
      />

      {/* 8. Handle loading states and empty states */}
      {loading && <LoadingSkeleton />}
      {(!loading && roles.length === 0 && activeTab === 0) && <Typography>No roles found.</Typography>}
      {(!loading && permissions.length === 0 && activeTab === 1) && <Typography>No permissions found.</Typography>}
    </Card>
  );
};

export default RolePermissionManager;

interface RolesTabProps {
  roles: Role[];
  loading: boolean;
  onCreateRole: () => void;
  onEditRole: (role: Role) => void;
  onDeleteRole: (role: Role) => void;
  onManagePermissions: (role: Role) => void;
}

/**
 * Component to display and manage roles
 */
const RolesTab: React.FC<RolesTabProps> = ({ roles, loading, onCreateRole, onEditRole, onDeleteRole, onManagePermissions }) => {
  // 1. Define table columns (name, description, permissions count, system role, actions)
  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'description', label: 'Description' },
    {
      id: 'permissions',
      label: 'Permissions',
      render: (permissions: Permission[]) => (
        <Chip label={permissions.length.toString()} size="small" />
      )
    },
    {
      id: 'is_system_role',
      label: 'System Role',
      render: (isSystemRole: boolean) => (isSystemRole ? 'Yes' : 'No')
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (value: any, role: Role) => (
        <>
          <IconButton aria-label="Edit" onClick={() => onEditRole(role)}>
            <EditIcon />
          </IconButton>
          <IconButton aria-label="Delete" onClick={() => onDeleteRole(role)}>
            <DeleteIcon />
          </IconButton>
          <IconButton aria-label="Manage Permissions" onClick={() => onManagePermissions(role)}>
            <SecurityIcon />
          </IconButton>
        </>
      )
    }
  ];

  // 2. Configure column rendering for special types (permissions as chips, system role indicator)

  // 3. Render Table component with columns, data, and handlers
  return (
    <>
      <Table
        columns={columns}
        data={roles}
        loading={loading}
        emptyStateMessage="No roles found."
        onCreate={onCreateRole}
      />
      {/* 4. Render action buttons for each row (edit, delete, manage permissions) */}
      {/* 5. Render create role button */}
      <Button variant="contained" color="primary" onClick={onCreateRole}>
        <AddIcon />
        Create Role
      </Button>
      {/* 6. Handle loading state with LoadingSkeleton */}
      {/* 7. Handle empty state with EmptyState component */}
    </>
  );
};

interface PermissionsTabProps {
  permissions: Permission[];
  loading: boolean;
  onCreatePermission: () => void;
  onEditPermission: (permission: Permission) => void;
  onDeletePermission: (permission: Permission) => void;
}

/**
 * Component to display and manage permissions
 */
const PermissionsTab: React.FC<PermissionsTabProps> = ({ permissions, loading, onCreatePermission, onEditPermission, onDeletePermission }) => {
  // 1. Define table columns (name, resource, action, description, actions)
  const [resourceFilter, setResourceFilter] = useState('');

  const filteredPermissions = useMemo(() => {
    return resourceFilter
      ? permissions.filter(p => p.resource.toLowerCase().includes(resourceFilter.toLowerCase()))
      : permissions;
  }, [permissions, resourceFilter]);

  const columns: TableColumn[] = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'resource', label: 'Resource', sortable: true },
    { id: 'action', label: 'Action', sortable: true },
    { id: 'description', label: 'Description' },
    {
      id: 'actions',
      label: 'Actions',
      render: (value: any, permission: Permission) => (
        <>
          <IconButton aria-label="Edit" onClick={() => onEditPermission(permission)}>
            <EditIcon />
          </IconButton>
          <IconButton aria-label="Delete" onClick={() => onDeletePermission(permission)}>
            <DeleteIcon />
          </IconButton>
        </>
      )
    }
  ];

  // 2. Implement resource filtering for permissions

  // 3. Render Table component with columns, data, and handlers
  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Permissions</Typography>
        <Box display="flex" alignItems="center">
          <TextField
            label="Filter by Resource"
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <FilterListIcon color="action" />,
            }}
          />
          <Button variant="contained" color="primary" onClick={onCreatePermission} style={{ marginLeft: '16px' }}>
            <AddIcon />
            Create Permission
          </Button>
        </Box>
      </Box>
      <Table
        columns={columns}
        data={filteredPermissions}
        loading={loading}
        emptyStateMessage="No permissions found."
        onCreate={onCreatePermission}
      />
      {/* 4. Render action buttons for each row (edit, delete) */}
      {/* 5. Render create permission button */}
      {/* 6. Handle loading state with LoadingSkeleton */}
      {/* 7. Handle empty state with EmptyState component */}
    </>
  );
};

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  editRole: Role | null;
  onSubmit: (values: { name: string; description: string }) => void;
  isLoading: boolean;
}

/**
 * Modal component for creating or editing a role
 */
const RoleFormModal: React.FC<RoleFormModalProps> = ({ open, onClose, editRole, onSubmit, isLoading }) => {
  // 1. Determine if creating new role or editing existing role
  const isEdit = !!editRole;

  // 2. Set up form validation schema for required fields
  // 3. Initialize form with role data if editing, or empty values if creating
  // 4. Render form fields for name and description
  // 5. Display read-only message for system roles
  // 6. Handle form submission and validation
  // 7. Show loading state during submission
  // 8. Provide cancel button to close modal
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Role" : "Create Role"}>
      <Form
        initialValues={{
          name: editRole?.name || '',
          description: editRole?.description || '',
        }}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          await onSubmit(values);
          setSubmitting(false);
        }}
      >
        <TextField
          name="name"
          label="Name"
          required
          disabled={editRole?.is_system_role}
        />
        <TextField
          name="description"
          label="Description"
          multiline
          rows={4}
        />
        {editRole?.is_system_role && (
          <Typography variant="caption" color="textSecondary">
            System roles cannot be edited.
          </Typography>
        )}
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isLoading || editRole?.is_system_role}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Form>
    </Modal>
  );
};

interface PermissionFormModalProps {
  open: boolean;
  onClose: () => void;
  editPermission: Permission | null;
  onSubmit: (values: { resource: string; action: string; description: string }) => void;
  isLoading: boolean;
}

/**
 * Modal component for creating or editing a permission
 */
const PermissionFormModal: React.FC<PermissionFormModalProps> = ({ open, onClose, editPermission, onSubmit, isLoading }) => {
  // 1. Determine if creating new permission or editing existing permission
  const isEdit = !!editPermission;

  // 2. Set up form validation schema for required fields
  // 3. Initialize form with permission data if editing, or empty values if creating
  // 4. Render form fields for resource, action, and description
  // 5. Make resource and action fields read-only when editing
  // 6. Handle form submission and validation
  // 7. Show loading state during submission
  // 8. Provide cancel button to close modal
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Permission" : "Create Permission"}>
      <Form
        initialValues={{
          resource: editPermission?.resource || '',
          action: editPermission?.action || '',
          description: editPermission?.description || '',
        }}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          await onSubmit(values);
          setSubmitting(false);
        }}
      >
        <TextField
          name="resource"
          label="Resource"
          required
          disabled={isEdit}
        />
        <TextField
          name="action"
          label="Action"
          required
          disabled={isEdit}
        />
        <TextField
          name="description"
          label="Description"
          multiline
          rows={4}
        />
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Form>
    </Modal>
  );
};

interface DeleteConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  itemType: string;
  itemName: string;
  onConfirm: () => void;
  isLoading: boolean;
}

/**
 * Confirmation modal for deleting a role or permission
 */
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ open, onClose, itemType, itemName, onConfirm, isLoading }) => {
  // 1. Display confirmation message with item type and name
  // 2. Warn about the permanent nature of deletion
  // 3. Provide confirm and cancel buttons
  // 4. Show loading state during deletion
  // 5. Handle confirmation action
  return (
    <Modal open={open} onClose={onClose} title={`Delete ${itemType}`}>
      <Typography>
        Are you sure you want to delete this {itemType}: <strong>{itemName}</strong>?
      </Typography>
      <Typography variant="body2" color="textSecondary">
        This action cannot be undone.
      </Typography>
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Deleting..." : "Delete"}
        </Button>
      </Box>
    </Modal>
  );
};

interface RolePermissionsModalProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  allPermissions: Permission[];
  onSave: () => void;
  isLoading: boolean;
}

/**
 * Modal for managing permissions assigned to a role
 */
const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ open, onClose, role, allPermissions, onSave, isLoading }) => {
  // 1. Display role name in the modal title
  // 2. Group permissions by resource for organized display
  // 3. Render checkboxes for each permission grouped by resource
  // 4. Pre-select permissions that the role already has
  // 5. Handle permission selection changes
  // 6. Provide save and cancel buttons
  // 7. Show loading state during save operation
  // 8. Handle save action with selected permissions
  // 9. Display warning for system roles that certain permissions cannot be removed
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    if (role) {
      setSelectedPermissions(role.permissions.map(p => p.id));
    } else {
      setSelectedPermissions([]);
    }
  }, [role]);

  const handlePermissionChange = (permissionId: number) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const groupedPermissions = useMemo(() => {
    const grouped: { [resource: string]: Permission[] } = {};
    allPermissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });
    return grouped;
  }, [allPermissions]);

  const isSystemRole = role?.is_system_role || false;

  return (
    <Modal open={open} onClose={onClose} title={`Manage Permissions for ${role?.name}`}>
      <Box>
        {Object.entries(groupedPermissions).map(([resource, permissions]) => (
          <Box key={resource} mb={2}>
            <Typography variant="h6">{resource}</Typography>
            <Divider />
            {permissions.map(permission => (
              <FormControlLabel
                key={permission.id}
                control={
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => handlePermissionChange(permission.id)}
                    disabled={isSystemRole && selectedPermissions.includes(permission.id)}
                  />
                }
                label={permission.name}
              />
            ))}
          </Box>
        ))}
        {isSystemRole && (
          <Typography variant="caption" color="textSecondary">
            Note: Certain permissions cannot be removed from system roles.
          </Typography>
        )}
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};