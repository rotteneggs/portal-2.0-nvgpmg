import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { Add, Edit, ContentCopy, Delete, CheckCircle } from '@mui/icons-material'; // @mui/icons-material ^5.11.0
import { Tooltip, IconButton, Chip, Grid, Typography, Box, Divider } from '@mui/material'; // @mui/material ^5.0.0

import Button from '../../components/Common/Button';
import Card from '../../components/Common/Card';
import Modal from '../../components/Common/Modal';
import TextField from '../../components/Common/TextField';
import Select from '../../components/Common/Select';
import EmptyState from '../../components/Common/EmptyState';
import LoadingSkeleton from '../../components/Common/LoadingSkeleton';
import { colors, spacing, neutralLight } from '../../styles/variables';
import { Workflow, WorkflowType, WorkflowFormData, WorkflowFilterOptions } from '../../types/workflow';
import { 
  fetchWorkflows, 
  createNewWorkflow, 
  duplicateExistingWorkflow, 
  deleteExistingWorkflow,
  activateExistingWorkflow,
  deactivateExistingWorkflow,
  selectWorkflows,
  selectWorkflowsLoading,
  selectWorkflowsError
} from '../../redux/slices/workflowsSlice';

interface WorkflowLibraryProps {
  onSelectWorkflow: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
}

const WORKFLOW_TYPE_OPTIONS = [
  { value: WorkflowType.UNDERGRADUATE, label: 'Undergraduate' },
  { value: WorkflowType.GRADUATE, label: 'Graduate' },
  { value: WorkflowType.TRANSFER, label: 'Transfer' },
];

const LibraryContainer = styled.div`
  padding: ${spacing.md};
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md};
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: ${spacing.sm};
  align-items: center;
`;

const WorkflowGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${spacing.md};
`;

const WorkflowCard = styled(Card)`
  transition: transform 0.2s ease-in-out;
  &:hover {
    transform: translateY(-4px);
  }
`;

const CardContent = styled.div`
  padding: ${spacing.md};
  display: flex;
  flex-direction: column;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.sm};
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CardDescription = styled.p`
  color: ${colors.neutralMedium};
  margin: 0;
  height: 4rem;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${spacing.md};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${spacing.sm};
`;

const ModalContent = styled.div`
  padding: ${spacing.md};
`;

const FormGroup = styled.div`
  margin-bottom: ${spacing.md};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${spacing.sm};
`;

const WorkflowLibrary: React.FC<WorkflowLibraryProps> = ({ onSelectWorkflow, onCreateWorkflow }) => {
  const dispatch = useDispatch(); // react-redux ^8.0.5

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState<WorkflowFormData>({ name: '', description: '', application_type: WorkflowType.UNDERGRADUATE });
  const [filterOptions, setFilterOptions] = useState<WorkflowFilterOptions>({ type: null, search: '', is_active: null });

  const workflows = useSelector(selectWorkflows);
  const loading = useSelector(selectWorkflowsLoading);
  const error = useSelector(selectWorkflowsError);

  useEffect(() => {
    dispatch(fetchWorkflows(filterOptions));
  }, [dispatch, filterOptions]);

  const handleOpenCreateModal = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setFormData({ name: '', description: '', application_type: WorkflowType.UNDERGRADUATE });
  }, []);

  const handleCreateWorkflow = useCallback(async () => {
    if (formData.name && formData.description && formData.application_type) {
      await dispatch(createNewWorkflow(formData));
      handleCloseCreateModal();
      onCreateWorkflow();
    }
  }, [dispatch, handleCloseCreateModal, onCreateWorkflow, formData]);

  const handleOpenDuplicateModal = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowDuplicateModal(true);
  }, []);

  const handleCloseDuplicateModal = useCallback(() => {
    setShowDuplicateModal(false);
    setSelectedWorkflow(null);
    setFormData({ name: '', description: '', application_type: WorkflowType.UNDERGRADUATE });
  }, []);

  const handleDuplicateWorkflow = useCallback(async () => {
    if (selectedWorkflow && formData.name) {
      await dispatch(duplicateExistingWorkflow({ id: selectedWorkflow.id, name: formData.name }));
      handleCloseDuplicateModal();
    }
  }, [dispatch, handleCloseDuplicateModal, selectedWorkflow, formData.name]);

  const handleOpenDeleteModal = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowDeleteModal(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setSelectedWorkflow(null);
  }, []);

  const handleDeleteWorkflow = useCallback(async () => {
    if (selectedWorkflow) {
      await dispatch(deleteExistingWorkflow(selectedWorkflow.id));
      handleCloseDeleteModal();
    }
  }, [dispatch, handleCloseDeleteModal, selectedWorkflow]);

  const handleActivateWorkflow = useCallback(async (workflow: Workflow) => {
    await dispatch(activateExistingWorkflow(workflow.id));
  }, [dispatch]);

  const handleDeactivateWorkflow = useCallback(async (workflow: Workflow) => {
    await dispatch(deactivateExistingWorkflow(workflow.id));
  }, [dispatch]);

  const handleSelectWorkflow = useCallback((workflow: Workflow) => {
    onSelectWorkflow(workflow);
  }, [onSelectWorkflow]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }, [formData]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterOptions({ ...filterOptions, search: e.target.value });
  }, [filterOptions]);

  return (
    <LibraryContainer>
      <Header>
        <Title>Workflow Templates</Title>
        <FilterContainer>
          <TextField
            label="Search"
            size="small"
            value={filterOptions.search}
            onChange={handleFilterChange}
          />
          <Button variant="contained" size="small" startIcon={<Add />} onClick={handleOpenCreateModal}>
            Create Workflow
          </Button>
        </FilterContainer>
      </Header>
      {loading ? (
        <WorkflowGrid>
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="card" />
          ))}
        </WorkflowGrid>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : workflows.length > 0 ? (
        <WorkflowGrid>
          {workflows.map(workflow => (
            <WorkflowCard key={workflow.id} onClick={() => handleSelectWorkflow(workflow)}>
              <CardContent>
                <CardHeader>
                  <CardTitle>{workflow.name}</CardTitle>
                  <ActionButtons>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={(e) => {e.stopPropagation(); onSelectWorkflow(workflow);}}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate">
                      <IconButton size="small" onClick={(e) => {e.stopPropagation(); handleOpenDuplicateModal(workflow);}}>
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={(e) => {e.stopPropagation(); handleOpenDeleteModal(workflow);}}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </ActionButtons>
                </CardHeader>
                <CardDescription>{workflow.description}</CardDescription>
                <CardFooter>
                  <Chip label={workflow.application_type} size="small" />
                  {workflow.is_active ? (
                    <Tooltip title="Deactivate">
                      <IconButton size="small" onClick={(e) => {e.stopPropagation(); handleDeactivateWorkflow(workflow);}}>
                        <CheckCircle style={{ color: colors.success }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Button variant="text" size="small" onClick={(e) => {e.stopPropagation(); handleActivateWorkflow(workflow);}}>
                      Activate
                    </Button>
                  )}
                </CardFooter>
              </CardContent>
            </WorkflowCard>
          ))}
        </WorkflowGrid>
      ) : (
        <EmptyState message="No workflows found." description="Create a new workflow to get started." />
      )}

      <Modal open={showCreateModal} onClose={handleCloseCreateModal} title="Create New Workflow">
        <ModalContent>
          <FormGroup>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </FormGroup>
          <FormGroup>
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
            />
          </FormGroup>
          <FormGroup>
            <Select
              label="Application Type"
              name="application_type"
              value={formData.application_type}
              onChange={(e) => setFormData({ ...formData, application_type: e.target.value as WorkflowType })}
              options={WORKFLOW_TYPE_OPTIONS}
              fullWidth
              required
            />
          </FormGroup>
        </ModalContent>
        <ModalActions>
          <Button onClick={handleCloseCreateModal}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWorkflow}>
            Create
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={showDuplicateModal} onClose={handleCloseDuplicateModal} title="Duplicate Workflow">
        <ModalContent>
          <Typography variant="body1">Enter a name for the duplicated workflow:</Typography>
          <FormGroup>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </FormGroup>
        </ModalContent>
        <ModalActions>
          <Button onClick={handleCloseDuplicateModal}>Cancel</Button>
          <Button variant="contained" onClick={handleDuplicateWorkflow}>
            Duplicate
          </Button>
        </ModalActions>
      </Modal>

      <Modal open={showDeleteModal} onClose={handleCloseDeleteModal} title="Delete Workflow">
        <ModalContent>
          <Typography variant="body1">Are you sure you want to delete this workflow?</Typography>
        </ModalContent>
        <ModalActions>
          <Button onClick={handleCloseDeleteModal}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteWorkflow}>
            Delete
          </Button>
        </ModalActions>
      </Modal>
    </LibraryContainer>
  );
};

export default WorkflowLibrary;