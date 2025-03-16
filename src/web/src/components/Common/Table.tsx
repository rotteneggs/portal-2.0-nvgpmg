import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { SortDirection, PaginationParams } from '../../types/common';
import useBreakpoint from '../../hooks/useBreakpoint';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

/**
 * Interface for column configuration in the Table component
 */
export interface TableColumn {
  /** Unique identifier for the column */
  id: string;
  /** Display label for the column header */
  label: string;
  /** Optional custom render function for cell content */
  render?: (value: any, row: any) => React.ReactNode;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Text alignment within the column */
  align?: 'left' | 'right' | 'center';
  /** Width of the column (string or number) */
  width?: string | number;
  /** Whether the column should be hidden (boolean or function based on breakpoint) */
  hidden?: boolean | ((breakpoint: string) => boolean);
  /** Additional CSS class for the column */
  className?: string;
}

/**
 * Props interface for the Table component
 */
export interface TableProps {
  /** Array of data objects to display in the table */
  data: Array<any>;
  /** Array of column configurations */
  columns: Array<TableColumn>;
  /** Current sort column ID */
  sortBy?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Function called when sorting changes */
  onSort?: (column: string, direction: SortDirection) => void;
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Total count of items (for pagination) */
  totalCount?: number;
  /** Function called when page changes */
  onPageChange?: (page: number) => void;
  /** Function called when rows per page changes */
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  /** Whether the table is in loading state */
  loading?: boolean;
  /** Message to display when no data is available */
  emptyStateMessage?: string;
  /** Icon to display in empty state */
  emptyStateIcon?: React.ReactNode;
  /** Function called when a row is clicked */
  onRowClick?: (row: any) => void;
  /** Property name to use as row key */
  rowKey?: string;
  /** Whether the header should stick to the top during scroll */
  stickyHeader?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Whether to use dense padding */
  dense?: boolean;
  /** Whether to hide the pagination footer */
  hideFooter?: boolean;
}

// Styled components
const TableWrapper = styled(Paper)`
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
`;

const StyledTableContainer = styled(TableContainer)`
  overflow: auto;
`;

const StyledTable = styled(MuiTable)`
  min-width: 650px;
`;

const StyledHeaderCell = styled(TableCell)`
  font-weight: 500;
  background-color: #FAFAFA;
`;

const StyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== 'isClickable',
})<{ isClickable?: boolean }>`
  cursor: ${props => props.isClickable ? 'pointer' : 'default'};
`;

const StyledTableRow = styled(TableRow)`
  &:last-child td, &:last-child th {
    border-bottom: 0;
  }
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

// Helper function for stable sorting
function stableSort<T>(array: T[], comparator: (a: T, b: T) => number): T[] {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

function getComparator<Key extends keyof any>(
  sortDirection: SortDirection,
  orderBy: string,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
  return sortDirection === SortDirection.DESC
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T): number {
  // Handle null or undefined values
  if (a[orderBy] === null || a[orderBy] === undefined) return 1;
  if (b[orderBy] === null || b[orderBy] === undefined) return -1;
  
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

/**
 * A reusable table component that provides a standardized way to display tabular data
 * throughout the Student Admissions Enrollment Platform. It supports sorting, pagination,
 * custom cell rendering, and responsive design adaptations.
 */
const Table: React.FC<TableProps> = ({
  data = [],
  columns = [],
  sortBy,
  sortDirection,
  onSort,
  pagination,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  loading = false,
  emptyStateMessage = 'No data available',
  emptyStateIcon,
  onRowClick,
  rowKey = 'id',
  stickyHeader = false,
  className,
  dense = false,
  hideFooter = false,
}) => {
  const { breakpoint } = useBreakpoint();
  
  // Filter columns based on breakpoint
  const visibleColumns = useMemo(() => {
    return columns.filter((column) => {
      if (typeof column.hidden === 'function') {
        return !column.hidden(breakpoint);
      }
      return !column.hidden;
    });
  }, [columns, breakpoint]);
  
  // Handle sorting
  const handleSort = (columnId: string) => {
    if (!onSort) return;
    
    const newDirection =
      sortBy === columnId && sortDirection === SortDirection.ASC
        ? SortDirection.DESC
        : SortDirection.ASC;
    
    onSort(columnId, newDirection);
  };
  
  // Client-side sorting if no onSort handler is provided
  const sortedData = useMemo(() => {
    if (!sortBy || !data.length || onSort) {
      return data;
    }
    
    return stableSort(data, getComparator(sortDirection!, sortBy));
  }, [data, sortBy, sortDirection, onSort]);
  
  // Handle pagination
  const handleChangePage = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(parseInt(event.target.value, 10));
    }
    if (onPageChange) {
      onPageChange(0);
    }
  };
  
  // Render loading state
  if (loading) {
    return <LoadingSkeleton variant="table" count={5} />;
  }
  
  // Render empty state
  if (data.length === 0) {
    return (
      <EmptyState
        message={emptyStateMessage}
        illustration={emptyStateIcon}
      />
    );
  }
  
  return (
    <TableWrapper className={className}>
      <StyledTableContainer>
        <StyledTable
          stickyHeader={stickyHeader}
          size={dense ? 'small' : 'medium'}
          aria-label="data table"
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <StyledHeaderCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ width: column.width }}
                  className={column.className}
                  sortDirection={sortBy === column.id ? sortDirection?.toLowerCase() as 'asc' | 'desc' : false}
                >
                  {column.sortable ? (
                    <Tooltip
                      title={`Sort by ${column.label}`}
                      placement="top"
                      enterDelay={300}
                    >
                      <TableSortLabel
                        active={sortBy === column.id}
                        direction={sortBy === column.id && sortDirection ? sortDirection.toLowerCase() as 'asc' | 'desc' : 'asc'}
                        onClick={() => handleSort(column.id)}
                        IconComponent={
                          sortBy === column.id && sortDirection === SortDirection.DESC
                            ? ArrowDownwardIcon
                            : ArrowUpwardIcon
                        }
                      >
                        {column.label}
                      </TableSortLabel>
                    </Tooltip>
                  ) : (
                    column.label
                  )}
                </StyledHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row) => (
              <StyledTableRow
                key={row[rowKey]}
                hover={!!onRowClick}
                onClick={() => onRowClick && onRowClick(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `Select row ${row[rowKey]}` : undefined}
              >
                {visibleColumns.map((column) => (
                  <StyledTableCell
                    key={`${row[rowKey]}-${column.id}`}
                    align={column.align || 'left'}
                    className={column.className}
                    isClickable={!!onRowClick}
                  >
                    {column.render
                      ? column.render(row[column.id], row)
                      : row[column.id]}
                  </StyledTableCell>
                ))}
              </StyledTableRow>
            ))}
          </TableBody>
        </StyledTable>
      </StyledTableContainer>
      
      {!hideFooter && pagination && (
        <TablePagination
          component="div"
          count={totalCount}
          page={pagination.page}
          onPageChange={handleChangePage}
          rowsPerPage={pagination.per_page}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} of ${count !== -1 ? count : 'more than ' + to}`
          }
          SelectProps={{
            inputProps: { 'aria-label': 'rows per page' },
            native: true,
          }}
        />
      )}
    </TableWrapper>
  );
};

export default Table;