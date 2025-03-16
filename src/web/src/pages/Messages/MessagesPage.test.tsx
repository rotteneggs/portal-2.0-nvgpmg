import React from 'react'; // react v18.0.0
import { screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import { jest } from '@testing-library/jest-dom'; // jest v29.0.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom v6.8.1
import MessagesPage from './MessagesPage';
import { renderWithProviders } from '../../utils/testUtils';
import MessageInbox from '../../components/Messages/MessageInbox';

// Mock useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
  useLocation: jest.fn()
}));

// Describe the test suite for the MessagesPage component
describe('MessagesPage', () => {
  // Mock useNavigate hook
  const mockNavigate = jest.fn();
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);

  // Mock useParams hook
  const mockUseParams = useParams as jest.Mock;

  // Mock useLocation hook
  const mockUseLocation = useLocation as jest.Mock;
  mockUseLocation.mockReturnValue({
    pathname: '/messages',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  });

  // Mock MessageInbox component
  const MockMessageInbox = jest.fn();
  jest.mock('../../components/Messages/MessageInbox', () => ({
    __esModule: true,
    default: (props: any) => {
      MockMessageInbox(props);
      return <div data-testid="message-inbox"></div>;
    },
  }));

  // Setup function that runs before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up default mock implementations for React Router hooks
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockUseParams.mockReturnValue({});
  });

  // Test that the component renders with the correct page title
  test('renders the messages page with correct title', () => {
    // Render the MessagesPage component with providers
    renderWithProviders(<MessagesPage />);

    // Verify that 'Messaging Center' title is displayed
    const titleElement = screen.getByText(/Messages/i);
    expect(titleElement).toBeInTheDocument();

    // Verify that the compose button is rendered
    const composeButton = screen.getByText(/Compose/i);
    expect(composeButton).toBeInTheDocument();
  });

  // Test that clicking the compose button navigates to the compose message page
  test('navigates to compose message page when compose button is clicked', () => {
    // Render the MessagesPage component with providers
    renderWithProviders(<MessagesPage />);

    // Find and click the compose message button
    const composeButton = screen.getByText(/Compose/i);
    fireEvent.click(composeButton);

    // Verify that navigate was called with the correct path '/messages/compose'
    expect(mockNavigate).toHaveBeenCalledWith('/messages/compose');
  });

  // Test that applicationId is included in navigation when provided
  test('includes applicationId in navigation when provided', () => {
    // Mock useParams to return an applicationId
    mockUseParams.mockReturnValue({ applicationId: '123' });

    // Render the MessagesPage component with providers
    renderWithProviders(<MessagesPage />);

    // Find and click the compose message button
    const composeButton = screen.getByText(/Compose/i);
    fireEvent.click(composeButton);

    // Verify that navigate was called with a path including the applicationId
    expect(mockNavigate).toHaveBeenCalledWith('/messages/compose?applicationId=123');
  });

  // Test that the correct props are passed to the MessageInbox component
  test('passes correct props to MessageInbox component', () => {
    // Mock the MessageInbox component
    const mockOnMessageSelect = jest.fn();

    // Render the MessagesPage component with providers
    renderWithProviders(<MessagesPage onMessageSelect={mockOnMessageSelect} />);

    // Verify that MessageInbox was called with the correct props
    expect(MockMessageInbox).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: undefined,
        onMessageSelect: expect.any(Function),
      })
    );
  });

  // Test that selecting a message navigates to the correct message view
  test('handles message selection correctly', () => {
    // Render the MessagesPage component with providers
    renderWithProviders(<MessagesPage />);

    // Find the MessageInbox component
    const messageInboxElement = screen.getByTestId('message-inbox');

    // Simulate message selection by calling the onMessageSelect prop
    const onMessageSelectProp = MockMessageInbox.mock.calls[0][0].onMessageSelect;
    const mockMessage = { id: 456 };
    onMessageSelectProp(mockMessage);

    // Verify that navigate was called with the correct message view path
    expect(mockNavigate).toHaveBeenCalledWith('/messages/view/456');
  });
});