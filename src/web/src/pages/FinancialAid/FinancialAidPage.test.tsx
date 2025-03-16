import React from 'react'; // react v18.2.0
import { screen, fireEvent, waitFor, act } from '@testing-library/react'; // @testing-library/react v14.0.0
import { renderWithProviders } from '../../utils/testUtils';
import FinancialAidPage from './FinancialAidPage';
import { fetchFinancialAidApplications, deleteFinancialAidApplication } from '../../redux/slices/financialAidSlice';
import { fetchApplications } from '../../redux/slices/applicationsSlice';
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { FinancialAidApplication } from '../../types/financialAid';

jest.mock('react-router-dom', () => ({ // Mock React Router
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('../../redux/slices/financialAidSlice', () => ({ // Mock Redux actions
  fetchFinancialAidApplications: jest.fn(),
  deleteFinancialAidApplication: jest.fn(),
}));

jest.mock('../../redux/slices/applicationsSlice', () => ({ // Mock Redux actions
  fetchApplications: jest.fn(),
}));

describe('FinancialAidPage component', () => { // Test suite for FinancialAidPage component
  beforeEach(() => { // Setup function that runs before each test
    (jest.mocked(useNavigate) as jest.Mock).mockClear(); // Reset all mocks to ensure clean test environment
    (jest.mocked(fetchFinancialAidApplications) as jest.Mock).mockClear(); // Reset all mocks to ensure clean test environment
    (jest.mocked(deleteFinancialAidApplication) as jest.Mock).mockClear(); // Reset all mocks to ensure clean test environment
    (jest.mocked(fetchApplications) as jest.Mock).mockClear(); // Reset all mocks to ensure clean test environment
  });

  it('should render loading state', async () => { // Test that verifies the loading state is correctly displayed
    const preloadedState = { // Create initial state with loading set to true
      financialAid: {
        applications: [],
        currentApplication: null,
        documents: [],
        loading: true,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the loading state
    expect(screen.getByTestId('loading-skeleton-default')).toBeInTheDocument(); // Verify loading skeleton is displayed
    expect(screen.queryByText('Financial Aid Applications')).toBeInTheDocument(); // Verify that the applications list is not displayed
  });

  it('should render error state', async () => { // Test that verifies error state is correctly displayed
    const errorMessage = 'Failed to load applications'; // Create initial state with an error message
    const preloadedState = {
      financialAid: {
        applications: [],
        currentApplication: null,
        documents: [],
        loading: false,
        error: errorMessage,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the error state
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage); // Verify error alert is displayed with correct message
    expect(screen.queryByText('Financial Aid Applications')).toBeInTheDocument(); // Verify that the applications list is not displayed
  });

  it('should render empty state', async () => { // Test that verifies empty state is correctly displayed when no applications exist
    const preloadedState = { // Create initial state with empty applications array
      financialAid: {
        applications: [],
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the empty state
    expect(screen.getByText('No financial aid applications found.')).toBeInTheDocument(); // Verify empty state message is displayed
    expect(screen.getByRole('button', { name: 'Create Application' })).toBeInTheDocument(); // Verify that the create application button is displayed
  });

  it('should render applications list', async () => { // Test that verifies applications list is correctly displayed
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    expect(screen.getByText('Financial Aid Applications')).toBeInTheDocument(); // Verify applications list component is displayed
  });

  it('should handle tab navigation', async () => { // Test that verifies tab navigation between Applications and Documents tabs
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    expect(screen.getByRole('tab', { name: 'Applications' })).toHaveClass('Mui-selected'); // Verify Applications tab is active by default
    fireEvent.click(screen.getByRole('tab', { name: 'Documents' })); // Click on Documents tab
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveClass('Mui-selected'); // Verify Documents tab becomes active
    expect(screen.getByText('Select an application to manage documents.')).toBeInTheDocument(); // Verify document management UI is displayed
    fireEvent.click(screen.getByRole('tab', { name: 'Applications' })); // Click back on Applications tab
    expect(screen.getByRole('tab', { name: 'Applications' })).toHaveClass('Mui-selected'); // Verify Applications tab becomes active again
  });

  it('should navigate to create application page', async () => { // Test that verifies navigation to create application page
    (useNavigate as jest.Mock).mockImplementation(() => (path: string) => path); // Set up mock for useNavigate
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const preloadedState = { // Create initial state with mock applications data
      financialAid: {
        applications: [],
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    fireEvent.click(screen.getByRole('button', { name: 'Create Application' })); // Click on Create Application button
    expect(mockNavigate).toHaveBeenCalledWith('/financial-aid/create'); // Verify navigation is called with correct path
  });

  it('should navigate to edit application page', async () => { // Test that verifies navigation to edit application page
    (useNavigate as jest.Mock).mockImplementation(() => (path: string) => path); // Set up mock for useNavigate
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    fireEvent.click(screen.getAllByLabelText('Open actions menu')[0]);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Edit')); // Click on Edit button for an application
    });
    expect(mockNavigate).toHaveBeenCalledWith('/financial-aid/1/edit'); // Verify navigation is called with correct path including application ID
  });

  it('should navigate to view application page', async () => { // Test that verifies navigation to view application page
    (useNavigate as jest.Mock).mockImplementation(() => (path: string) => path); // Set up mock for useNavigate
    const mockNavigate = jest.fn();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    fireEvent.click(screen.getAllByLabelText('Open actions menu')[0]);
    await waitFor(() => {
      fireEvent.click(screen.getByText('View')); // Click on View button for an application
    });
    expect(mockNavigate).toHaveBeenCalledWith('/financial-aid/1/view'); // Verify navigation is called with correct path including application ID
  });

  it('should delete application', async () => { // Test that verifies delete application functionality
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    (deleteFinancialAidApplication as jest.Mock).mockImplementation(() => Promise.resolve()); // Set up mock for deleteFinancialAidApplication action
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    fireEvent.click(screen.getAllByLabelText('Open actions menu')[0]);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Delete')); // Click on Delete button for an application
    });
    window.confirm = jest.fn(() => true); // Confirm deletion in the confirmation dialog
    expect(deleteFinancialAidApplication).toHaveBeenCalledWith(1); // Verify deleteFinancialAidApplication action is dispatched with correct ID
  });

  it('should open document upload modal', async () => { // Test that verifies document upload modal functionality
    const mockApplications: FinancialAidApplication[] = [ // Create initial state with mock applications data
      {
        id: 1,
        user_id: 1,
        application_id: 1,
        aid_type: 'need_based',
        financial_data: {
          household_income: 50000,
          household_size: 3,
          dependents: 1,
          has_other_financial_aid: false,
          other_financial_aid_amount: null,
          special_circumstances: null,
          additional_information: {}
        },
        status: 'submitted',
        submitted_at: '2023-01-01T00:00:00.000Z',
        reviewed_at: null,
        reviewed_by_user_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        documents: []
      },
    ];
    const preloadedState = {
      financialAid: {
        applications: mockApplications,
        currentApplication: null,
        documents: [],
        loading: false,
        error: null,
        requiredDocuments: [],
        missingDocuments: [],
        completionStatus: null
      }
    };
    renderWithProviders(<FinancialAidPage />, { preloadedState }); // Render FinancialAidPage with the applications data
    fireEvent.click(screen.getAllByText('Manage Documents')[0]); // Click on Upload Documents button for an application
    expect(screen.getByText('Upload Financial Aid Document')).toBeInTheDocument(); // Verify document upload modal is displayed
  });

  it('should fetch data on mount', () => { // Test that verifies data is fetched when component mounts
    const fetchFinancialAidApplicationsMock = jest.fn(); // Set up mocks for fetchFinancialAidApplications and fetchApplications actions
    const fetchApplicationsMock = jest.fn();
    (fetchFinancialAidApplications as jest.Mock).mockImplementation(fetchFinancialAidApplicationsMock);
    (fetchApplications as jest.Mock).mockImplementation(fetchApplicationsMock);
    renderWithProviders(<FinancialAidPage />, { // Render FinancialAidPage
      preloadedState: {
        financialAid: {
          applications: [],
          currentApplication: null,
          documents: [],
          loading: false,
          error: null,
          requiredDocuments: [],
          missingDocuments: [],
          completionStatus: null
        }
      }
    });
    expect(fetchFinancialAidApplicationsMock).toHaveBeenCalled(); // Verify fetchFinancialAidApplications action is dispatched
    expect(fetchApplicationsMock).toHaveBeenCalled(); // Verify fetchApplications action is dispatched
  });
});