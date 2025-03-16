import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import {
  FinancialAidState,
  FinancialAidApplication,
  FinancialAidDocument,
  FinancialAidDocumentType,
  CreateFinancialAidApplicationRequest,
  UpdateFinancialAidApplicationRequest,
  FinancialAidFilter,
  Nullable
} from '../../types/financialAid';
import {
  getFinancialAidApplications,
  getFinancialAidApplication,
  getFinancialAidApplicationByApplication,
  createFinancialAidApplication,
  updateFinancialAidApplication,
  submitFinancialAidApplication,
  deleteFinancialAidApplication,
  getFinancialAidDocuments,
  uploadFinancialAidDocument,
  deleteFinancialAidDocument,
  getRequiredDocuments,
  getMissingDocuments,
  checkApplicationComplete
} from '../../api/financialAid';

// Initial state
const initialState: FinancialAidState = {
  applications: [],
  currentApplication: null,
  documents: [],
  loading: false,
  error: null,
  requiredDocuments: [],
  missingDocuments: [],
  completionStatus: null
};

// Async thunks
export const fetchFinancialAidApplicationsThunk = createAsyncThunk(
  'financialAid/fetchApplications',
  async (filters?: FinancialAidFilter) => {
    return await getFinancialAidApplications(filters);
  }
);

export const fetchFinancialAidApplicationThunk = createAsyncThunk(
  'financialAid/fetchApplication',
  async (id: number) => {
    return await getFinancialAidApplication(id, true);
  }
);

export const fetchFinancialAidApplicationByApplicationThunk = createAsyncThunk(
  'financialAid/fetchApplicationByApplication',
  async (applicationId: number) => {
    return await getFinancialAidApplicationByApplication(applicationId, true);
  }
);

export const createFinancialAidApplicationThunk = createAsyncThunk(
  'financialAid/createApplication',
  async (applicationData: CreateFinancialAidApplicationRequest) => {
    return await createFinancialAidApplication(applicationData);
  }
);

export const updateFinancialAidApplicationThunk = createAsyncThunk(
  'financialAid/updateApplication',
  async ({ id, applicationData }: { id: number; applicationData: UpdateFinancialAidApplicationRequest }) => {
    return await updateFinancialAidApplication(id, applicationData);
  }
);

export const submitFinancialAidApplicationThunk = createAsyncThunk(
  'financialAid/submitApplication',
  async (id: number) => {
    return await submitFinancialAidApplication(id);
  }
);

export const deleteFinancialAidApplicationThunk = createAsyncThunk(
  'financialAid/deleteApplication',
  async (id: number) => {
    await deleteFinancialAidApplication(id);
    return id;
  }
);

export const fetchFinancialAidDocumentsThunk = createAsyncThunk(
  'financialAid/fetchDocuments',
  async (financialAidApplicationId: number) => {
    return await getFinancialAidDocuments(financialAidApplicationId, undefined, true);
  }
);

export const uploadFinancialAidDocumentThunk = createAsyncThunk(
  'financialAid/uploadDocument',
  async ({ financialAidApplicationId, file, documentType }: { 
    financialAidApplicationId: number; 
    file: File; 
    documentType: FinancialAidDocumentType 
  }) => {
    return await uploadFinancialAidDocument(financialAidApplicationId, file, documentType);
  }
);

export const deleteFinancialAidDocumentThunk = createAsyncThunk(
  'financialAid/deleteDocument',
  async ({ financialAidApplicationId, documentId }: { financialAidApplicationId: number; documentId: number }) => {
    await deleteFinancialAidDocument(financialAidApplicationId, documentId);
    return { financialAidApplicationId, documentId };
  }
);

export const fetchRequiredDocumentsThunk = createAsyncThunk(
  'financialAid/fetchRequiredDocuments',
  async (financialAidApplicationId: number) => {
    return await getRequiredDocuments(financialAidApplicationId);
  }
);

export const fetchMissingDocumentsThunk = createAsyncThunk(
  'financialAid/fetchMissingDocuments',
  async (financialAidApplicationId: number) => {
    return await getMissingDocuments(financialAidApplicationId);
  }
);

export const checkApplicationCompleteThunk = createAsyncThunk(
  'financialAid/checkApplicationComplete',
  async (financialAidApplicationId: number) => {
    const response = await checkApplicationComplete(financialAidApplicationId);
    return {
      complete: response.is_complete,
      missingDocuments: response.missing_documents || []
    };
  }
);

// Create the slice
const financialAidSlice = createSlice({
  name: 'financialAid',
  initialState,
  reducers: {
    resetFinancialAidState: () => initialState,
    clearFinancialAidError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch applications
    builder.addCase(fetchFinancialAidApplicationsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFinancialAidApplicationsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.applications = action.payload;
    });
    builder.addCase(fetchFinancialAidApplicationsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch applications';
    });

    // Fetch single application
    builder.addCase(fetchFinancialAidApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFinancialAidApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentApplication = action.payload;
      if (action.payload.documents) {
        state.documents = action.payload.documents;
      }
    });
    builder.addCase(fetchFinancialAidApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch application';
    });

    // Fetch application by parent application ID
    builder.addCase(fetchFinancialAidApplicationByApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFinancialAidApplicationByApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentApplication = action.payload;
      if (action.payload.documents) {
        state.documents = action.payload.documents;
      }
    });
    builder.addCase(fetchFinancialAidApplicationByApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch application';
    });

    // Create application
    builder.addCase(createFinancialAidApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createFinancialAidApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentApplication = action.payload;
      state.applications.push(action.payload);
    });
    builder.addCase(createFinancialAidApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to create application';
    });

    // Update application
    builder.addCase(updateFinancialAidApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateFinancialAidApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentApplication = action.payload;
      state.applications = state.applications.map(app => 
        app.id === action.payload.id ? action.payload : app
      );
    });
    builder.addCase(updateFinancialAidApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to update application';
    });

    // Submit application
    builder.addCase(submitFinancialAidApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(submitFinancialAidApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.currentApplication = action.payload;
      state.applications = state.applications.map(app => 
        app.id === action.payload.id ? action.payload : app
      );
    });
    builder.addCase(submitFinancialAidApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to submit application';
    });

    // Delete application
    builder.addCase(deleteFinancialAidApplicationThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteFinancialAidApplicationThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.applications = state.applications.filter(app => app.id !== action.payload);
      if (state.currentApplication && state.currentApplication.id === action.payload) {
        state.currentApplication = null;
      }
    });
    builder.addCase(deleteFinancialAidApplicationThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete application';
    });

    // Fetch documents
    builder.addCase(fetchFinancialAidDocumentsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFinancialAidDocumentsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.documents = action.payload;
    });
    builder.addCase(fetchFinancialAidDocumentsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch documents';
    });

    // Upload document
    builder.addCase(uploadFinancialAidDocumentThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadFinancialAidDocumentThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.documents.push(action.payload);
    });
    builder.addCase(uploadFinancialAidDocumentThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to upload document';
    });

    // Delete document
    builder.addCase(deleteFinancialAidDocumentThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteFinancialAidDocumentThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.documents = state.documents.filter(doc => doc.id !== action.payload.documentId);
    });
    builder.addCase(deleteFinancialAidDocumentThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to delete document';
    });

    // Fetch required documents
    builder.addCase(fetchRequiredDocumentsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRequiredDocumentsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.requiredDocuments = action.payload;
    });
    builder.addCase(fetchRequiredDocumentsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch required documents';
    });

    // Fetch missing documents
    builder.addCase(fetchMissingDocumentsThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchMissingDocumentsThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.missingDocuments = action.payload;
    });
    builder.addCase(fetchMissingDocumentsThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch missing documents';
    });

    // Check application completeness
    builder.addCase(checkApplicationCompleteThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(checkApplicationCompleteThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.completionStatus = action.payload;
    });
    builder.addCase(checkApplicationCompleteThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to check application completeness';
    });
  }
});

// Export actions
export const { resetFinancialAidState, clearFinancialAidError } = financialAidSlice.actions;

// Export Thunks with more convenient names
export const fetchFinancialAidApplications = fetchFinancialAidApplicationsThunk;
export const fetchFinancialAidApplication = fetchFinancialAidApplicationThunk;
export const fetchFinancialAidApplicationByApplication = fetchFinancialAidApplicationByApplicationThunk;
export const createFinancialAidApplication = createFinancialAidApplicationThunk;
export const updateFinancialAidApplication = updateFinancialAidApplicationThunk;
export const submitFinancialAidApplication = submitFinancialAidApplicationThunk;
export const deleteFinancialAidApplication = deleteFinancialAidApplicationThunk;
export const fetchFinancialAidDocuments = fetchFinancialAidDocumentsThunk;
export const uploadFinancialAidDocument = uploadFinancialAidDocumentThunk;
export const deleteFinancialAidDocument = deleteFinancialAidDocumentThunk;
export const fetchRequiredDocuments = fetchRequiredDocumentsThunk;
export const fetchMissingDocuments = fetchMissingDocumentsThunk;
export const checkApplicationComplete = checkApplicationCompleteThunk;

// Selectors
export const selectFinancialAidApplications = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.applications;

export const selectCurrentFinancialAidApplication = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.currentApplication;

export const selectFinancialAidDocuments = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.documents;

export const selectFinancialAidLoading = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.loading;

export const selectFinancialAidError = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.error;

export const selectRequiredDocuments = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.requiredDocuments;

export const selectMissingDocuments = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.missingDocuments;

export const selectCompletionStatus = (state: { financialAid: FinancialAidState }) => 
  state.financialAid.completionStatus;

export default financialAidSlice;