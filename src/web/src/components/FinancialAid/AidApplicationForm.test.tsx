import React from 'react'; // react v18.0.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0
import { act } from '@testing-library/react'; // @testing-library/react v14.0.0
import AidApplicationForm from './AidApplicationForm';
import { renderWithProviders, mockFetch } from '../../utils/testUtils';
import FinancialAidService from '../../services/FinancialAidService';
import { FinancialAidType, FinancialAidDocumentType } from '../../types/financialAid';

// Mock the FinancialAidService methods
jest.mock('../../services/FinancialAidService', () => ({
  __esModule: true, // This is important for ES module mocks
  default: {
    fetchSupportedAidTypes: jest.fn().mockResolvedValue([FinancialAidType.NEED_BASED, FinancialAidType.MERIT_BASED, FinancialAidType.SCHOLARSHIP]),
    fetchRequiredDocuments: jest.fn().mockResolvedValue([FinancialAidDocumentType.TAX_RETURN, FinancialAidDocumentType.FINANCIAL_STATEMENT]),
    createFinancialAidApplicationWithProgress: jest.fn().mockImplementation((data, onProgress) => { onProgress(100); return Promise.resolve({ id: 1, ...data }); }),
    updateFinancialAidApplicationWithProgress: jest.fn().mockImplementation((id, data, onProgress) => { onProgress(100); return Promise.resolve({ id, ...data }); }),
    uploadFinancialAidDocumentWithProgress: jest.fn().mockImplementation((id, file, type, onProgress) => { onProgress(100); return Promise.resolve({ id: 1, financial_aid_application_id: id, document_type: type, file_name: file.name }); })
  }
}));

const mockFinancialAidService = FinancialAidService as jest.Mocked<typeof FinancialAidService>;

describe('AidApplicationForm component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockFinancialAidService.fetchSupportedAidTypes.mockClear();
    mockFinancialAidService.fetchRequiredDocuments.mockClear();
    mockFinancialAidService.createFinancialAidApplicationWithProgress.mockClear();
    mockFinancialAidService.updateFinancialAidApplicationWithProgress.mockClear();
    mockFinancialAidService.uploadFinancialAidDocumentWithProgress.mockClear();
  });

  it('renders the form correctly', async () => {
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('Financial Aid Application')).toBeInTheDocument();
    expect(screen.getByText('Financial Information')).toBeInTheDocument();
    expect(screen.getByText('Household Information')).toBeInTheDocument();
    expect(screen.getByText('Aid Type')).toBeInTheDocument();
    expect(screen.getByText('Document Upload')).toBeInTheDocument();

    // Wait for the aid types to load
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Aid Type' })).toBeInTheDocument();
    });
  });

  it('loads initial data correctly when editing', async () => {
    const initialData = {
      id: 1,
      user_id: 1,
      application_id: 1,
      aid_type: FinancialAidType.NEED_BASED,
      financial_data: {
        household_income: 50000,
        household_size: 3,
        dependents: 1,
        has_other_financial_aid: false,
        other_financial_aid_amount: 0,
        special_circumstances: '',
        additional_information: {}
      },
      status: 'draft',
      submitted_at: null,
      reviewed_at: null,
      reviewed_by_user_id: null,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      documents: []
    };

    renderWithProviders(<AidApplicationForm applicationId={1} initialData={initialData} onSubmit={() => {}} onCancel={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Aid Type' })).toHaveValue(FinancialAidType.NEED_BASED);
      expect(screen.getByRole('textbox', { name: 'Household Income' })).toHaveValue('50000');
      expect(screen.getByRole('textbox', { name: 'Household Size' })).toHaveValue('3');
      expect(screen.getByRole('textbox', { name: 'Number of Dependents' })).toHaveValue('1');
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={() => {}} onCancel={() => {}} />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Aid Type is required')).toBeInTheDocument();
      expect(screen.getByText('Household Income is required')).toBeInTheDocument();
      expect(screen.getByText('Household Size is required')).toBeInTheDocument();
    });
  });

  it('handles form submission for new application', async () => {
    const onSubmit = jest.fn();
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={onSubmit} onCancel={() => {}} />);

    // Fill in the form
    fireEvent.change(screen.getByRole('combobox', { name: 'Aid Type' }), { target: { value: FinancialAidType.NEED_BASED } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Income' }), { target: { value: '50000' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Size' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Number of Dependents' }), { target: { value: '1' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockFinancialAidService.createFinancialAidApplicationWithProgress).toHaveBeenCalledTimes(1);
      expect(mockFinancialAidService.createFinancialAidApplicationWithProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          application_id: 1,
          aid_type: FinancialAidType.NEED_BASED,
          financial_data: expect.objectContaining({
            household_income: 50000,
            household_size: 3,
            dependents: 1,
          }),
        }),
        expect.any(Function)
      );
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('handles form submission for existing application', async () => {
    const onSubmit = jest.fn();
    const initialData = {
      id: 1,
      user_id: 1,
      application_id: 1,
      aid_type: FinancialAidType.NEED_BASED,
      financial_data: {
        household_income: 50000,
        household_size: 3,
        dependents: 1,
        has_other_financial_aid: false,
        other_financial_aid_amount: 0,
        special_circumstances: '',
        additional_information: {}
      },
      status: 'draft',
      submitted_at: null,
      reviewed_at: null,
      reviewed_by_user_id: null,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      documents: []
    };

    renderWithProviders(<AidApplicationForm applicationId={1} initialData={initialData} onSubmit={onSubmit} onCancel={() => {}} />);

    // Update some fields
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Income' }), { target: { value: '60000' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Size' }), { target: { value: '4' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockFinancialAidService.updateFinancialAidApplicationWithProgress).toHaveBeenCalledTimes(1);
      expect(mockFinancialAidService.updateFinancialAidApplicationWithProgress).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          application_id: 1,
          aid_type: FinancialAidType.NEED_BASED,
          financial_data: expect.objectContaining({
            household_income: 60000,
            household_size: 4,
            dependents: 1,
          }),
        }),
        expect.any(Function)
      );
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('handles document upload', async () => {
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={() => {}} onCancel={() => {}} />);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText('Upload TAX_RETURN') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(mockFinancialAidService.uploadFinancialAidDocumentWithProgress).toHaveBeenCalledTimes(1);
      expect(mockFinancialAidService.uploadFinancialAidDocumentWithProgress).toHaveBeenCalledWith(
        0,
        file,
        'TAX_RETURN',
        expect.any(Function)
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockFinancialAidService.createFinancialAidApplicationWithProgress.mockRejectedValue(new Error('API Error'));
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={() => {}} onCancel={() => {}} />);

    // Fill in the form
    fireEvent.change(screen.getByRole('combobox', { name: 'Aid Type' }), { target: { value: FinancialAidType.NEED_BASED } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Income' }), { target: { value: '50000' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Household Size' }), { target: { value: '3' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = jest.fn();
    renderWithProviders(<AidApplicationForm applicationId={1} onSubmit={() => {}} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});