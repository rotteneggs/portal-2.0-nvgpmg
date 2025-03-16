import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { Divider, FormGroup, FormLabel, FormControlLabel, IconButton } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

import TextField from '../Common/TextField';
import Select from '../Common/Select';
import Checkbox from '../Common/Checkbox';
import Button from '../Common/Button';
import { colors, spacing } from '../../styles/variables';
import { 
  WorkflowTransition, 
  TransitionCondition 
} from '../../types/workflow';
import { SelectOption } from '../../types/common';
import { 
  updateExistingWorkflowTransition, 
  deleteExistingWorkflowTransition,
  fetchAvailableRoles
} from '../../redux/slices/workflowsSlice';

// Props interface for the TransitionProperties component
interface TransitionPropertiesProps {
  transition: WorkflowTransition | null;
  workflowId: string;
  onUpdate?: () => void;
}

// Constants for condition field options
const CONDITION_FIELD_OPTIONS: SelectOption[] = [
  { value: 'document_status', label: 'Document Status' },
  { value: 'application_data', label: 'Application Data' },
  { value: 'days_in_stage', label: 'Days in Stage' },
  { value: 'user_role', label: 'User Role' }
];

// Constants for condition operator options
const CONDITION_OPERATOR_OPTIONS: SelectOption[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' }
];

// Styled components
const PropertiesContainer = styled.div`
  padding: ${spacing.md};
  background-color: ${colors.white};
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
`;

const FormSection = styled.div`
  margin-bottom: ${spacing.md};
  padding-bottom: ${spacing.sm};
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: ${spacing.sm};
  color: ${colors.neutralDark};
`;

const ConditionRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  margin-bottom: ${spacing.sm};
`;

const PermissionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.sm};
  background-color: ${colors.neutralLight};
  border-radius: 4px;
  margin-bottom: ${spacing.sm};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${spacing.md};
`;

/**
 * TransitionProperties component provides a form interface for editing workflow transition properties
 * in the WYSIWYG workflow editor. It allows administrators to configure transition details such as
 * name, description, conditions, required permissions, and automatic transition settings.
 */
const TransitionProperties: React.FC<TransitionPropertiesProps> = ({
  transition,
  workflowId,
  onUpdate
}) => {
  const dispatch = useDispatch();
  
  // Form state
  const [name, setName] = useState(transition?.name || '');
  const [description, setDescription] = useState(transition?.description || '');
  const [isAutomatic, setIsAutomatic] = useState(transition?.is_automatic || false);
  const [conditions, setConditions] = useState<TransitionCondition[]>(
    transition?.transition_conditions || []
  );
  const [requiredPermissions, setRequiredPermissions] = useState<string[]>(
    transition?.required_permissions || []
  );
  const [selectedPermission, setSelectedPermission] = useState('');
  
  // UI state
  const [availableRoles, setAvailableRoles] = useState<SelectOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch available roles from API when component mounts
  useEffect(() => {
    dispatch(fetchAvailableRoles());
  }, [dispatch]);
  
  // Get available roles from Redux store
  const roleOptions = useSelector((state: any) => state.workflows.availableRoles);
  
  // Format role options for the select component
  useEffect(() => {
    if (roleOptions && roleOptions.length > 0) {
      const formattedOptions = roleOptions.map((role: any) => ({
        value: role.id.toString(),
        label: role.name
      }));
      setAvailableRoles(formattedOptions);
    }
  }, [roleOptions]);
  
  // Update form state when transition prop changes
  useEffect(() => {
    if (transition) {
      setName(transition.name || '');
      setDescription(transition.description || '');
      setIsAutomatic(transition.is_automatic || false);
      setConditions(transition.transition_conditions || []);
      setRequiredPermissions(transition.required_permissions || []);
    }
  }, [transition]);
  
  // Handler for form submission
  const handleSubmit = useCallback(() => {
    if (!transition) return;
    
    setIsSubmitting(true);
    
    dispatch(updateExistingWorkflowTransition({
      workflowId,
      transitionId: transition.id,
      transition: {
        name,
        description,
        is_automatic: isAutomatic,
        transition_conditions: conditions,
        required_permissions: requiredPermissions
      }
    }))
      .then(() => {
        if (onUpdate) onUpdate();
        setIsSubmitting(false);
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  }, [
    name,
    description,
    isAutomatic,
    conditions,
    requiredPermissions,
    workflowId,
    transition,
    dispatch,
    onUpdate
  ]);
  
  // Handler for deleting the transition
  const handleDelete = useCallback(() => {
    if (!transition) return;
    
    if (window.confirm('Are you sure you want to delete this transition? This action cannot be undone.')) {
      setIsDeleting(true);
      
      dispatch(deleteExistingWorkflowTransition({
        workflowId,
        transitionId: transition.id
      }))
        .then(() => {
          if (onUpdate) onUpdate();
          setIsDeleting(false);
        })
        .catch(() => {
          setIsDeleting(false);
        });
    }
  }, [workflowId, transition, dispatch, onUpdate]);
  
  // Handlers for condition management
  const handleAddCondition = useCallback(() => {
    const newCondition: TransitionCondition = {
      field: CONDITION_FIELD_OPTIONS[0].value as string,
      operator: CONDITION_OPERATOR_OPTIONS[0].value as string,
      value: ''
    };
    setConditions([...conditions, newCondition]);
  }, [conditions]);
  
  const handleUpdateCondition = useCallback((index: number, field: keyof TransitionCondition, value: any) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    setConditions(updatedConditions);
  }, [conditions]);
  
  const handleRemoveCondition = useCallback((index: number) => {
    const updatedConditions = [...conditions];
    updatedConditions.splice(index, 1);
    setConditions(updatedConditions);
  }, [conditions]);
  
  // Handlers for permission management
  const handleAddPermission = useCallback(() => {
    if (selectedPermission && !requiredPermissions.includes(selectedPermission)) {
      setRequiredPermissions([...requiredPermissions, selectedPermission]);
      setSelectedPermission('');
    }
  }, [requiredPermissions, selectedPermission]);
  
  const handleRemovePermission = useCallback((permission: string) => {
    const updatedPermissions = requiredPermissions.filter(p => p !== permission);
    setRequiredPermissions(updatedPermissions);
  }, [requiredPermissions]);
  
  // Display empty state if no transition is selected
  if (!transition) {
    return (
      <PropertiesContainer>
        <p>Select a transition to edit its properties</p>
      </PropertiesContainer>
    );
  }
  
  return (
    <PropertiesContainer>
      {/* Basic Information Section */}
      <FormSection>
        <SectionTitle>Basic Information</SectionTitle>
        <TextField
          id="transition-name"
          label="Transition Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
        />
        <TextField
          id="transition-description"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />
      </FormSection>
      
      <Divider />
      
      {/* Automatic Transition Section */}
      <FormSection>
        <FormControlLabel
          control={
            <Checkbox
              id="is-automatic"
              name="is_automatic"
              checked={isAutomatic}
              onChange={(e) => setIsAutomatic(e.target.checked)}
              label=""
            />
          }
          label="Automatic Transition"
        />
        {isAutomatic && (
          <p style={{ fontSize: '14px', color: colors.neutralMedium }}>
            This transition will be applied automatically when conditions are met, without requiring manual action.
          </p>
        )}
      </FormSection>
      
      <Divider />
      
      {/* Transition Conditions Section */}
      <FormSection>
        <SectionTitle>Transition Conditions</SectionTitle>
        <p style={{ fontSize: '14px', color: colors.neutralMedium, marginBottom: spacing.sm }}>
          Define conditions that must be met for this transition to be available or automatic.
        </p>
        
        {conditions.length === 0 ? (
          <p>No conditions defined. Add a condition below.</p>
        ) : (
          conditions.map((condition, index) => (
            <ConditionRow key={index}>
              <Select
                name={`condition-field-${index}`}
                label="Field"
                value={condition.field}
                onChange={(e) => handleUpdateCondition(index, 'field', e.target.value)}
                options={CONDITION_FIELD_OPTIONS}
                fullWidth={false}
              />
              <Select
                name={`condition-operator-${index}`}
                label="Operator"
                value={condition.operator}
                onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                options={CONDITION_OPERATOR_OPTIONS}
                fullWidth={false}
              />
              <TextField
                id={`condition-value-${index}`}
                label="Value"
                value={condition.value}
                onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
              />
              <IconButton 
                onClick={() => handleRemoveCondition(index)} 
                color="error"
                aria-label="Remove condition"
              >
                <Delete />
              </IconButton>
            </ConditionRow>
          ))
        )}
        
        <Button
          variant="outlined"
          color="primary"
          onClick={handleAddCondition}
          startIcon={<Add />}
          size="small"
        >
          Add Condition
        </Button>
      </FormSection>
      
      <Divider />
      
      {/* Required Permissions Section */}
      <FormSection>
        <SectionTitle>Required Permissions</SectionTitle>
        <p style={{ fontSize: '14px', color: colors.neutralMedium, marginBottom: spacing.sm }}>
          Specify which roles can trigger this transition manually.
        </p>
        
        {requiredPermissions.length === 0 ? (
          <p>No permissions required. Everyone with access to the workflow can trigger this transition.</p>
        ) : (
          requiredPermissions.map((permission, index) => {
            const permissionRole = availableRoles.find(role => role.value === permission);
            return (
              <PermissionItem key={index}>
                <span>{permissionRole ? permissionRole.label : permission}</span>
                <IconButton 
                  onClick={() => handleRemovePermission(permission)} 
                  size="small" 
                  color="error"
                  aria-label="Remove permission"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </PermissionItem>
            );
          })
        )}
        
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
          <Select
            name="permission-select"
            label="Add Permission"
            value={selectedPermission}
            onChange={(e) => setSelectedPermission(e.target.value as string)}
            options={availableRoles.filter(
              role => !requiredPermissions.includes(role.value as string)
            )}
            fullWidth
          />
          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddPermission}
            disabled={!selectedPermission}
            size="small"
          >
            Add
          </Button>
        </div>
      </FormSection>
      
      {/* Action Buttons */}
      <ButtonGroup>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || isDeleting}
        >
          Update Transition
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          loading={isDeleting}
          disabled={isSubmitting || isDeleting}
        >
          Delete Transition
        </Button>
      </ButtonGroup>
    </PropertiesContainer>
  );
};

export default TransitionProperties;