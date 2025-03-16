import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.3
import { 
  Document, 
  DocumentFilter, 
  DocumentsResponse, 
  DocumentResponse, 
  DocumentVerificationResponse, 
  VerificationStatus
} from '../../types/document';
import { ApiError } from '../../types/api';
import documentsApi from '../../api/documents';

/**
 * Interface for the documents state in the Redux store
 */
interface DocumentsState {
  documents: Document[];
  selectedDocument: Document | null;
  filter: DocumentFilter | null;
  loading: boolean;
  documentLoading: boolean;
  error: string | null;
  verificationLoading: boolean;
  allowedDocumentTypes: {
    allowed_types: string[];
    max_size: number;
    supported_formats: string[];
  } | null;
  documentTypesLoading: boolean;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  } | null;
}

/**
 * Initial state for the documents slice
 */
const initialState: DocumentsState = {
  documents: [],
  selectedDocument: null,
  filter: null,
  loading: false,
  documentLoading: false,
  error: null,
  verificationLoading: false,
  allowedDocumentTypes: null,
  documentTypesLoading: false,
  pagination: null
};

/**
 * Async thunk for fetching documents with optional filters
 */
export const fetchDocuments = createAsyncThunk<
  DocumentsResponse,
  DocumentFilter | undefined,
  { rejectValue: string }
>('documents/fetchDocuments', async (filter, { rejectWithValue }) => {
  try {
    return await documentsApi.getDocuments(filter);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch documents');
  }
});

/**
 * Async thunk for fetching documents for a specific application
 */
export const fetchDocumentsByApplication = createAsyncThunk<
  DocumentsResponse,
  string | number,
  { rejectValue: string }
>('documents/fetchDocumentsByApplication', async (applicationId, { rejectWithValue }) => {
  try {
    return await documentsApi.getDocumentsByApplication(applicationId);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch application documents');
  }
});

/**
 * Async thunk for fetching a single document by ID
 */
export const fetchDocument = createAsyncThunk<
  DocumentResponse,
  string | number,
  { rejectValue: string }
>('documents/fetchDocument', async (id, { rejectWithValue }) => {
  try {
    return await documentsApi.getDocument(id);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch document');
  }
});

/**
 * Async thunk for uploading a new document
 */
export const uploadDocument = createAsyncThunk<
  DocumentResponse,
  { file: File, document_type: string, application_id: string | number },
  { rejectValue: string }
>('documents/uploadDocument', async (data, { rejectWithValue }) => {
  try {
    return await documentsApi.uploadDocument(data);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload document');
  }
});

/**
 * Async thunk for deleting a document
 */
export const deleteDocument = createAsyncThunk<
  { id: string | number, success: boolean },
  string | number,
  { rejectValue: string }
>('documents/deleteDocument', async (id, { rejectWithValue }) => {
  try {
    await documentsApi.deleteDocument(id);
    return { id, success: true };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete document');
  }
});

/**
 * Async thunk for verifying a document (admin only)
 */
export const verifyDocument = createAsyncThunk<
  DocumentVerificationResponse,
  { id: string | number, data: { notes?: string, verification_data?: any } },
  { rejectValue: string }
>('documents/verifyDocument', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await documentsApi.verifyDocument(id, data);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to verify document');
  }
});

/**
 * Async thunk for rejecting a document (admin only)
 */
export const rejectDocument = createAsyncThunk<
  DocumentVerificationResponse,
  { id: string | number, data: { notes?: string, verification_data?: any } },
  { rejectValue: string }
>('documents/rejectDocument', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await documentsApi.rejectDocument(id, data);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to reject document');
  }
});

/**
 * Async thunk for getting document verification status
 */
export const getVerificationStatus = createAsyncThunk<
  { id: string | number, status: string, verified_at: string | null },
  string | number,
  { rejectValue: string }
>('documents/getVerificationStatus', async (id, { rejectWithValue }) => {
  try {
    const response = await documentsApi.getVerificationStatus(id);
    return {
      id,
      status: response.status,
      verified_at: response.verified_at
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to get verification status');
  }
});

/**
 * Async thunk for getting document verification history
 */
export const getVerificationHistory = createAsyncThunk<
  { id: string | number, history: Array<any> },
  string | number,
  { rejectValue: string }
>('documents/getVerificationHistory', async (id, { rejectWithValue }) => {
  try {
    const response = await documentsApi.getVerificationHistory(id);
    return { id, history: response };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to get verification history');
  }
});

/**
 * Async thunk for getting allowed document types and specifications
 */
export const getAllowedDocumentTypes = createAsyncThunk<
  { allowed_types: string[], max_size: number, supported_formats: string[] },
  void,
  { rejectValue: string }
>('documents/getAllowedDocumentTypes', async (_, { rejectWithValue }) => {
  try {
    return await documentsApi.getAllowedDocumentTypes();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to get allowed document types');
  }
});

/**
 * Documents slice containing reducers and extra reducers for document-related state management
 */
const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    /**
     * Reset the documents state to initial state
     */
    resetDocumentsState: (state) => {
      return initialState;
    },
    /**
     * Set the selected document
     */
    setSelectedDocument: (state, action: PayloadAction<Document>) => {
      state.selectedDocument = action.payload;
    },
    /**
     * Clear the selected document
     */
    clearSelectedDocument: (state) => {
      state.selectedDocument = null;
    },
    /**
     * Set document filter criteria
     */
    setDocumentFilter: (state, action: PayloadAction<DocumentFilter>) => {
      state.filter = action.payload;
    },
    /**
     * Clear document filter criteria
     */
    clearDocumentFilter: (state) => {
      state.filter = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch documents
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.data;
        if (action.payload.meta?.pagination) {
          state.pagination = action.payload.meta.pagination;
        }
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch documents';
      })

    // Fetch documents by application
    builder
      .addCase(fetchDocumentsByApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocumentsByApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.data;
        if (action.payload.meta?.pagination) {
          state.pagination = action.payload.meta.pagination;
        }
      })
      .addCase(fetchDocumentsByApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch application documents';
      })

    // Fetch single document
    builder
      .addCase(fetchDocument.pending, (state) => {
        state.documentLoading = true;
        state.error = null;
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        state.documentLoading = false;
        state.selectedDocument = action.payload.data;
        
        // Update the document in the list if it exists
        const index = state.documents.findIndex(doc => doc.id === action.payload.data.id);
        if (index !== -1) {
          state.documents[index] = action.payload.data;
        }
      })
      .addCase(fetchDocument.rejected, (state, action) => {
        state.documentLoading = false;
        state.error = action.payload || 'Failed to fetch document';
      })

    // Upload document
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.documentLoading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.documentLoading = false;
        state.documents.push(action.payload.data);
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.documentLoading = false;
        state.error = action.payload || 'Failed to upload document';
      })

    // Delete document
    builder
      .addCase(deleteDocument.pending, (state) => {
        state.documentLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documentLoading = false;
        state.documents = state.documents.filter(doc => doc.id !== action.payload.id);
        
        // Clear selected document if it was deleted
        if (state.selectedDocument && state.selectedDocument.id === action.payload.id) {
          state.selectedDocument = null;
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.documentLoading = false;
        state.error = action.payload || 'Failed to delete document';
      })

    // Verify document
    builder
      .addCase(verifyDocument.pending, (state) => {
        state.verificationLoading = true;
        state.error = null;
      })
      .addCase(verifyDocument.fulfilled, (state, action) => {
        state.verificationLoading = false;
        const updatedDoc = action.payload.data;
        
        // Update in document list
        const index = state.documents.findIndex(doc => doc.id === updatedDoc.id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        
        // Update selected document if it matches
        if (state.selectedDocument && state.selectedDocument.id === updatedDoc.id) {
          state.selectedDocument = updatedDoc;
        }
      })
      .addCase(verifyDocument.rejected, (state, action) => {
        state.verificationLoading = false;
        state.error = action.payload || 'Failed to verify document';
      })

    // Reject document
    builder
      .addCase(rejectDocument.pending, (state) => {
        state.verificationLoading = true;
        state.error = null;
      })
      .addCase(rejectDocument.fulfilled, (state, action) => {
        state.verificationLoading = false;
        const updatedDoc = action.payload.data;
        
        // Update in document list
        const index = state.documents.findIndex(doc => doc.id === updatedDoc.id);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }
        
        // Update selected document if it matches
        if (state.selectedDocument && state.selectedDocument.id === updatedDoc.id) {
          state.selectedDocument = updatedDoc;
        }
      })
      .addCase(rejectDocument.rejected, (state, action) => {
        state.verificationLoading = false;
        state.error = action.payload || 'Failed to reject document';
      })

    // Get verification status
    builder
      .addCase(getVerificationStatus.pending, (state) => {
        state.verificationLoading = true;
        state.error = null;
      })
      .addCase(getVerificationStatus.fulfilled, (state, action) => {
        state.verificationLoading = false;
        
        // Update the document in the list if it exists
        const index = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (index !== -1) {
          state.documents[index].is_verified = action.payload.status === VerificationStatus.VERIFIED;
          state.documents[index].verified_at = action.payload.verified_at;
        }
        
        // Update selected document if it matches
        if (state.selectedDocument && state.selectedDocument.id === action.payload.id) {
          state.selectedDocument.is_verified = action.payload.status === VerificationStatus.VERIFIED;
          state.selectedDocument.verified_at = action.payload.verified_at;
        }
      })
      .addCase(getVerificationStatus.rejected, (state, action) => {
        state.verificationLoading = false;
        state.error = action.payload || 'Failed to get verification status';
      })

    // Get verification history
    builder
      .addCase(getVerificationHistory.pending, (state) => {
        state.verificationLoading = true;
        state.error = null;
      })
      .addCase(getVerificationHistory.fulfilled, (state, action) => {
        state.verificationLoading = false;
        
        // Update the document in the list if it exists
        const index = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (index !== -1) {
          state.documents[index].verification_history = action.payload.history;
        }
        
        // Update selected document if it matches
        if (state.selectedDocument && state.selectedDocument.id === action.payload.id) {
          state.selectedDocument.verification_history = action.payload.history;
        }
      })
      .addCase(getVerificationHistory.rejected, (state, action) => {
        state.verificationLoading = false;
        state.error = action.payload || 'Failed to get verification history';
      })

    // Get allowed document types
    builder
      .addCase(getAllowedDocumentTypes.pending, (state) => {
        state.documentTypesLoading = true;
        state.error = null;
      })
      .addCase(getAllowedDocumentTypes.fulfilled, (state, action) => {
        state.documentTypesLoading = false;
        state.allowedDocumentTypes = action.payload;
      })
      .addCase(getAllowedDocumentTypes.rejected, (state, action) => {
        state.documentTypesLoading = false;
        state.error = action.payload || 'Failed to get allowed document types';
      });
  }
});

// Export reducer
export const documentsReducer = documentsSlice.reducer;

// Export action creators
export const documentsActions = documentsSlice.actions;

// Export async thunks
export { fetchDocuments };
export { fetchDocumentsByApplication };
export { fetchDocument };
export { uploadDocument };
export { deleteDocument };
export { verifyDocument };
export { rejectDocument };
export { getVerificationStatus };
export { getVerificationHistory };
export { getAllowedDocumentTypes };

// Export selectors
export const selectDocumentsState = (state: { documents: DocumentsState }) => state.documents;
export const selectDocuments = (state: { documents: DocumentsState }) => state.documents.documents;
export const selectDocumentsLoading = (state: { documents: DocumentsState }) => state.documents.loading;
export const selectDocumentsError = (state: { documents: DocumentsState }) => state.documents.error;
export const selectSelectedDocument = (state: { documents: DocumentsState }) => state.documents.selectedDocument;
export const selectDocumentFilter = (state: { documents: DocumentsState }) => state.documents.filter;
export const selectDocumentById = (id: string | number) => 
  (state: { documents: DocumentsState }) => 
    state.documents.documents.find(doc => doc.id === id);
export const selectAllowedDocumentTypes = (state: { documents: DocumentsState }) => state.documents.allowedDocumentTypes;
export const selectDocumentsPagination = (state: { documents: DocumentsState }) => state.documents.pagination;