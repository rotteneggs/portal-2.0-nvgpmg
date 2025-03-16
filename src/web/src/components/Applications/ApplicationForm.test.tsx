import React from 'react'; // react v18.2.0
import { renderWithProviders, waitForComponentToPaint } from '../../utils/testUtils';
import { screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { act } from '@testing-library/react'; // @testing-library/react ^14.0.0
import ApplicationForm from './ApplicationForm';
import * as ApplicationAPI from '../../api/applications'; // src/web/src/api/applications.ts
import { ApplicationFormStep, ApplicationType, AcademicTerm } from '../../types/application'; // src/web/src/types/application.ts
import { jest } from '@jest/globals'; // jest ^29.5.0

// Mock constants for testing
const mockApplicationId = 123;
const mockApplicationResponse = {
  id: 123,
  application_type: 'UNDERGRADUATE',
  academic_term: 'FALL',
  academic_year: '2023-2024',
  application_data: {
    personal_information: {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '2000-01-01',
      gender: 'Male',
      citizenship: 'US',
    },
    contact_details: {
      email: 'john.doe@example.com',
      phone_number: '555-123-4567',
      address_line1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postal_code: '12345',
      country: 'USA',
    },
    academic_history: {
      institutions: [],
    },
    test_scores: {
      has_taken_tests: false,
      scores: [],
    },
    personal_statement: {
      statement: '',
    },
    recommendations: {
      recommendations: [],
    },
  },
  is_submitted: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

// Mock API functions
jest.mock('../../api/applications', () => ({
  createApplication: jest.fn().mockResolvedValue({ data: mockApplicationResponse }),
  updateApplication: jest.fn().mockResolvedValue({ data: mockApplicationResponse }),
  submitApplication: jest.fn().mockResolvedValue({ data: { ...mockApplicationResponse, is_submitted: true } }),
}));

// Define default props for the ApplicationForm component
const defaultProps = {
  applicationType: 'UNDERGRADUATE' as ApplicationType,
  academicTerm: 'FALL' as AcademicTerm,
  academicYear: '2023-2024',
  onSubmitSuccess: jest.fn(),
  onCancel: jest.fn(),
};

describe('ApplicationForm', () => {
  beforeEach(() => {
    (ApplicationAPI.createApplication as jest.Mock).mockClear();
    (ApplicationAPI.updateApplication as jest.Mock).mockClear();
    (ApplicationAPI.submitApplication as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with initial step', () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('navigates to next step when form is valid', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name*'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Date of Birth*'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText('Gender*'), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText('Citizenship*'), { target: { value: 'US' } });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('Contact Details')).toBeInTheDocument());
  });

  it('shows validation errors when required fields are missing', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  it('navigates to previous step when Back button is clicked', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name*'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Date of Birth*'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText('Gender*'), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText('Citizenship*'), { target: { value: 'US' } });

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('Contact Details')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByText('Personal Information')).toBeInTheDocument());
  });

  it('saves form data when values change', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'John' } });
    await waitForComponentToPaint(screen.getByLabelText('First Name*'));

    expect(ApplicationAPI.createApplication).toHaveBeenCalled();
  });

  it('updates existing application when applicationId is provided', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={mockApplicationId} initialData={mockApplicationResponse.application_data} />);
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'Updated Name' } });
    await waitForComponentToPaint(screen.getByLabelText('First Name*'));

    expect(ApplicationAPI.updateApplication).toHaveBeenCalledWith(
      mockApplicationId,
      expect.objectContaining({
        application_data: expect.objectContaining({
          personal_information: expect.objectContaining({
            first_name: 'Updated Name',
          }),
        }),
      })
    );
  });

  it('submits application when Review & Submit step is completed', async () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={mockApplicationId} initialData={mockApplicationResponse.application_data} />);
    
    // Navigate to Review & Submit step
    let nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Contact Details')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Academic History')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Test Scores')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Personal Statement')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Recommendations')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Review & Submit')).toBeInTheDocument());

    // Submit application
    fireEvent.click(screen.getByText('Submit Application'));
    await waitFor(() => expect((defaultProps.onSubmitSuccess as jest.Mock)).toHaveBeenCalled());
  });

  it('handles API errors during save', async () => {
    (ApplicationAPI.createApplication as jest.Mock).mockRejectedValue(new Error('API Error'));
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'John' } });
    await waitForComponentToPaint(screen.getByLabelText('First Name*'));

    await waitFor(() => expect(screen.getByText('API Error')).toBeInTheDocument());
  });

  it('handles API errors during submission', async () => {
    (ApplicationAPI.submitApplication as jest.Mock).mockRejectedValue(new Error('Submission Error'));
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={mockApplicationId} initialData={mockApplicationResponse.application_data} />);
    
    // Navigate to Review & Submit step
    let nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Contact Details')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Academic History')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Test Scores')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Personal Statement')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Recommendations')).toBeInTheDocument());

    nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText('Review & Submit')).toBeInTheDocument());

    // Attempt to submit application
    fireEvent.click(screen.getByText('Submit Application'));
    await waitFor(() => expect(screen.getByText('Submission Error')).toBeInTheDocument());
  });

  it('calls onCancel when Cancel button is clicked', () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('loads initial data correctly when provided', () => {
    renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={mockApplicationResponse.application_data} />);
    expect(screen.getByLabelText('First Name*')).toHaveValue('John');
    expect(screen.getByLabelText('Last Name*')).toHaveValue('Doe');
  });

  it('updates progress indicator as steps are completed', async () => {
    const { rerender } = renderWithProviders(<ApplicationForm {...defaultProps} applicationId={null} initialData={null} />);
    
    // Initial progress
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Complete Personal Information step
    fireEvent.change(screen.getByLabelText('First Name*'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Last Name*'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText('Date of Birth*'), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText('Gender*'), { target: { value: 'male' } });
    fireEvent.change(screen.getByLabelText('Citizenship*'), { target: { value: 'US' } });
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('Contact Details')).toBeInTheDocument());

    // Check updated progress
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '14');
  });
});