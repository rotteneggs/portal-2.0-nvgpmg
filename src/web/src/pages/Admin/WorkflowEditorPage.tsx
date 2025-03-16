import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.0.5
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Divider, 
  IconButton, 
  Tooltip, 
  Alert, 
  CircularProgress 
} from '@mui/material'; // @mui/material v5.11.10
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.11.10
import { 
  Save, 
  PlayArrow, 
  Warning, 
  Check, 
  ArrowBack 
} from '@mui/icons-material'; // @mui/icons-material v5.11.9

import AdminLayout from '../../layouts/AdminLayout';
import { 
  WorkflowCanvas, 
  WorkflowToolbar, 
  WorkflowLibrary 
} from '../../components/WorkflowEditor';
import { 
  LoadingSkeleton, 
  Button, 
  Modal, 
  Tabs, 
  TextField, 
  Select 
} from '../../components/Common';
import { 
  Workflow, 
  WorkflowStage, 
  WorkflowTransition, 
  WorkflowType, 
  WorkflowValidationResult 
} from '../../types/workflow';
import { 
  fetchWorkflow,
  fetchWorkflowStages,
  fetchWorkflowTransitions,
  updateExistingWorkflow,
  validateExistingWorkflow,
  activateExistingWorkflow,
  resetWorkflowEditor
} from '../../redux/slices/workflowsSlice';

// Styled components for layout and visual elements
const EditorContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  width: 100%;
  overflow: hidden;
`;

const EditorHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme => theme.spacing(2)};
  border-bottom: 1px solid ${theme => theme.palette.divider};
`;

const EditorContent = styled(Box)`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
`;

const CanvasContainer = styled(Box)`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const ActionButton = styled(Button)`
  marginLeft: ${theme => theme.spacing(1)};
`;

const ValidationAlert = styled(Alert)`
  marginBottom: ${theme => theme.spacing(2)};
`;

// Constants for tab configuration
const EDITOR_TABS = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'settings', label: 'Settings' },
  { id: 'validation', label: 'Validation' }
];

/**
 * Main component for the workflow editor page that allows administrators to create and edit admissions workflows
 */
const WorkflowEditorPage: React.FC = () => {
  // Get workflowId from URL parameters
  const { workflowId } = useParams<{ workflowId: string }>();

  // Initialize component state
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showActivateModal, setShowActivateModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<WorkflowValidationResult | null>(null);

  // Get Redux dispatch function
  const dispatch = useDispatch();

  // Get navigation function
  const navigate = useNavigate();

  // Select workflow data from Redux store
  const reduxWorkflow = useSelector((state: any) => state.workflows.workflow);
  const stages = useSelector((state: any) => state.workflows.stages);
  const transitions = useSelector((state: any) => state.workflows.transitions);
  const reduxLoading = useSelector((state: any) => state.workflows.loading);
  const error = useSelector((state: any) => state.workflows.error);

  // Derive workflow title and active status from workflow data
  const workflowTitle = useMemo(() => reduxWorkflow?.name || 'New Workflow', [reduxWorkflow]);
  const isActive = useMemo(() => reduxWorkflow?.is_active || false, [reduxWorkflow]);

  // Fetch workflow data when component mounts or workflowId changes
  useEffect(() => {
    if (workflowId) {
      setIsLoading(true);
      dispatch(fetchWorkflow(parseInt(workflowId, 10)))
        .then(() => {
          dispatch(fetchWorkflowStages(parseInt(workflowId, 10)));
          dispatch(fetchWorkflowTransitions({ workflowId: parseInt(workflowId, 10) }));
        })
        .catch((err) => {
          console.error('Error fetching workflow data:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    return () => {
      dispatch(resetWorkflowEditor());
    }
  }, [dispatch, workflowId]);

  // Handle workflow saving with validation
  const handleSave = useCallback(async () => {
    if (!reduxWorkflow) return;

    setIsSaving(true);
    try {
      const validationResult = await dispatch(validateExistingWorkflow(reduxWorkflow.id)).unwrap();
      setValidationResult(validationResult);

      if (validationResult.is_valid) {
        await dispatch(updateExistingWorkflow({ id: reduxWorkflow.id, workflow: reduxWorkflow })).unwrap();
        console.log('Workflow saved successfully!');
      } else {
        setShowValidationModal(true);
        console.warn('Workflow has validation errors:', validationResult.errors);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, reduxWorkflow]);

  // Handle workflow activation/deactivation
  const handleActivate = useCallback(async () => {
    if (!reduxWorkflow) return;

    setShowActivateModal(false);
    setIsSaving(true);

    try {
      if (isActive) {
        // Deactivate workflow
        await dispatch(activateExistingWorkflow(reduxWorkflow.id)).unwrap();
        console.log('Workflow deactivated successfully!');
      } else {
        // Activate workflow
        await dispatch(activateExistingWorkflow(reduxWorkflow.id)).unwrap();
        console.log('Workflow activated successfully!');
      }
    } catch (error) {
      console.error('Failed to activate/deactivate workflow:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, reduxWorkflow, isActive]);

  // Handle navigation back to workflow list
  const handleBack = useCallback(() => {
    navigate('/admin/workflows');
  }, [navigate]);

  return (
    <AdminLayout title="Workflow Editor">
      <EditorContainer>
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <EditorHeader>
              <Typography variant="h5" component="h2">
                {workflowTitle}
              </Typography>
              <Box>
                <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBack />}>
                  Back
                </Button>
                <ActionButton
                  variant="contained"
                  color={isActive ? 'error' : 'primary'}
                  onClick={() => setShowActivateModal(true)}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  {isActive ? 'Deactivate' : 'Activate'}
                </ActionButton>
              </Box>
            </EditorHeader>
            <EditorContent>
              <CanvasContainer>
                <WorkflowCanvas
                  workflowId={workflowId}
                  stages={stages}
                  transitions={transitions}
                  readOnly={false}
                  onSave={handleSave}
                />
              </CanvasContainer>
            </EditorContent>
          </>
        )}
      </EditorContainer>

      <Modal open={showActivateModal} onClose={() => setShowActivateModal(false)} title="Confirm Action">
        <Box sx={{ p: 3 }}>
          <Typography variant="body1">
            Are you sure you want to {isActive ? 'deactivate' : 'activate'} this workflow?
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setShowActivateModal(false)}>Cancel</Button>
            <Button variant="contained" color={isActive ? 'error' : 'primary'} onClick={handleActivate}>
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {validationResult && showValidationModal && (
        <Modal open={showValidationModal} onClose={() => setShowValidationModal(false)} title="Validation Results">
          <Box sx={{ p: 3 }}>
            {validationResult.errors.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>Errors:</Typography>
                <ul>
                  {validationResult.errors.map((error) => (
                    <li key={error.code}>{error.message}</li>
                  ))}
                </ul>
              </>
            ) : (
              <Typography variant="body1">No errors found.</Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowValidationModal(false)}>Close</Button>
            </Box>
          </Box>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default WorkflowEditorPage;