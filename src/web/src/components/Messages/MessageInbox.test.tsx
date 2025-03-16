import React from 'react'; // react v18.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event v14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils v18.0.0
import MessageInbox from './MessageInbox';
import MessageService from '../../services/MessageService';
import { renderWithProviders } from '../../utils/testUtils';
import { Message } from '../../types/message';

// Mock the MessageService
jest.mock('../../services/MessageService');

// Function to set up the test environment with mocked services
const setup = () => {
  // Mock MessageService.fetchMessages
  (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, last_page: 1 } });

  // Mock MessageService.markMessageAsRead
  (MessageService.markMessageAsRead as jest.Mock).mockResolvedValue({ success: true });

  // Mock MessageService.markMessageAsUnread
  (MessageService.markMessageAsUnread as jest.Mock).mockResolvedValue({ success: true });

  // Create mock message data for testing
};

// Function to create mock message data for testing
const createMockMessages = (count: number): Message[] => {
  const mockMessages: Message[] = [];
  for (let i = 1; i <= count; i++) {
    mockMessages.push({
      id: i,
      sender_user_id: 1,
      recipient_user_id: 2,
      application_id: null,
      subject: `Test Message ${i}`,
      message_body: `This is the body of test message ${i}.`,
      is_read: i % 2 === 0, // Alternate read/unread
      read_at: i % 2 === 0 ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        id: 1,
        email: 'sender@example.com',
        email_verified_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        has_mfa_enabled: false,
        roles: [],
        permissions: [],
        profile: {
          id: 1,
          user_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: null,
          phone_number: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postal_code: null,
          country: null,
          notification_preferences: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        full_name: 'John Doe'
      },
      recipient: {
        id: 2,
        email: 'recipient@example.com',
        email_verified_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        has_mfa_enabled: false,
        roles: [],
        permissions: [],
        profile: null,
        full_name: 'Jane Smith'
      },
      application: null,
      attachments: [],
      read_status: i % 2 === 0 ? 'read' : 'unread',
      formatted_created_at: new Date().toLocaleDateString(),
      preview: `This is a preview of test message ${i}.`
    });
  }
  return mockMessages;
};

// Function to create a mock paginated response with messages
const createMockPaginatedResponse = (messages: Message[], page: number, perPage: number, total: number) => {
  return {
    data: messages,
    meta: {
      pagination: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.ceil(total / perPage),
        from: (page - 1) * perPage + 1,
        to: Math.min(page * perPage, total)
      }
    }
  };
};

describe('MessageInbox Component', () => {
  beforeEach(() => {
    setup();
  });

  it('renders loading state initially', async () => {
    // Mock fetchMessages to return a delayed promise
    (MessageService.fetchMessages as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: [], meta: { total: 0, last_page: 1 } });
        }, 500);
      });
    });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Verify loading skeleton is displayed
    expect(screen.getByTestId('loading-skeleton-table')).toBeInTheDocument();
  });

  it('renders empty state when no messages are available', async () => {
    // Mock fetchMessages to return an empty array
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0, last_page: 1 } });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Verify empty state message is displayed
    expect(screen.getByText('No messages found')).toBeInTheDocument();
  });

  it('renders messages when data is loaded', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Verify messages are displayed with correct information
    expect(screen.getByText('Test Message 1')).toBeInTheDocument();
    expect(screen.getByText('Test Message 2')).toBeInTheDocument();
    expect(screen.getByText('Test Message 3')).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    // Create mock paginated response
    const mockMessages = createMockMessages(7);
    const mockPaginatedResponse = createMockPaginatedResponse(mockMessages.slice(0, 5), 1, 5, 7);
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue(mockPaginatedResponse);

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on next page button
    const nextPageButton = screen.getByRole('button', { name: 'Go to next page' });
    fireEvent.click(nextPageButton);

    // Verify fetchMessages was called with updated page parameter
    expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));

    // Change rows per page
    const rowsPerPageSelect = screen.getByLabelText('Rows per page');
    fireEvent.change(rowsPerPageSelect, { target: { value: '10' } });

    // Verify fetchMessages was called with updated rowsPerPage parameter
    await waitFor(() => {
      expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ per_page: 10, page: 1 }));
    });
  });

  it('handles sorting correctly', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on a sortable column header
    const subjectHeader = screen.getByRole('columnheader', { name: 'Subject' });
    fireEvent.click(subjectHeader);

    // Verify fetchMessages was called with updated orderBy parameter
    expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ sort_by: 'subject', sort_direction: 'desc' }));

    // Click on the same column header again
    fireEvent.click(subjectHeader);

    // Verify fetchMessages was called with updated order parameter (asc/desc)
    expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ sort_by: 'subject', sort_direction: 'asc' }));
  });

  it('handles search correctly', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Type in the search field
    const searchInput = screen.getByPlaceholderText('Enter search term');
    userEvent.type(searchInput, 'test');

    // Wait for debounce
    await waitFor(() => {
      expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ search: 'test' }));
    }, {timeout: 1000});
  });

  it('handles unread filter correctly', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on unread filter checkbox
    const unreadCheckbox = screen.getByLabelText('Unread Only');
    fireEvent.click(unreadCheckbox);

    // Verify fetchMessages was called with unread_only parameter set to true
    expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ unread_only: true }));
  });

  it('handles mark as read action correctly', async () => {
    // Create mock messages with at least one unread message
    const mockMessages = createMockMessages(3);
    mockMessages[0].is_read = false;

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Mock markMessageAsRead to return success
    (MessageService.markMessageAsRead as jest.Mock).mockResolvedValue({ success: true });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on mark as read button for an unread message
    const markAsReadButton = screen.getAllByLabelText('mark as read')[0];
    fireEvent.click(markAsReadButton);

    // Verify markMessageAsRead was called with correct message ID
    expect(MessageService.markMessageAsRead).toHaveBeenCalledWith(1);

    // Verify fetchMessages was called again to refresh the list
    await waitFor(() => {
      expect(MessageService.fetchMessages).toHaveBeenCalledTimes(2);
    });
  });

  it('handles mark as unread action correctly', async () => {
    // Create mock messages with at least one read message
    const mockMessages = createMockMessages(3);
    mockMessages[0].is_read = true;

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Mock markMessageAsUnread to return success
    (MessageService.markMessageAsUnread as jest.Mock).mockResolvedValue({ success: true });

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on mark as unread button for a read message
    const markAsUnreadButton = screen.getAllByLabelText('mark as unread')[0];
    fireEvent.click(markAsUnreadButton);

    // Verify markMessageAsUnread was called with correct message ID
    expect(MessageService.markMessageAsUnread).toHaveBeenCalledWith(1);

    // Verify fetchMessages was called again to refresh the list
    await waitFor(() => {
      expect(MessageService.fetchMessages).toHaveBeenCalledTimes(2);
    });
  });

  it('calls onMessageSelect when a message row is clicked', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Create a mock onMessageSelect function
    const onMessageSelect = jest.fn();

    // Render the MessageInbox component with the mock onMessageSelect prop
    renderWithProviders(<MessageInbox onMessageSelect={onMessageSelect} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Click on a message row
    const messageRow = screen.getAllByRole('row')[1]; // Skip header row
    fireEvent.click(messageRow);

    // Verify onMessageSelect was called with the correct message
    expect(onMessageSelect).toHaveBeenCalledWith(mockMessages[0]);
  });

  it('handles error state correctly', async () => {
    // Mock fetchMessages to reject with an error
    (MessageService.fetchMessages as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    // Render the MessageInbox component
    renderWithProviders(<MessageInbox />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });

    // Click on retry button
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    // Verify fetchMessages was called again
    expect(MessageService.fetchMessages).toHaveBeenCalledTimes(2);
  });

  it('filters messages by applicationId when provided', async () => {
    // Create mock messages
    const mockMessages = createMockMessages(3);

    // Mock fetchMessages to return the mock messages
    (MessageService.fetchMessages as jest.Mock).mockResolvedValue({ data: mockMessages, meta: { total: 3, last_page: 1 } });

    // Render the MessageInbox component with an applicationId prop
    renderWithProviders(<MessageInbox applicationId={123} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton-table')).not.toBeInTheDocument();
    });

    // Verify fetchMessages was called with the correct applicationId parameter
    expect(MessageService.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ application_id: 123 }));
  });
});