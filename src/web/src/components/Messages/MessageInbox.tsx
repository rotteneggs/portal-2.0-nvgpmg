# src/web/src/components/Messages/MessageInbox.tsx
```typescript
import React, { useState, useEffect, useCallback } from 'react'; // react v18.0.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.0
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Avatar,
  Typography,
  Box,
  CircularProgress,
  IconButton
} from '@mui/material'; // @mui/material v5.0.0
import {
  MarkEmailReadIcon,
  MarkEmailUnreadIcon,
  SearchIcon,
  EmailIcon
} from '@mui/icons-material'; // @mui/icons-material v5.0.0
import MessageService from '../../services/MessageService';
import { Message, MessagePaginationOptions } from '../../types/message';
import Card from '../Common/Card';
import Button from '../Common/Button';
import TextField from '../Common/TextField';
import Checkbox from '../Common/Checkbox';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import EmptyState from '../Common/EmptyState';
import StatusBadge from '../Common/StatusBadge';
import useNotification from '../../hooks/useNotification';
import useDebounce from '../../hooks/useDebounce';

/**
 * Interface for table column configuration
 */
interface Column {
  id: string;
  label: string;
  sortable: boolean;
  align?: 'left' | 'right' | 'center' | 'justify';
  minWidth?: string;
}

/**
 * Props for the MessageInbox component
 */
export interface MessageInboxProps {
  applicationId?: number;
  onMessageSelect?: (message: Message) => void;
  className?: string;
}

// Styled components
const InboxContainer = styled.div`
  padding: 16px;
`;

const SearchContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const MessageRow = styled(TableRow)`
  cursor: pointer;
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

const SenderCell = styled(TableCell)`
  display: flex;
  align-items: center;
`;

const SubjectCell = styled(TableCell)`
  font-weight: 500;
`;

const PreviewCell = styled(TableCell)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
`;

const DateCell = styled(TableCell)`
  text-align: right;
`;

const ActionCell = styled(TableCell)`
  display: flex;
  justify-content: flex-end;
`;

const UnreadIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #1976d2;
  margin-right: 8px;
`;

const NoMessagesContainer = styled.div`
  text-align: center;
  padding: 20px;
  color: #757575;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 20px;
  color: #f44336;
`;

/**
 * Fetches messages data with pagination, sorting, and filtering options
 * @param options - Pagination options
 */
const fetchMessagesData = async (options: MessagePaginationOptions) => {
  setLoading(true);
  try {
    const response = await MessageService.fetchMessages(options);
    setMessages(response.data);
    setPaginationMeta(response.meta);
  } catch (error: any) {
    setError(error.message);
    useNotification.error(error.message);
  } finally {
    setLoading(false);
  }
};

/**
 * Handles pagination page change
 * @param event - Mouse event
 * @param newPage - New page number
 */
const handlePageChange = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
  setPage(newPage);
  fetchMessagesData({ ...paginationOptions, page: newPage + 1 });
};

/**
 * Handles change in number of rows per page
 * @param event - Change event
 */
const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const rowsPerPage = parseInt(event.target.value, 10);
  setRowsPerPage(rowsPerPage);
  setPage(0);
  fetchMessagesData({ ...paginationOptions, per_page: rowsPerPage, page: 1 });
};

/**
 * Handles sorting column change
 * @param property - Column to sort by
 */
const handleSortChange = (property: string) => {
  const isAsc = orderBy === property && order === 'asc';
  setOrder(isAsc ? 'desc' : 'asc');
  setOrderBy(property);
  fetchMessagesData({ ...paginationOptions, sort_by: property, sort_direction: isAsc ? 'desc' : 'asc' });
};

/**
 * Handles search input change
 * @param event - Change event
 */
const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setSearch(event.target.value);
};

/**
 * Handles unread filter toggle
 * @param event - Change event
 */
const handleUnreadFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setUnreadOnly(event.target.checked);
  setPage(0);
  fetchMessagesData({ ...paginationOptions, unread_only: event.target.checked, page: 1 });
};

/**
 * Marks a message as read
 * @param messageId - ID of the message to mark as read
 * @param event - Mouse event
 */
const handleMarkAsRead = async (messageId: number, event: React.MouseEvent) => {
  event.stopPropagation();
  try {
    await MessageService.markMessageAsRead(messageId);
    fetchMessagesData(paginationOptions);
    useNotification.success('Message marked as read');
  } catch (error: any) {
    useNotification.error(`Failed to mark as read: ${error.message}`);
  }
};

/**
 * Marks a message as unread
 * @param messageId - ID of the message to mark as unread
 * @param event - Mouse event
 */
const handleMarkAsUnread = async (messageId: number, event: React.MouseEvent) => {
  event.stopPropagation();
  try {
    await MessageService.markMessageAsUnread(messageId);
    fetchMessagesData(paginationOptions);
    useNotification.success('Message marked as unread');
  } catch (error: any) {
    useNotification.error(`Failed to mark as unread: ${error.message}`);
  }
};

/**
 * Handles clicking on a message row
 * @param message - Selected message
 */
const handleRowClick = (message: Message) => {
  if (props.onMessageSelect) {
    props.onMessageSelect(message);
  }
};

/**
 * Handles retry action when fetching messages fails
 */
const handleRetry = () => {
  setError(null);
  fetchMessagesData(paginationOptions);
};

/**
 * Component that displays a list of messages with filtering, sorting, and pagination
 */
const MessageInbox: React.FC<MessageInboxProps> = (props) => {
  const { applicationId, onMessageSelect, className } = props;

  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState<{ total: number; last_page: number } | null>(null);

  // Notification hook
  const useNotification = useNotification();

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // Pagination options
  const paginationOptions: MessagePaginationOptions = {
    page: page + 1,
    per_page: rowsPerPage,
    sort_by: orderBy,
    sort_direction: order,
    search: debouncedSearch,
    unread_only: unreadOnly,
    application_id: applicationId || null,
  };

  // Fetch messages on mount and when dependencies change
  useEffect(() => {
    fetchMessagesData(paginationOptions);
  }, [applicationId, debouncedSearch, order, orderBy, page, rowsPerPage, unreadOnly]);

  // Table columns configuration
  const columns: Column[] = [
    { id: 'sender', label: 'Sender', sortable: false, minWidth: '150px' },
    { id: 'subject', label: 'Subject', sortable: true, minWidth: '200px' },
    { id: 'preview', label: 'Preview', sortable: false, align: 'left', minWidth: '300px' },
    { id: 'created_at', label: 'Date', sortable: true, align: 'right', minWidth: '150px' },
    { id: 'actions', label: 'Actions', sortable: false, align: 'right' },
  ];

  return (
    <InboxContainer className={className}>
      <SearchContainer>
        <TextField
          label="Search Messages"
          placeholder="Enter search term"
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Checkbox
          label="Unread Only"
          checked={unreadOnly}
          onChange={handleUnreadFilterChange}
        />
      </SearchContainer>

      {loading ? (
        <LoadingSkeleton variant="table" count={rowsPerPage} />
      ) : error ? (
        <ErrorContainer>
          <Typography variant="body1" color="error">
            Error: {error}
          </Typography>
          <Button onClick={handleRetry}>Retry</Button>
        </ErrorContainer>
      ) : messages && messages.length === 0 ? (
        <NoMessagesContainer>
          <EmptyState message="No messages found" description="Your inbox is empty." illustration={<EmailIcon />} />
        </NoMessagesContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="message inbox table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    sortDirection={orderBy === column.id ? order : false}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleSortChange(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {messages && messages.map((message) => (
                <MessageRow key={message.id} onClick={() => handleRowClick(message)}>
                  <SenderCell>
                    {message.recipient && (
                      <UnreadIndicator style={{ display: message.is_read ? 'none' : 'block' }} />
                    )}
                    <Box display="flex" alignItems="center">
                      <Avatar>{message.sender.first_name.charAt(0)}{message.sender.last_name.charAt(0)}</Avatar>
                      <Typography style={{ marginLeft: 8 }}>
                        {message.sender.first_name} {message.sender.last_name}
                      </Typography>
                    </Box>
                  </SenderCell>
                  <SubjectCell>{message.subject}</SubjectCell>
                  <PreviewCell>{message.preview}</PreviewCell>
                  <DateCell>{message.formatted_created_at}</DateCell>
                  <ActionCell>
                    <IconButton
                      aria-label="mark as read"
                      onClick={(event) => handleMarkAsRead(message.id, event)}
                      style={{ display: message.is_read ? 'none' : 'inline-flex' }}
                    >
                      <MarkEmailReadIcon />
                    </IconButton>
                    <IconButton
                      aria-label="mark as unread"
                      onClick={(event) => handleMarkAsUnread(message.id, event)}
                      style={{ display: message.is_read ? 'inline-flex' : 'none' }}
                    >
                      <MarkEmailUnreadIcon />
                    </IconButton>
                  </ActionCell>
                </MessageRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={paginationMeta ? paginationMeta.total : 0}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      )}
    </InboxContainer>
  );
};

export default MessageInbox;