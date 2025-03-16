import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.0
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.0.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.0
import { Box, Typography, Paper, Grid, IconButton, Tooltip } from '@mui/material'; // @mui/material ^5.0.0
import AddIcon from '@mui/icons-material/Add'; // @mui/icons-material ^5.0.0
import SearchIcon from '@mui/icons-material/Search'; // @mui/icons-material ^5.0.0
import FilterListIcon from '@mui/icons-material/FilterList'; // @mui/icons-material ^5.0.0
import AssignmentIcon from '@mui/icons-material/Assignment'; // @mui/icons-material ^5.0.0
import {
  fetchApplications,
  selectApplications,
  selectApplicationsLoading,
  selectApplicationsError,
} from '../../redux/slices/applicationsSlice';
import {
  ApplicationListItem,
  ApplicationType,
  ApplicationStatus,
  AcademicTerm,
  ApplicationFilter,
} from '../../types/application';
import { SortDirection } from '../../types/common';
import {
  Table,
  TableColumn,
  Button,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
  TextField,
  Select,
} from '../Common';
import { StatusType } from '../Common/StatusBadge';

// Styled container for the entire component
const ApplicationListContainer = styled(Box)`
  padding: ${({ theme }) => theme.spacing(3)};
`;

// Styled header with title and create button
const Header = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing(3)};
`;

// Styled container for filter controls
const FilterControls = styled(Grid)`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

// Styled container for the table
const TableContainer = styled(Paper)`
  width: 100%;
  overflow: auto;
`;

// Styled button for creating a new application
const CreateButton = styled(Button)`
  && {
    padding: ${({ theme }) => theme.spacing(1, 2)};
  }
`;

// Styled text field for searching applications
const SearchField = styled(TextField)`
  width: 100%;
`;

// Styled select component for filtering applications
const FilterSelect = styled(Select)`
  width: 100%;
`;

// Define options for Application Type filter
const applicationTypeOptions = Object.values(ApplicationType).map((type) => ({
  value: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

// Define options for Academic Term filter
const academicTermOptions = Object.values(AcademicTerm).map((term) => ({
  value: term,
  label: term.charAt(0).toUpperCase() + term.slice(1),
}));

// Define options for Academic Year filter (last 5 years)
const currentYear = new Date().getFullYear();
const academicYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => ({
  value: String(year),
  label: String(year),
}));

// Define options for Application Status filter
const applicationStatusOptions = Object.values(ApplicationStatus).map((status) => ({
  value: status,
  label: status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
}));

/**
 * Component that displays a list of applications with filtering, sorting, and pagination
 */
const ApplicationList: React.FC = () => {
  // Local state for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Local state for sorting
  const [sortBy, setSortBy] = useState<string>('submitted_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);

  // Local state for filters
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<string | null>(null);
  const [termFilter, setTermFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // React Router hook for navigation
  const navigate = useNavigate();

  // Redux hook for dispatching actions
  const dispatch = useDispatch();

  // Redux selectors for application data
  const applications = useSelector(selectApplications);
  const loading = useSelector(selectApplicationsLoading);
  const error = useSelector(selectApplicationsError);

  // Handler for creating a new application
  const handleCreateApplication = useCallback(() => {
    navigate('/applications/create');
  }, [navigate]);

  // Handler for row click (navigating to application details)
  const handleRowClick = useCallback((row: ApplicationListItem) => {
    navigate(`/applications/${row.id}`);
  }, [navigate]);

  // Handler for page change
  const handlePageChange = useCallback((_: any, newPage: number) => {
    setPage(newPage);
  }, []);

  // Handler for rows per page change
  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  }, []);

  // Handler for sort change
  const handleSort = useCallback((column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDirection(direction);
  }, []);

  // Handler for filter change
  const handleFilterChange = useCallback((filterType: string, value: string | null) => {
    switch (filterType) {
      case 'applicationType':
        setApplicationTypeFilter(value);
        break;
      case 'term':
        setTermFilter(value);
        break;
      case 'year':
        setYearFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      default:
        break;
    }
    setPage(0); // Reset to the first page when filters change
  }, []);

  // Handler for search change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to the first page when search query changes
  }, []);

  // Fetch applications with filters
  const fetchApplicationsWithFilters = useCallback(() => {
    const filters: ApplicationFilter = {
      application_type: applicationTypeFilter,
      academic_term: termFilter,
      academic_year: yearFilter,
      status: statusFilter,
      search: searchQuery,
      is_submitted: null
    };
    dispatch(fetchApplications({ ...filters, page: page + 1, per_page: rowsPerPage })); // Page is 0-based in UI, 1-based in API
  }, [dispatch, applicationTypeFilter, termFilter, yearFilter, statusFilter, searchQuery, page, rowsPerPage]);

  // Fetch applications on mount and when filters change
  useEffect(() => {
    fetchApplicationsWithFilters();
  }, [fetchApplicationsWithFilters]);

  // Define table columns
  const columns: TableColumn[] = useMemo(() => [
    {
      id: 'application_type',
      label: 'Type',
      sortable: true,
      render: (value: ApplicationType) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      id: 'academic_term',
      label: 'Term',
      sortable: true,
      render: (value: AcademicTerm) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      id: 'academic_year',
      label: 'Year',
      sortable: true,
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (value: ApplicationStatus) => (
        <StatusBadge status={value} type={StatusType.APPLICATION} />
      ),
    },
    {
      id: 'submitted_at',
      label: 'Submission Date',
      sortable: true,
    },
  ], []);

  return (
    <ApplicationListContainer>
      <Header>
        <Typography variant="h5" component="h2">
          Applications
        </Typography>
        <CreateButton
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateApplication}
        >
          Create New Application
        </CreateButton>
      </Header>

      <FilterControls container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <SearchField
            label="Search"
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <SearchIcon color="action" />
              ),
            }}
            onChange={handleSearchChange}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FilterSelect
            label="Type"
            value={applicationTypeFilter || ''}
            onChange={(e) => handleFilterChange('applicationType', e.target.value as string)}
            options={applicationTypeOptions}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FilterSelect
            label="Term"
            value={termFilter || ''}
            onChange={(e) => handleFilterChange('term', e.target.value as string)}
            options={academicTermOptions}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FilterSelect
            label="Year"
            value={yearFilter || ''}
            onChange={(e) => handleFilterChange('year', e.target.value as string)}
            options={academicYearOptions}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FilterSelect
            label="Status"
            value={statusFilter || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as string)}
            options={applicationStatusOptions}
            size="small"
          />
        </Grid>
      </FilterControls>

      <TableContainer>
        {loading ? (
          <LoadingSkeleton variant="table" count={5} />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : applications && applications.length > 0 ? (
          <Table
            data={applications}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            pagination={{ page, per_page: rowsPerPage }}
            totalCount={100} // Replace with actual total count from API
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onRowClick={handleRowClick}
            rowKey="id"
          />
        ) : (
          <EmptyState
            message="No applications found"
            illustration={<AssignmentIcon />}
          />
        )}
      </TableContainer>
    </ApplicationListContainer>
  );
};

export default ApplicationList;