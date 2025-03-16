import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import {
  ApplicationsState,
  Application,
  ApplicationListItem,
  ApplicationFormStep,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  ApplicationFilter,
  ApplicationCompletionStatus
} from '../../types/application';
import { Nullable } from '../../types/common';
import {
  getApplications,
  getApplication,
  createApplication as apiCreateApplication,
  updateApplication as apiUpdateApplication,
  submitApplication as apiSubmitApplication,
  deleteApplication as apiDeleteApplication,
  checkApplicationComplete as apiCheckApplicationComplete,
  getRequiredDocuments,
  getMissingDocuments
} from '../../api/applications';

/**
 * Initial state for the applications slice
 */
const initialState: ApplicationsState = {
  applications: [],
  currentApplication: null,
  currentStep: ApplicationFormStep.PERSONAL_INFORMATION,
  loading: false,
  error: null,
  requiredDocuments: [],
  missingDocuments: [],
  completionStatus: null
};

/**
 * Async thunk for fetching applications list
 */
export const fetchApplicationsThunk = createAsyncThunk(
  'applications/fetchApplications',
  async (filters: ApplicationFilter) => {
    try {
      return await getApplications(filters);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching a specific application
 */
export const fetchApplicationThunk = createAsyncThunk(
  'applications/fetchApplication',
  async (id: number) => {
    try {
      return await getApplication(id, true, true);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for creating a new application
 */
export const createApplicationThunk = createAsyncThunk(
  'applications/createApplication',
  async (applicationData: ApplicationCreateRequest) => {
    try {
      return await apiCreateApplication(applicationData);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for updating an application
 */
export const updateApplicationThunk = createAsyncThunk(
  'applications/updateApplication',
  async ({ id, applicationData }: { id: number; applicationData: ApplicationUpdateRequest }) => {
    try {
      return await apiUpdateApplication(id, applicationData);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for submitting an application
 */
export const submitApplicationThunk = createAsyncThunk(
  'applications/submitApplication',
  async (id: number) => {
    try {
      return await apiSubmitApplication(id);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for deleting an application
 */
export const deleteApplicationThunk = createAsyncThunk(
  'applications/deleteApplication',
  async (id: number) => {
    try {
      await apiDeleteApplication(id);
      return id;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for checking if an application is complete
 */
export const checkApplicationCompleteThunk = createAsyncThunk(
  'applications/checkApplicationComplete',
  async (id: number) => {
    try {
      return await apiCheckApplicationComplete(id);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching required documents for an application
 */
export const fetchRequiredDocumentsThunk = createAsyncThunk(
  'applications/fetchRequiredDocuments',
  async (id: number) => {
    try {
      return await getRequiredDocuments(id);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Async thunk for fetching missing documents for an application
 */
export const fetchMissingDocumentsThunk = createAsyncThunk(
  'applications/fetchMissingDocuments',
  async (id: number) => {
    try {
      return await getMissingDocuments(id);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Applications Redux slice with reducers and extra reducers for async thunks
 */
export const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    /**
     * Set the current step in the multi-step application form
     */
    setCurrentStep: (state, action: PayloadAction<ApplicationFormStep>) => {
      state.currentStep = action.payload;
    },
    
    /**
     * Reset the applications state to initial values
     */
    resetApplicationState: () => {
      return initialState;
    },
    
    /**
     * Clear any error in the applications state
     */
    clearApplicationError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch applications list reducers
    builder
      .addCase(fetchApplicationsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationsThunk.fulfilled, (state, action) => {
        state.applications = action.payload;
        state.loading = false;
      })
      .addCase(fetchApplicationsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch applications';
      })
    
    // Fetch single application reducers
    builder
      .addCase(fetchApplicationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationThunk.fulfilled, (state, action) => {
        state.currentApplication = action.payload;
        state.loading = false;
      })
      .addCase(fetchApplicationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch application details';
      })
    
    // Create application reducers
    builder
      .addCase(createApplicationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApplicationThunk.fulfilled, (state, action) => {
        state.currentApplication = action.payload;
        // Add the new application to the applications list
        const newListItem: ApplicationListItem = {
          id: action.payload.id,
          application_type: action.payload.application_type,
          academic_term: action.payload.academic_term,
          academic_year: action.payload.academic_year,
          status: action.payload.current_status?.status || 'draft',
          is_submitted: action.payload.is_submitted,
          submitted_at: action.payload.submitted_at,
          created_at: action.payload.created_at,
          updated_at: action.payload.updated_at,
          completion_percentage: 0
        };
        state.applications.push(newListItem);
        state.loading = false;
        state.currentStep = ApplicationFormStep.PERSONAL_INFORMATION;
      })
      .addCase(createApplicationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create application';
      })
    
    // Update application reducers
    builder
      .addCase(updateApplicationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateApplicationThunk.fulfilled, (state, action) => {
        state.currentApplication = action.payload;
        // Update the application in the applications list
        const index = state.applications.findIndex(app => app.id === action.payload.id);
        if (index !== -1) {
          state.applications[index] = {
            ...state.applications[index],
            updated_at: action.payload.updated_at
          };
        }
        state.loading = false;
      })
      .addCase(updateApplicationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update application';
      })
    
    // Submit application reducers
    builder
      .addCase(submitApplicationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitApplicationThunk.fulfilled, (state, action) => {
        state.currentApplication = action.payload;
        // Update the application in the applications list
        const index = state.applications.findIndex(app => app.id === action.payload.id);
        if (index !== -1) {
          state.applications[index] = {
            ...state.applications[index],
            is_submitted: true,
            submitted_at: action.payload.submitted_at,
            status: action.payload.current_status?.status || state.applications[index].status
          };
        }
        state.loading = false;
      })
      .addCase(submitApplicationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to submit application';
      })
    
    // Delete application reducers
    builder
      .addCase(deleteApplicationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteApplicationThunk.fulfilled, (state, action) => {
        // Remove the deleted application from the list
        state.applications = state.applications.filter(app => app.id !== action.payload);
        // Clear current application if it was the one deleted
        if (state.currentApplication && state.currentApplication.id === action.payload) {
          state.currentApplication = null;
        }
        state.loading = false;
      })
      .addCase(deleteApplicationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete application';
      })
    
    // Check application completion reducers
    builder
      .addCase(checkApplicationCompleteThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkApplicationCompleteThunk.fulfilled, (state, action) => {
        state.completionStatus = action.payload;
        state.loading = false;
        
        // Update the completion percentage in the applications list
        if (state.currentApplication) {
          const index = state.applications.findIndex(app => app.id === state.currentApplication?.id);
          if (index !== -1) {
            state.applications[index] = {
              ...state.applications[index],
              completion_percentage: action.payload.completionPercentage
            };
          }
        }
      })
      .addCase(checkApplicationCompleteThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to check application completeness';
      })
    
    // Fetch required documents reducers
    builder
      .addCase(fetchRequiredDocumentsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequiredDocumentsThunk.fulfilled, (state, action) => {
        state.requiredDocuments = action.payload;
        state.loading = false;
      })
      .addCase(fetchRequiredDocumentsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch required documents';
      })
    
    // Fetch missing documents reducers
    builder
      .addCase(fetchMissingDocumentsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMissingDocumentsThunk.fulfilled, (state, action) => {
        state.missingDocuments = action.payload;
        state.loading = false;
      })
      .addCase(fetchMissingDocumentsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch missing documents';
      })
  }
});

// Export the action creators
export const { setCurrentStep, resetApplicationState, clearApplicationError } = applicationsSlice.actions;

// Export async thunks with more recognizable names
export const fetchApplications = fetchApplicationsThunk;
export const fetchApplication = fetchApplicationThunk;
export const createApplication = createApplicationThunk;
export const updateApplication = updateApplicationThunk;
export const submitApplication = submitApplicationThunk;
export const deleteApplication = deleteApplicationThunk;
export const checkApplicationComplete = checkApplicationCompleteThunk;
export const fetchRequiredDocuments = fetchRequiredDocumentsThunk;
export const fetchMissingDocuments = fetchMissingDocumentsThunk;

// Selectors
export const selectApplications = (state: { applications: ApplicationsState }) => 
  state.applications.applications;

export const selectCurrentApplication = (state: { applications: ApplicationsState }) => 
  state.applications.currentApplication;

export const selectCurrentStep = (state: { applications: ApplicationsState }) => 
  state.applications.currentStep;

export const selectApplicationsLoading = (state: { applications: ApplicationsState }) => 
  state.applications.loading;

export const selectApplicationsError = (state: { applications: ApplicationsState }) => 
  state.applications.error;

export const selectRequiredDocuments = (state: { applications: ApplicationsState }) => 
  state.applications.requiredDocuments;

export const selectMissingDocuments = (state: { applications: ApplicationsState }) => 
  state.applications.missingDocuments;

export const selectCompletionStatus = (state: { applications: ApplicationsState }) => 
  state.applications.completionStatus;

// Export the slice as default
export default applicationsSlice;