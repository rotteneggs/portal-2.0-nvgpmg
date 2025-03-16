import React from 'react'; // react v18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event v14.4.3

import DashboardPage from './DashboardPage';
import { renderWithProviders } from '../utils/testUtils';
import { selectCurrentApplication, selectApplicationsLoading, fetchApplication } from '../redux/slices/applicationsSlice';
import { selectUserProfile } from '../redux/slices/userSlice';
import { ApplicationStatus } from '../types/application';

// Mock useNavigate hook for testing navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Use actual implementation for other parts
  useNavigate: () => jest.fn(), // Mock useNavigate
}));

// Mock Redux selectors and thunks for applications
jest.mock('../redux/slices/applicationsSlice', () => ({
  ...jest.requireActual('../redux/slices/applicationsSlice'),
  selectCurrentApplication: jest.fn(),
  selectApplicationsLoading: jest.fn(),
  fetchApplication: jest.fn(),
}));

// Mock Redux selectors for user profile
jest.mock('../redux/slices/userSlice', () => ({
  ...jest.requireActual('../redux/slices/userSlice'),
  selectUserProfile: jest.fn(),
}));

/**
 * Helper function to set up the component for testing with different states
 * @param options - Options to override default mock implementations
 * @returns Rendered component and utilities
 */
const setup = (options: {
  currentApplication?: any;
  applicationsLoading?: boolean;
  userProfile?: any;
  mockDispatch?: any;
} = {}) => {
  // Create default mock application data
  const defaultApplication = {
    id: 1,
    application_type: 'undergraduate',
    academic_term: 'fall',
    academic_year: '2023',
    current_status: { status: 'submitted' },
    updated_at: '2023-03-01T00:00:00.000Z',
  };

  // Create default mock user profile data
  const defaultUserProfile = {
    first_name: 'John',
    last_name: 'Doe',
  };

  // Override defaults with provided options
  const mockCurrentApplication = options.currentApplication ?? defaultApplication;
  const mockApplicationsLoading = options.applicationsLoading ?? false;
  const mockUserProfile = options.userProfile ?? defaultUserProfile;
  const mockDispatch = options.mockDispatch ?? jest.fn();

  // Mock Redux selectors
  (selectCurrentApplication as jest.Mock).mockReturnValue(mockCurrentApplication);
  (selectApplicationsLoading as jest.Mock).mockReturnValue(mockApplicationsLoading);
  (selectUserProfile as jest.Mock).mockReturnValue(mockUserProfile);
  (fetchApplication as jest.Mock).mockReturnValue(() => () => Promise.resolve());

  // Render DashboardPage with renderWithProviders and preloaded state
  const { ...utils } = renderWithProviders(<DashboardPage />, {
    preloadedState: {
      applications: {
        applications: [],
        currentApplication: mockCurrentApplication,
        loading: mockApplicationsLoading,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null,
        currentStep: 'personal_information',
      },
      user: {
        profile: mockUserProfile,
        loading: false,
        error: null,
        profilePictureUrl: null,
        passwordChangeSuccess: false,
        passwordChangeMessage: null,
      },
    },
    store: {
      dispatch: mockDispatch,
    },
  });

  return { ...utils, mockDispatch };
};

describe('DashboardPage', () => {
  it('renders loading state', () => {
    // Set up component with loading state set to true
    setup({ applicationsLoading: true });

    // Verify loading skeletons are displayed
    expect(screen.getAllByTestId('loading-skeleton-card')).toHaveLength(3);
    expect(screen.getByTestId('loading-skeleton-rectangular')).toBeInTheDocument();

    // Verify main content is not displayed
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });

  it('renders empty state', () => {
    // Set up component with currentApplication set to null
    setup({ currentApplication: null });

    // Verify empty state message is displayed
    expect(screen.getByText('No application found')).toBeInTheDocument();

    // Verify 'Create Application' button is present
    expect(screen.getByRole('button', { name: 'Create Application' })).toBeInTheDocument();

    // Verify main dashboard components are not displayed
    expect(screen.queryByText('Application Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Steps')).not.toBeInTheDocument();
  });

  it('renders dashboard with application data', () => {
    // Set up component with mock application data
    setup();

    // Verify StatusCard component is rendered with correct props
    expect(screen.getByText('Application Status')).toBeInTheDocument();

    // Verify NextSteps component is rendered
    expect(screen.getByText('Next Steps')).toBeInTheDocument();

    // Verify ImportantDates component is rendered
    expect(screen.getByText('Important Dates')).toBeInTheDocument();

    // Verify RecentMessages component is rendered
    expect(screen.getByText('Recent Messages')).toBeInTheDocument();

    // Verify DocumentStatus component is rendered
    expect(screen.getByText('Document Status')).toBeInTheDocument();

    // Verify ApplicationTimeline component is rendered
    expect(screen.getByText('Application Timeline')).toBeInTheDocument();
  });

  it('navigates to application status page', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with mock application data
    setup();

    // Find and click the StatusCard component
    const statusCard = screen.getByText('Application Status');
    await userEvent.click(statusCard);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/applications/status');
  });

  it('navigates to document upload page', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with mock application data
    setup();

    // Find and click the 'Upload Documents' button
    const uploadButton = screen.getByRole('button', { name: 'Upload Documents' });
    await userEvent.click(uploadButton);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/applications/1/documents');
  });

  it('navigates to payment page', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with mock application data
    setup();

    // Find and click the 'Pay Application Fee' button
    const payButton = screen.getByRole('button', { name: 'Pay Application Fee' });
    await userEvent.click(payButton);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/payments');
  });

  it('navigates to profile page', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with mock application data
    setup();

    // Find and click the 'Complete Profile' button
    const completeProfileButton = screen.getByRole('button', { name: 'Complete Profile' });
    await userEvent.click(completeProfileButton);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('navigates to messages page', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with mock application data
    setup();

    // Find and click the 'View All Messages' button
    const viewAllMessagesButton = screen.getByRole('button', { name: 'View All' });
    await userEvent.click(viewAllMessagesButton);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/messages');
  });

  it('toggles chatbot visibility', async () => {
    // Set up component with mock application data
    setup();

    // Verify chatbot is not initially visible
    expect(screen.queryByText('Admissions Assistant')).not.toBeInTheDocument();

    // Find and click the chatbot toggle button
    const chatbotToggleButton = screen.getByRole('button', { name: 'open chatbot' });
    await userEvent.click(chatbotToggleButton);

    // Verify chatbot becomes visible
    expect(screen.getByText('Admissions Assistant')).toBeInTheDocument();

    // Click the toggle button again
    await userEvent.click(chatbotToggleButton);

    // Verify chatbot becomes hidden
    await waitFor(() => {
      expect(screen.queryByText('Admissions Assistant')).not.toBeInTheDocument();
    });
  });

  it('fetches application data on mount', () => {
    // Create mock dispatch function
    const mockDispatch = jest.fn();

    // Set up component with mock dispatch
    setup({ mockDispatch });

    // Verify fetchApplication was dispatched with correct parameters
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  it('displays correct content based on application status', async () => {
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockDispatch = jest.fn();
    (fetchApplication as jest.Mock).mockReturnValue(() => () => Promise.resolve());

    // Set up component with application status DRAFT
    setup({ currentApplication: { ...setup().currentApplication, current_status: { status: ApplicationStatus.DRAFT } }, mockDispatch });

    // Verify draft-specific content is displayed
    expect(screen.getByText('Complete Profile')).toBeInTheDocument();

    // Update component with application status SUBMITTED
    setup({ currentApplication: { ...setup().currentApplication, current_status: { status: ApplicationStatus.SUBMITTED } }, mockDispatch });
    await waitFor(() => {
      expect(screen.getByText('Wait for Document Verification')).toBeInTheDocument();
    });

    // Update component with application status IN_REVIEW
    setup({ currentApplication: { ...setup().currentApplication, current_status: { status: ApplicationStatus.IN_REVIEW } }, mockDispatch });
    await waitFor(() => {
      expect(screen.queryByText('Wait for Document Verification')).toBeInTheDocument();
    });
  });
  
  it('handles create application click', async () => {
    // Mock the navigate function
    const mockNavigate = jest.fn();
    (jest.requireActual('react-router-dom').useNavigate as jest.Mock).mockReturnValue(mockNavigate);

    // Set up component with currentApplication set to null
    setup({ currentApplication: null });

    // Find and click the 'Create Application' button
    const createApplicationButton = screen.getByRole('button', { name: 'Create Application' });
    await userEvent.click(createApplicationButton);

    // Verify navigate function was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/applications/create');
  });
});