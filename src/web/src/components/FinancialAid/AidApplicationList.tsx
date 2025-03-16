import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Menu, MenuItem, TextField, Select, FormControl, InputLabel } from '@mui/material'; // Material UI v5.11.0
import { MoreVert, Edit, Delete, Visibility, FilterList, Search } from '@mui/icons-material'; // Material UI icons v5.11.0
import { styled } from '@emotion/styled'; // CSS-in-JS styling solution v11.10.0

import Table from '../Common/Table';
import StatusBadge from '../Common/StatusBadge';
import Card from '../Common/Card';
import Button from '../Common/Button';
import FinancialAidService from '../../services/FinancialAidService';
import useNotification from '../../hooks/useNotification';
import useBreakpoint from '../../hooks/useBreakpoint';
import {
  FinancialAidApplication,
  FinancialAidStatus,
  FinancialAidType,
  FinancialAidFilter
} from '../../types/financialAid';
import { SortDirection } from '../../types/common';

interface AidApplicationListProps {
  onEdit: (application: FinancialAidApplication) => void;
  onView: (application: FinancialAidApplication) => void;
  onDelete?: (application: FinancialAidApplication) => void;
}

// Styled components for consistent styling
const FilterContainer = styled(Box)`
  display: flex;
  flexWrap: wrap;
  gap: ${theme => theme.spacing(2)};
  marginBottom: ${theme => theme.spacing(2)};
`;

const FilterItem = styled(FormControl)`
  minWidth: 150px;
  maxWidth: 200px;
`;

const ActionButton = styled(IconButton)`
  padding: ${theme => theme.spacing(1)};
`;

const AidTypeChip = styled(Chip)`
  margin: 2px;
  fontSize: '0.75rem';
`;

/**
 * Component that displays a list of financial aid applications with filtering, sorting, and pagination
 */
const AidApplicationList: React.FC<AidApplicationListProps> = ({ onEdit, onView, onDelete }) => {
  // State variables for managing applications, loading, pagination, sorting, and filters
  const [applications, setApplications] = useState<FinancialAidApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, perPage: 10, total: 0 });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [filters, setFilters] = useState<FinancialAidFilter>({});
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);

  // Notification hook for displaying success/error messages
  const notification = useNotification();

  // Breakpoint hook for responsive design
  const breakpoint = useBreakpoint();

  // Function to fetch financial aid applications from the API
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await FinancialAidService.fetchFinancialAidApplications(
        filters,
        pagination.page + 1, // API expects 1-based indexing
        pagination.perPage
      );
      setApplications(response.applications);
      setPagination({
        page: response.page - 1, // Convert back to 0-based indexing
        perPage: response.perPage,
        total: response.total,
      });
    } catch (error: any) {
      notification.error(error.message || 'Failed to load financial aid applications');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.perPage, notification]);

  // Load applications on component mount and when dependencies change
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Function to handle sorting changes
  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDirection(direction);
    fetchApplications();
  };

  // Function to handle page changes
  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  // Function to handle rows per page changes
  const handleRowsPerPageChange = (newPerPage: number) => {
    setPagination({ ...pagination, perPage: newPerPage, page: 0 });
  };

  // Function to handle filter changes
  const handleFilterChange = (newFilters: Partial<FinancialAidFilter>) => {
    setFilters({ ...filters, ...newFilters });
    setPagination({ ...pagination, page: 0 }); // Reset to first page on filter change
  };

  // Function to handle delete action
  const handleDelete = async (id: number) => {
    try {
      const success = await FinancialAidService.deleteFinancialAidApplicationWithConfirmation(id);
      if (success) {
        notification.success('Financial aid application deleted successfully');
        fetchApplications(); // Refresh the list after deletion
      }
    } catch (error: any) {
      notification.error(error.message || 'Failed to delete financial aid application');
    } finally {
      handleClose();
    }
  };

  // Function to handle row click (view action)
  const handleRowClick = (application: FinancialAidApplication) => {
    onView(application);
  };

  // Function to render status cell with StatusBadge component
  const renderStatusCell = (status: FinancialAidStatus) => (
    <StatusBadge status={status} type="FINANCIAL_AID" />
  );

  // Function to render aid type cell with Chip components
  const renderAidTypeCell = (aidType: string) => (
    <AidTypeChip label={aidType} size="small" />
  );

  // Function to render date cell with formatted date
  const renderDateCell = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedApplicationId(Number(event.currentTarget.dataset.id));
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedApplicationId(null);
  };

  // Function to render actions cell with action buttons
  const renderActionsCell = (row: FinancialAidApplication) => (
    <>
      <ActionButton
        data-id={row.id}
        aria-label="Open actions menu"
        aria-controls={`actions-menu-${row.id}`}
        aria-haspopup="true"
        onClick={handleMenu}
      >
        <MoreVert />
      </ActionButton>
      <Menu
        id={`actions-menu-${row.id}`}
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && selectedApplicationId === row.id}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); onView(row); }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); onEdit(row); }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {onDelete && (
          <MenuItem onClick={() => { handleDelete(row.id); }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  );

  // Define table columns with responsive behavior
  const columns = React.useMemo(() => [
    { id: 'aid_type', label: 'Aid Type', render: renderAidTypeCell, sortable: true, align: 'left' },
    { id: 'status', label: 'Status', render: renderStatusCell, sortable: true, align: 'left' },
    { id: 'submitted_at', label: 'Submitted', render: renderDateCell, sortable: true, align: 'left', hidden: (breakpoint) => breakpoint === 'xs' },
    { id: 'created_at', label: 'Created', render: renderDateCell, sortable: true, align: 'left', hidden: (breakpoint) => ['xs', 'sm'].includes(breakpoint) },
    { id: 'actions', label: 'Actions', render: renderActionsCell, sortable: false, align: 'right' },
  ], [renderAidTypeCell, renderStatusCell, renderDateCell, renderActionsCell]);

  return (
    <Card title="Financial Aid Applications">
      <FilterContainer>
        <FilterItem>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange({ status: e.target.value as string })}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value={FinancialAidStatus.DRAFT}>Draft</MenuItem>
            <MenuItem value={FinancialAidStatus.SUBMITTED}>Submitted</MenuItem>
            <MenuItem value={FinancialAidStatus.UNDER_REVIEW}>Under Review</MenuItem>
            <MenuItem value={FinancialAidStatus.APPROVED}>Approved</MenuItem>
            <MenuItem value={FinancialAidStatus.DENIED}>Denied</MenuItem>
          </Select>
        </FilterItem>
        <FilterItem>
          <InputLabel id="aid-type-filter-label">Aid Type</InputLabel>
          <Select
            labelId="aid-type-filter-label"
            value={filters.aid_type || ''}
            onChange={(e) => handleFilterChange({ aid_type: e.target.value as string })}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value={FinancialAidType.NEED_BASED}>Need Based</MenuItem>
            <MenuItem value={FinancialAidType.MERIT_BASED}>Merit Based</MenuItem>
            <MenuItem value={FinancialAidType.SCHOLARSHIP}>Scholarship</MenuItem>
          </Select>
        </FilterItem>
      </FilterContainer>
      <Table
        data={applications}
        columns={columns}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        pagination={pagination}
        totalCount={pagination.total}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        loading={loading}
        emptyStateMessage="No financial aid applications found."
        onRowClick={handleRowClick}
      />
    </Card>
  );
};

export default AidApplicationList;