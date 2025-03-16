import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { SelectChangeEvent } from '@mui/material';
import { Divider, FormGroup, FormLabel, FormControlLabel } from '@mui/material';

import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Checkbox from '../Common/Checkbox';
import Button from '../Common/Button';
import { colors, spacing } from '../../styles/variables';
import { WorkflowStage, NotificationTrigger } from '../../types/workflow';
import { SelectOption } from '../../types/common';
import { 
  updateExistingWorkflowStage, 
  deleteExistingWorkflowStage,
  fetchAvailableRoles
} from '../../redux/slices/workflowsSlice';

// Constants for document options
const DOCUMENT_OPTIONS = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'personal_statement', label: 'Personal Statement' },
  { value: 'recommendation_letters', label: 'Recommendation Letters' },
  { value: 'test_scores', label: 'Test Scores' },
  { value: 'id_verification', label: 'ID Verification' },
  { value: 'financial_documents', label: 'Financial Documents' }
];

// Constants for notification options
const NOTIFICATION_OPTIONS = [
  { event: 'stage_begin', label: 'Notify student when stage begins' },
  { event: 'documents_verified', label: 'Notify student when documents verified' },
  { event: 'stage_complete', label: 'Notify student when stage completes' },
  { event: 'admin_assignment', label: 'Notify admin team when assigned' }
];

// Props interface for the StageProperties component
interface StagePropertiesProps {
  stage: WorkflowStage | null;
  workflowId: string;
  onUpdate?: () => void;
}

// Styled components
const PropertiesContainer = styled.div`
  padding: ${spacing.md};
  background-color: ${colors.white};
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

const FormSection = styled.div`
  margin-bottom: ${spacing.md};
`;

const SectionTitle = styled.h3`
  margin-bottom: ${spacing.sm};
  font-size: 16px;
  font-weight: 500;
  color: ${colors.neutralDark};
`;

const CheckboxGroup = styled.div`
  margin-top: ${spacing.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${spacing.md};
`;

/**
 * A form component for editing workflow stage properties in the WYSIWYG workflow editor.
 * Allows administrators to configure stage details such as name, description,
 * required documents, notifications, and role assignments.
 */
const StageProperties: React.FC<StagePropertiesProps> = ({ 
  stage, 
  workflowId, 
  onUpdate 
}) => {
  // Form state
  const [name, setName] = useState(stage?.name || '');
  const [description, setDescription] = useState(stage?.description || '');
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(
    stage?.required_documents || []
  );
  const [requiredActions, setRequiredActions] = useState<string[]>(
    stage?.required_actions || []
  );
  const [notificationTriggers, setNotificationTriggers] = useState<NotificationTrigger[]>(
    stage?.notification_triggers || []
  );
  const [assignedRoleId, setAssignedRoleId] = useState<string>(
    stage?.assigned_role_id?.toString() || ''
  );
  const [availableRoles, setAvailableRoles] = useState<SelectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const dispatch = useDispatch();
  
  // Fetch available roles when component mounts
  useEffect(() => {
    dispatch(fetchAvailableRoles());
  }, [dispatch]);
  
  // Update form state when stage prop changes
  useEffect(() => {
    if (stage) {
      setName(stage.name || '');
      setDescription(stage.description || '');
      setRequiredDocuments(stage.required_documents || []);
      setRequiredActions(stage.required_actions || []);
      setNotificationTriggers(stage.notification_triggers || []);
      setAssignedRoleId(stage.assigned_role_id?.toString() || '');
    }
  }, [stage]);
  
  // Get available roles from Redux store
  const roleOptions = useSelector(state => state.workflows.availableRoles);
  
  // Transform roles into select options
  useEffect(() => {
    if (roleOptions?.length) {
      const options = roleOptions.map(role => ({
        value: role.id.toString(),
        label: role.name
      }));
      setAvailableRoles(options);
    }
  }, [roleOptions]);
  
  // Handlers for form input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };
  
  const handleDocumentChange = (document: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setRequiredDocuments(prev => [...prev, document]);
    } else {
      setRequiredDocuments(prev => prev.filter(doc => doc !== document));
    }
  };
  
  const handleNotificationChange = (event: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setNotificationTriggers(prev => [
        ...prev, 
        { event, recipient: 'student', template: 'default', channels: ['email'] }
      ]);
    } else {
      setNotificationTriggers(prev => prev.filter(trigger => trigger.event !== event));
    }
  };
  
  const handleRoleChange = (e: SelectChangeEvent<unknown>) => {
    setAssignedRoleId(e.target.value as string);
  };
  
  // Handler for form submission
  const handleSubmit = useCallback(async () => {
    if (!stage || !workflowId) return;
    
    setIsSubmitting(true);
    
    try {
      await dispatch(updateExistingWorkflowStage({
        workflowId,
        stageId: stage.id,
        stage: {
          name,
          description,
          required_documents: requiredDocuments,
          required_actions: requiredActions,
          notification_triggers: notificationTriggers,
          assigned_role_id: assignedRoleId ? parseInt(assignedRoleId, 10) : undefined
        }
      }));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name, 
    description, 
    requiredDocuments, 
    requiredActions,
    notificationTriggers, 
    assignedRoleId, 
    workflowId, 
    stage, 
    dispatch, 
    onUpdate
  ]);
  
  // Handler for stage deletion
  const handleDelete = useCallback(async () => {
    if (!stage || !workflowId) return;
    
    if (!window.confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await dispatch(deleteExistingWorkflowStage({
        workflowId,
        stageId: stage.id
      }));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to delete stage:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [workflowId, stage, dispatch, onUpdate]);
  
  // Show message if no stage is selected
  if (!stage) {
    return <PropertiesContainer>Select a stage to edit its properties</PropertiesContainer>;
  }
  
  return (
    <PropertiesContainer>
      <FormSection>
        <TextField 
          id="stage-name"
          label="Stage Name"
          value={name}
          onChange={handleNameChange}
          fullWidth
          required
        />
        
        <TextField 
          id="stage-description"
          label="Description"
          value={description}
          onChange={handleDescriptionChange}
          fullWidth
          multiline
          rows={3}
        />
      </FormSection>
      
      <FormSection>
        <SectionTitle>Required Documents</SectionTitle>
        <CheckboxGroup>
          {DOCUMENT_OPTIONS.map(doc => (
            <FormControlLabel
              key={doc.value}
              control={
                <Checkbox
                  id={`doc-${doc.value}`}
                  name={`document-${doc.value}`}
                  checked={requiredDocuments.includes(doc.value)}
                  onChange={handleDocumentChange(doc.value)}
                />
              }
              label={doc.label}
            />
          ))}
        </CheckboxGroup>
      </FormSection>
      
      <FormSection>
        <SectionTitle>Assigned To</SectionTitle>
        <Select
          name="assigned-role"
          label="Role"
          value={assignedRoleId}
          onChange={handleRoleChange}
          options={availableRoles}
          placeholder="Select a role"
          fullWidth
        />
      </FormSection>
      
      <FormSection>
        <SectionTitle>Notifications</SectionTitle>
        <CheckboxGroup>
          {NOTIFICATION_OPTIONS.map(option => (
            <FormControlLabel
              key={option.event}
              control={
                <Checkbox
                  id={`notification-${option.event}`}
                  name={`notification-${option.event}`}
                  checked={notificationTriggers.some(trigger => trigger.event === option.event)}
                  onChange={handleNotificationChange(option.event)}
                />
              }
              label={option.label}
            />
          ))}
        </CheckboxGroup>
      </FormSection>
      
      <Divider sx={{ margin: `${spacing.md} 0` }} />
      
      <ButtonGroup>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Update Stage
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          disabled={isDeleting}
          loading={isDeleting}
        >
          Delete Stage
        </Button>
      </ButtonGroup>
    </PropertiesContainer>
  );
};

export default StageProperties;