import React, { useState, useEffect, useCallback, useMemo } from 'react';
// v18.2.0
import styled from '@emotion/styled'; // ^11.10.6
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Grid,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material'; // ^5.11.10
import {
  GridViewOutlined,
  ViewListOutlined,
  FilterListOutlined,
  SortOutlined,
  MoreVertOutlined,
  DeleteOutlined,
  VisibilityOutlined,
  GetAppOutlined,
  SearchOutlined,
  InsertDriveFileOutlined,
  ImageOutlined,
  PictureAsPdfOutlined,
  DescriptionOutlined
} from '@mui/icons-material'; // ^5.11.11
import { SortDirection } from '@mui/material/TableCell'; // ^5.11.10

import {
  Document,
  DocumentType,
  DocumentFilter,
  VerificationStatus
} from '../../types/document';
import DocumentService from '../../services/DocumentService';
import Table from '../Common/Table';
import Card from '../Common/Card';
import VerificationStatusComponent from './VerificationStatus';
import EmptyState from '../Common/EmptyState';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import useNotification from '../../hooks/useNotification';
import useBreakpoint from '../../hooks/useBreakpoint';
import { formatDate, formatFileSize } from '../../utils/formatUtils';

/**
 * Interface defining the props for the DocumentLibrary component
 */
interface DocumentLibraryProps {
  applicationId: string | number;
  documentTypes: string[];
  onDocumentSelect?: (document: Document) => void;
  isAdmin?: boolean;
  className?: string;
}

// Styled components
const Container = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const Toolbar = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ViewToggle = styled(Box)`
  display: flex;
  align-items: center;
`;

const FilterContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const GridContainer = styled(Grid)`
  padding: 1rem;
`;

const DocumentCard = styled(Card)`
  /* Custom styling for document cards in grid view */
`;

const DocumentCardContent = styled(Box)`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const DocumentIcon = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  background-color: #EEEEEE;
`;

const DocumentInfo = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DocumentActions = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

/**
 * A component that displays a collection of documents with filtering, sorting, and interactive capabilities
 */
const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  applicationId,
  documentTypes,
  onDocumentSelect,
  isAdmin,
  className
}) => {
  // State variables
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filters, setFilters] = useState<DocumentFilter>({
    document_type: documentTypes,
    page: 1,
    per_page: 10
  });
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Hooks
  const { displaySuccess, displayError } = useNotification();
  const { breakpoint } = useBreakpoint();

  // Fetch documents function
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const documentFilter: DocumentFilter = {
        ...filters,
        application_id: applicationId,
        sort_by: sortBy,
        sort_direction: sortDirection,
      };
      const response = await DocumentService.getDocuments(documentFilter);
      setDocuments(response.data);
      setTotalCount(response.meta?.pagination?.total || 0);
    } catch (error: any) {
      displayError(error.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [applicationId, filters, sortBy, sortDirection, displayError]);

  // Fetch documents on mount and when filters change
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handlers
  const handleViewModeChange = () => {
    setViewMode(prevMode => (prevMode === 'table' ? 'grid' : 'table'));
  };

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handleSortChange = (field: string) => {
    setSortBy(field);
    setSortDirection(prevDirection => (field === sortBy ? (prevDirection === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const handlePageChange = (page: number) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      page: page + 1 // Material UI Pagination is 0-based
    }));
  };

  const handleRowsPerPageChange = (rowsPerPage: number) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      per_page: rowsPerPage,
      page: 1 // Reset to first page on rows per page change
    }));
  };

  const handleDocumentSelect = (document: Document) => {
    onDocumentSelect?.(document);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (window.confirm(`Are you sure you want to delete document "${document.file_name}"?`)) {
      try {
        await DocumentService.deleteDocument(document.id);
        setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== document.id));
        displaySuccess('Document deleted successfully');
      } catch (error: any) {
        displayError(error.message || 'Failed to delete document');
      }
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDocument(null);
  };

  // Render functions
  const renderTableView = () => {
    const columns = useMemo(() => [
      {
        id: 'document_type',
        label: 'Type',
        render: (value: any, row: Document) => (
          <Box display="flex" alignItems="center">
            {renderDocumentTypeIcon(row)}
            <Typography ml={1}>{value}</Typography>
          </Box>
        ),
        sortable: true,
        width: '15%'
      },
      {
        id: 'file_name',
        label: 'File Name',
        render: (value: any, row: Document) => (
          <Box display="flex" alignItems="center">
            <Typography>{value}</Typography>
          </Box>
        ),
        sortable: true,
        width: '30%'
      },
      {
        id: 'file_size',
        label: 'Size',
        render: (value: any) => formatFileSize(value),
        sortable: true,
        width: '10%'
      },
      {
        id: 'is_verified',
        label: 'Status',
        render: (value: any, row: Document) => (
          <VerificationStatusComponent document={row} />
        ),
        sortable: true,
        width: '15%'
      },
      {
        id: 'created_at',
        label: 'Uploaded',
        render: (value: any) => formatDate(value, 'MM/dd/yyyy'),
        sortable: true,
        width: '15%'
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (_value: any, row: Document) => (
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Tooltip title="View">
              <IconButton aria-label="view" onClick={() => handleDocumentSelect(row)}>
                <VisibilityOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton aria-label="download">
                <GetAppOutlined />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Delete">
                <IconButton aria-label="delete" onClick={() => handleDeleteDocument(row)}>
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
        sortable: false,
        width: '15%'
      }
    ], [handleDocumentSelect, handleDeleteDocument, isAdmin]);

    return (
      <Table
        data={documents}
        columns={columns}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSortChange}
        pagination={{ page: filters.page || 1, per_page: filters.per_page || 10 }}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    );
  };

  const renderGridView = () => {
    return (
      <GridContainer container spacing={2}>
        {documents.map(document => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={document.id}>
            <DocumentCard onClick={() => handleDocumentSelect(document)}>
              <DocumentCardContent>
                <DocumentIcon>
                  {renderDocumentTypeIcon(document)}
                </DocumentIcon>
                <DocumentInfo>
                  <Typography variant="subtitle2">{document.file_name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatFileSize(document.file_size)}
                  </Typography>
                  <VerificationStatusComponent document={document} />
                </DocumentInfo>
                <DocumentActions>
                  <IconButton aria-label="download">
                    <GetAppOutlined />
                  </IconButton>
                  {isAdmin && (
                    <IconButton aria-label="delete" onClick={() => handleDeleteDocument(document)}>
                      <DeleteOutlined />
                    </IconButton>
                  )}
                </DocumentActions>
              </DocumentCardContent>
            </DocumentCard>
          </Grid>
        ))}
      </GridContainer>
    );
  };

  const renderDocumentTypeIcon = (document: Document) => {
    if (document.is_image) {
      return <ImageOutlined fontSize="large" />;
    } else if (document.is_pdf) {
      return <PictureAsPdfOutlined fontSize="large" />;
    } else {
      return <InsertDriveFileOutlined fontSize="large" />;
    }
  };

  const renderFilters = () => {
    return (
      <FilterContainer>
        <FormControl>
          <InputLabel id="document-type-label">Document Type</InputLabel>
          <Select
            labelId="document-type-label"
            value={filters.document_type || ''}
            onChange={(e) => handleFilterChange('document_type', e.target.value)}
            multiple
            renderValue={(selected) => (selected as string[]).join(', ')}
          >
            {documentTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={filters.is_verified === true} onChange={(e) => handleFilterChange('is_verified', e.target.checked ? true : null)} />}
          label="Verified Only"
        />
        <TextField
          label="Search Filename"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined />
              </InputAdornment>
            ),
          }}
        />
      </FilterContainer>
    );
  };

  const renderToolbar = () => {
    return (
      <Toolbar>
        <Typography variant="h6">Document Library</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ViewToggle>
            <Tooltip title="Table View">
              <IconButton onClick={handleViewModeChange} disabled={viewMode === 'table'}>
                <ViewListOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title="Grid View">
              <IconButton onClick={handleViewModeChange} disabled={viewMode === 'grid'}>
                <GridViewOutlined />
              </IconButton>
            </Tooltip>
          </ViewToggle>
          <Tooltip title="Filters">
            <IconButton>
              <FilterListOutlined />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Actions">
              <IconButton
                aria-label="more"
                id="long-button"
                aria-controls={menuAnchorEl ? 'long-menu' : undefined}
                aria-expanded={menuAnchorEl ? 'true' : undefined}
                aria-haspopup="true"
                onClick={(event) => handleMenuOpen(event, {} as Document)}
              >
                <MoreVertOutlined />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Menu
          id="long-menu"
          MenuListProps={{
            'aria-labelledby': 'long-button',
          }}
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>Upload New Document</MenuItem>
          <Divider />
          <MenuItem onClick={handleMenuClose}>Manage Document Types</MenuItem>
        </Menu>
      </Toolbar>
    );
  };

  return (
    <Container className={className}>
      {renderToolbar()}
      {renderFilters()}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : documents.length === 0 ? (
        <EmptyState message="No documents found" />
      ) : (
        viewMode === 'table' ? renderTableView() : renderGridView()
      )}
    </Container>
  );
};

export default DocumentLibrary;