import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.3
import {
  Workflow,
  WorkflowStage,
  WorkflowTransition,
  WorkflowType,
  WorkflowFilter,
  WorkflowValidationResult,
  ApplicationStatusTimeline,
  WorkflowEditorState
} from '../../types/workflow';
import { ID } from '../../types/common';
import {
  getWorkflows,
  getWorkflow,
  getActiveWorkflow,
  getWorkflowStages,
  getWorkflowTransitions,
  getAvailableTransitions,
  getApplicationStatusTimeline,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  duplicateWorkflow,
  validateWorkflow,
  createWorkflowStage,
  updateWorkflowStage,
  deleteWorkflowStage,
  reorderWorkflowStages,
  createWorkflowTransition,
  updateWorkflowTransition,
  deleteWorkflowTransition,
  getAvailableRoles
} from '../../api/workflows';

/**
 * Interface for the workflows state in the Redux store
 */
interface WorkflowsState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  applicationTimeline: ApplicationStatusTimeline | null;
  availableTransitions: WorkflowTransition[];
  editor: WorkflowEditorState;
  availableRoles: { id: ID; name: string }[];
  loading: boolean;
  editorLoading: boolean;
  validating: boolean;
  error: string | null;
  validationResult: WorkflowValidationResult | null;
}

/**
 * Async thunk to fetch workflows with optional filtering
 */
export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchWorkflows',
  async (filter?: WorkflowFilter) => {
    const response = await getWorkflows(filter);
    return response.data;
  }
);

/**
 * Async thunk to fetch a specific workflow by ID
 */
export const fetchWorkflow = createAsyncThunk(
  'workflows/fetchWorkflow',
  async (id: ID) => {
    return await getWorkflow(id);
  }
);

/**
 * Async thunk to fetch the active workflow for a specific application type
 */
export const fetchActiveWorkflow = createAsyncThunk(
  'workflows/fetchActiveWorkflow',
  async (type: WorkflowType) => {
    return await getActiveWorkflow(type);
  }
);

/**
 * Async thunk to fetch all stages for a specific workflow
 */
export const fetchWorkflowStages = createAsyncThunk(
  'workflows/fetchWorkflowStages',
  async (workflowId: ID) => {
    return await getWorkflowStages(workflowId);
  }
);

/**
 * Async thunk to fetch transitions for a specific workflow with optional filtering
 */
export const fetchWorkflowTransitions = createAsyncThunk(
  'workflows/fetchWorkflowTransitions',
  async (params: { workflowId: ID; filter?: object }) => {
    const { workflowId, filter } = params;
    return await getWorkflowTransitions(workflowId, filter);
  }
);

/**
 * Async thunk to fetch available transitions for an application at its current stage
 */
export const fetchAvailableTransitions = createAsyncThunk(
  'workflows/fetchAvailableTransitions',
  async (applicationId: ID) => {
    return await getAvailableTransitions(applicationId);
  }
);

/**
 * Async thunk to fetch the status timeline for a specific application
 */
export const fetchApplicationStatusTimeline = createAsyncThunk(
  'workflows/fetchApplicationStatusTimeline',
  async (applicationId: ID) => {
    return await getApplicationStatusTimeline(applicationId);
  }
);

/**
 * Async thunk to create a new workflow
 */
export const createNewWorkflow = createAsyncThunk(
  'workflows/createWorkflow',
  async (workflow: Partial<Workflow>) => {
    return await createWorkflow(workflow);
  }
);

/**
 * Async thunk to update an existing workflow
 */
export const updateExistingWorkflow = createAsyncThunk(
  'workflows/updateWorkflow',
  async (params: { id: ID; workflow: Partial<Workflow> }) => {
    const { id, workflow } = params;
    return await updateWorkflow(id, workflow);
  }
);

/**
 * Async thunk to delete a workflow
 */
export const deleteExistingWorkflow = createAsyncThunk(
  'workflows/deleteWorkflow',
  async (id: ID) => {
    await deleteWorkflow(id);
    return id;
  }
);

/**
 * Async thunk to activate a workflow, making it the active workflow for its type
 */
export const activateExistingWorkflow = createAsyncThunk(
  'workflows/activateWorkflow',
  async (id: ID) => {
    return await activateWorkflow(id);
  }
);

/**
 * Async thunk to deactivate a workflow
 */
export const deactivateExistingWorkflow = createAsyncThunk(
  'workflows/deactivateWorkflow',
  async (id: ID) => {
    return await deactivateWorkflow(id);
  }
);

/**
 * Async thunk to create a duplicate of an existing workflow
 */
export const duplicateExistingWorkflow = createAsyncThunk(
  'workflows/duplicateWorkflow',
  async (params: { id: ID; name: string }) => {
    const { id, name } = params;
    return await duplicateWorkflow(id, name);
  }
);

/**
 * Async thunk to validate a workflow for completeness and correctness
 */
export const validateExistingWorkflow = createAsyncThunk(
  'workflows/validateWorkflow',
  async (id: ID) => {
    return await validateWorkflow(id);
  }
);

/**
 * Async thunk to create a new workflow stage
 */
export const createNewWorkflowStage = createAsyncThunk(
  'workflows/createWorkflowStage',
  async (params: { workflowId: ID; stage: Partial<WorkflowStage> }) => {
    const { workflowId, stage } = params;
    return await createWorkflowStage(workflowId, stage);
  }
);

/**
 * Async thunk to update an existing workflow stage
 */
export const updateExistingWorkflowStage = createAsyncThunk(
  'workflows/updateWorkflowStage',
  async (params: { workflowId: ID; stageId: ID; stage: Partial<WorkflowStage> }) => {
    const { workflowId, stageId, stage } = params;
    return await updateWorkflowStage(workflowId, stageId, stage);
  }
);

/**
 * Async thunk to delete a workflow stage
 */
export const deleteExistingWorkflowStage = createAsyncThunk(
  'workflows/deleteWorkflowStage',
  async (params: { workflowId: ID; stageId: ID }) => {
    const { workflowId, stageId } = params;
    await deleteWorkflowStage(workflowId, stageId);
    return { workflowId, stageId };
  }
);

/**
 * Async thunk to reorder the stages of a workflow
 */
export const reorderWorkflowStages = createAsyncThunk(
  'workflows/reorderWorkflowStages',
  async (params: { workflowId: ID; stageOrder: ID[] }) => {
    const { workflowId, stageOrder } = params;
    await reorderWorkflowStages(workflowId, stageOrder);
    return { workflowId, stageOrder };
  }
);

/**
 * Async thunk to create a new workflow transition between stages
 */
export const createNewWorkflowTransition = createAsyncThunk(
  'workflows/createWorkflowTransition',
  async (params: { workflowId: ID; transition: Partial<WorkflowTransition> }) => {
    const { workflowId, transition } = params;
    return await createWorkflowTransition(workflowId, transition);
  }
);

/**
 * Async thunk to update an existing workflow transition
 */
export const updateExistingWorkflowTransition = createAsyncThunk(
  'workflows/updateWorkflowTransition',
  async (params: { workflowId: ID; transitionId: ID; transition: Partial<WorkflowTransition> }) => {
    const { workflowId, transitionId, transition } = params;
    return await updateWorkflowTransition(workflowId, transitionId, transition);
  }
);

/**
 * Async thunk to delete a workflow transition
 */
export const deleteExistingWorkflowTransition = createAsyncThunk(
  'workflows/deleteWorkflowTransition',
  async (params: { workflowId: ID; transitionId: ID }) => {
    const { workflowId, transitionId } = params;
    await deleteWorkflowTransition(workflowId, transitionId);
    return { workflowId, transitionId };
  }
);

/**
 * Async thunk to get a list of roles that can be assigned to workflow stages
 */
export const fetchAvailableRoles = createAsyncThunk(
  'workflows/fetchAvailableRoles',
  async () => {
    return await getAvailableRoles();
  }
);

/**
 * Type-safe selector for accessing the workflows state
 */
export const selectWorkflowsState = (state: any) => state.workflows as WorkflowsState;

/**
 * Initial state for the workflows slice
 */
const initialState: WorkflowsState = {
  workflows: [],
  currentWorkflow: null,
  stages: [],
  transitions: [],
  applicationTimeline: null,
  availableTransitions: [],
  editor: {
    workflow: null,
    selectedStage: null,
    selectedTransition: null,
    transitionSource: null,
    isDragging: false,
    isCreatingTransition: false,
    zoom: 1,
    pan: { x: 0, y: 0 }
  },
  availableRoles: [],
  loading: false,
  editorLoading: false,
  validating: false,
  error: null,
  validationResult: null
};

/**
 * Redux slice for managing workflow state
 */
export const workflowsSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    // Editor state actions
    setSelectedStage: (state, action: PayloadAction<WorkflowStage | null>) => {
      state.editor.selectedStage = action.payload;
      state.editor.selectedTransition = null;
    },
    setSelectedTransition: (state, action: PayloadAction<WorkflowTransition | null>) => {
      state.editor.selectedTransition = action.payload;
      state.editor.selectedStage = null;
    },
    setTransitionSource: (state, action: PayloadAction<WorkflowStage | null>) => {
      state.editor.transitionSource = action.payload;
    },
    setIsDragging: (state, action: PayloadAction<boolean>) => {
      state.editor.isDragging = action.payload;
    },
    setIsCreatingTransition: (state, action: PayloadAction<boolean>) => {
      state.editor.isCreatingTransition = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.editor.zoom = action.payload;
    },
    setPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.editor.pan = action.payload;
    },
    resetWorkflowEditor: (state) => {
      state.editor = {
        workflow: null,
        selectedStage: null,
        selectedTransition: null,
        transitionSource: null,
        isDragging: false,
        isCreatingTransition: false,
        zoom: 1,
        pan: { x: 0, y: 0 }
      };
    }
  },
  extraReducers: (builder) => {
    // Handle fetchWorkflows
    builder
      .addCase(fetchWorkflows.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.workflows = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch workflows';
      });

    // Handle fetchWorkflow
    builder
      .addCase(fetchWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflow.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.editor.workflow = action.payload;
        state.loading = false;
      })
      .addCase(fetchWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch workflow';
      });

    // Handle fetchActiveWorkflow
    builder
      .addCase(fetchActiveWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveWorkflow.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
        state.loading = false;
      })
      .addCase(fetchActiveWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch active workflow';
      });

    // Handle fetchWorkflowStages
    builder
      .addCase(fetchWorkflowStages.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowStages.fulfilled, (state, action) => {
        state.stages = action.payload;
        state.editorLoading = false;
      })
      .addCase(fetchWorkflowStages.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to fetch workflow stages';
      });

    // Handle fetchWorkflowTransitions
    builder
      .addCase(fetchWorkflowTransitions.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowTransitions.fulfilled, (state, action) => {
        state.transitions = action.payload;
        state.editorLoading = false;
      })
      .addCase(fetchWorkflowTransitions.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to fetch workflow transitions';
      });

    // Handle fetchAvailableTransitions
    builder
      .addCase(fetchAvailableTransitions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableTransitions.fulfilled, (state, action) => {
        state.availableTransitions = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableTransitions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch available transitions';
      });

    // Handle fetchApplicationStatusTimeline
    builder
      .addCase(fetchApplicationStatusTimeline.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplicationStatusTimeline.fulfilled, (state, action) => {
        state.applicationTimeline = action.payload;
        state.loading = false;
      })
      .addCase(fetchApplicationStatusTimeline.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch application status timeline';
      });

    // Handle createNewWorkflow
    builder
      .addCase(createNewWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewWorkflow.fulfilled, (state, action) => {
        state.workflows.push(action.payload);
        state.currentWorkflow = action.payload;
        state.editor.workflow = action.payload;
        state.loading = false;
      })
      .addCase(createNewWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create workflow';
      });

    // Handle updateExistingWorkflow
    builder
      .addCase(updateExistingWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingWorkflow.fulfilled, (state, action) => {
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
        }
        
        if (state.editor.workflow?.id === action.payload.id) {
          state.editor.workflow = action.payload;
        }
        
        state.loading = false;
      })
      .addCase(updateExistingWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update workflow';
      });

    // Handle deleteExistingWorkflow
    builder
      .addCase(deleteExistingWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExistingWorkflow.fulfilled, (state, action) => {
        state.workflows = state.workflows.filter(w => w.id !== action.payload);
        
        if (state.currentWorkflow?.id === action.payload) {
          state.currentWorkflow = null;
        }
        
        if (state.editor.workflow?.id === action.payload) {
          state.editor.workflow = null;
        }
        
        state.loading = false;
      })
      .addCase(deleteExistingWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete workflow';
      });

    // Handle activateExistingWorkflow
    builder
      .addCase(activateExistingWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(activateExistingWorkflow.fulfilled, (state, action) => {
        // Update workflow in lists
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        
        // Deactivate other workflows of the same type
        state.workflows.forEach(w => {
          if (w.id !== action.payload.id && w.application_type === action.payload.application_type) {
            w.is_active = false;
          }
        });
        
        // Update current workflow if it matches
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
        }
        
        // Update editor workflow if it matches
        if (state.editor.workflow?.id === action.payload.id) {
          state.editor.workflow = action.payload;
        }
        
        state.loading = false;
      })
      .addCase(activateExistingWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to activate workflow';
      });

    // Handle deactivateExistingWorkflow
    builder
      .addCase(deactivateExistingWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateExistingWorkflow.fulfilled, (state, action) => {
        // Update workflow in lists
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        
        // Update current workflow if it matches
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
        }
        
        // Update editor workflow if it matches
        if (state.editor.workflow?.id === action.payload.id) {
          state.editor.workflow = action.payload;
        }
        
        state.loading = false;
      })
      .addCase(deactivateExistingWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to deactivate workflow';
      });

    // Handle duplicateExistingWorkflow
    builder
      .addCase(duplicateExistingWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(duplicateExistingWorkflow.fulfilled, (state, action) => {
        state.workflows.push(action.payload);
        state.loading = false;
      })
      .addCase(duplicateExistingWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to duplicate workflow';
      });

    // Handle validateExistingWorkflow
    builder
      .addCase(validateExistingWorkflow.pending, (state) => {
        state.validating = true;
        state.error = null;
      })
      .addCase(validateExistingWorkflow.fulfilled, (state, action) => {
        state.validationResult = action.payload;
        state.validating = false;
      })
      .addCase(validateExistingWorkflow.rejected, (state, action) => {
        state.validating = false;
        state.error = action.error.message || 'Failed to validate workflow';
      });

    // Handle createNewWorkflowStage
    builder
      .addCase(createNewWorkflowStage.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(createNewWorkflowStage.fulfilled, (state, action) => {
        state.stages.push(action.payload);
        state.editorLoading = false;
      })
      .addCase(createNewWorkflowStage.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to create stage';
      });

    // Handle updateExistingWorkflowStage
    builder
      .addCase(updateExistingWorkflowStage.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(updateExistingWorkflowStage.fulfilled, (state, action) => {
        const index = state.stages.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.stages[index] = action.payload;
        }
        
        // Update selected stage if it matches
        if (state.editor.selectedStage?.id === action.payload.id) {
          state.editor.selectedStage = action.payload;
        }
        
        // Update transition source if it matches
        if (state.editor.transitionSource?.id === action.payload.id) {
          state.editor.transitionSource = action.payload;
        }
        
        state.editorLoading = false;
      })
      .addCase(updateExistingWorkflowStage.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to update stage';
      });

    // Handle deleteExistingWorkflowStage
    builder
      .addCase(deleteExistingWorkflowStage.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(deleteExistingWorkflowStage.fulfilled, (state, action) => {
        const { stageId } = action.payload;
        state.stages = state.stages.filter(s => s.id !== stageId);
        
        // Remove transitions connected to this stage
        state.transitions = state.transitions.filter(
          t => t.source_stage_id !== stageId && t.target_stage_id !== stageId
        );
        
        // Clear selected stage if it matches
        if (state.editor.selectedStage?.id === stageId) {
          state.editor.selectedStage = null;
        }
        
        // Clear transition source if it matches
        if (state.editor.transitionSource?.id === stageId) {
          state.editor.transitionSource = null;
        }
        
        state.editorLoading = false;
      })
      .addCase(deleteExistingWorkflowStage.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to delete stage';
      });

    // Handle reorderWorkflowStages
    builder
      .addCase(reorderWorkflowStages.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(reorderWorkflowStages.fulfilled, (state, action) => {
        const { stageOrder } = action.payload;
        
        // Update sequence numbers based on new order
        state.stages = state.stages.map(stage => {
          const index = stageOrder.findIndex(id => Number(id) === Number(stage.id));
          return {
            ...stage,
            sequence: index !== -1 ? index + 1 : stage.sequence
          };
        }).sort((a, b) => a.sequence - b.sequence);
        
        state.editorLoading = false;
      })
      .addCase(reorderWorkflowStages.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to reorder stages';
      });

    // Handle createNewWorkflowTransition
    builder
      .addCase(createNewWorkflowTransition.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(createNewWorkflowTransition.fulfilled, (state, action) => {
        state.transitions.push(action.payload);
        state.editor.isCreatingTransition = false;
        state.editor.transitionSource = null;
        state.editorLoading = false;
      })
      .addCase(createNewWorkflowTransition.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to create transition';
      });

    // Handle updateExistingWorkflowTransition
    builder
      .addCase(updateExistingWorkflowTransition.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(updateExistingWorkflowTransition.fulfilled, (state, action) => {
        const index = state.transitions.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transitions[index] = action.payload;
        }
        
        // Update selected transition if it matches
        if (state.editor.selectedTransition?.id === action.payload.id) {
          state.editor.selectedTransition = action.payload;
        }
        
        state.editorLoading = false;
      })
      .addCase(updateExistingWorkflowTransition.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to update transition';
      });

    // Handle deleteExistingWorkflowTransition
    builder
      .addCase(deleteExistingWorkflowTransition.pending, (state) => {
        state.editorLoading = true;
        state.error = null;
      })
      .addCase(deleteExistingWorkflowTransition.fulfilled, (state, action) => {
        const { transitionId } = action.payload;
        state.transitions = state.transitions.filter(t => t.id !== transitionId);
        
        // Clear selected transition if it matches
        if (state.editor.selectedTransition?.id === transitionId) {
          state.editor.selectedTransition = null;
        }
        
        state.editorLoading = false;
      })
      .addCase(deleteExistingWorkflowTransition.rejected, (state, action) => {
        state.editorLoading = false;
        state.error = action.error.message || 'Failed to delete transition';
      });

    // Handle fetchAvailableRoles
    builder
      .addCase(fetchAvailableRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableRoles.fulfilled, (state, action) => {
        state.availableRoles = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch available roles';
      });
  },
});

// Extract action creators from the slice
export const {
  setSelectedStage,
  setSelectedTransition,
  setTransitionSource,
  setIsDragging,
  setIsCreatingTransition,
  setZoom,
  setPan,
  resetWorkflowEditor
} = workflowsSlice.actions;

// Export the reducer as default
export default workflowsSlice.reducer;