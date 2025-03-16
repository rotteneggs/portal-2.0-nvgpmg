import React from 'react';
import styled from '@emotion/styled';
import { NodeProps, Handle, Position } from 'reactflow'; // reactflow ^11.0.0
import { IconButton } from '@mui/material'; // @mui/material ^5.0.0
import { Edit, Delete } from '@mui/icons-material'; // @mui/icons-material ^5.0.0

import { colors } from '../../styles/variables';
import { WorkflowStage } from '../../types/workflow';

// Extended data type with callback functions that will be passed from parent component
interface StageNodeData extends WorkflowStage {
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

// Styled container for the node with conditional styling based on selection state
const NodeContainer = styled.div<{ isSelected: boolean }>`
  padding: ${props => props.isSelected ? '12px' : '14px'};
  border-radius: 8px;
  background-color: ${colors.white};
  border: ${props => props.isSelected 
    ? `3px solid ${colors.primary}` 
    : `1px solid ${colors.neutralLight}`};
  box-shadow: ${props => props.isSelected 
    ? '0 0 8px rgba(25, 118, 210, 0.4)' 
    : '0 1px 3px rgba(0, 0, 0, 0.1)'};
  min-width: 180px;
  max-width: 250px;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

// Header section for the stage name
const NodeHeader = styled.div`
  font-weight: 500;
  font-size: 16px;
  text-align: center;
  color: ${colors.neutralDark};
  margin-bottom: 8px;
  word-break: break-word;
`;

// Content section for additional stage details
const NodeContent = styled.div`
  padding: 4px;
  min-height: 20px;
  font-size: 12px;
  color: ${colors.neutralMedium};
  text-align: center;
`;

// Container for metadata indicators like documents, actions, etc.
const NodeInfo = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  font-size: 11px;
`;

// Individual metadata item
const NodeInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

// Container for action buttons (edit, delete)
const NodeActions = styled.div`
  position: absolute;
  top: -12px;
  right: -12px;
  display: flex;
  gap: 4px;
  z-index: 10;
`;

// Custom styled connection handle
const StyledHandle = styled(Handle)`
  width: 10px;
  height: 10px;
  background-color: ${colors.primary};
  border: 2px solid white;
`;

/**
 * StageNode component represents a workflow stage in the WYSIWYG workflow editor.
 * It visualizes stage information and provides interactive features for selecting,
 * editing, and connecting workflow stages.
 */
const StageNode: React.FC<NodeProps<StageNodeData>> = ({ 
  data, 
  selected = false, 
  isConnectable = false,
}) => {
  if (!data) return null;

  // Handle edit action
  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onEdit) {
      data.onEdit(data.id);
    }
  };
  
  // Handle delete action
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.onDelete) {
      data.onDelete(data.id);
    }
  };

  // Calculate metadata counts
  const documentsCount = Array.isArray(data.required_documents) ? data.required_documents.length : 0;
  const actionsCount = Array.isArray(data.required_actions) ? data.required_actions.length : 0;
  const notificationsCount = Array.isArray(data.notification_triggers) ? data.notification_triggers.length : 0;

  return (
    <NodeContainer isSelected={selected}>
      {/* Source handle for outgoing transitions */}
      <StyledHandle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
      
      {/* Target handle for incoming transitions */}
      <StyledHandle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      
      <NodeHeader>{data.name || 'Unnamed Stage'}</NodeHeader>
      
      <NodeContent>
        {data.description && (
          <div>
            {data.description.length > 50 
              ? `${data.description.substring(0, 50)}...`
              : data.description
            }
          </div>
        )}
        
        {/* Show metadata counts if available */}
        {(documentsCount > 0 || actionsCount > 0 || notificationsCount > 0) && (
          <NodeInfo>
            {documentsCount > 0 && (
              <NodeInfoItem title={`${documentsCount} required document${documentsCount !== 1 ? 's' : ''}`}>
                📄 {documentsCount}
              </NodeInfoItem>
            )}
            {actionsCount > 0 && (
              <NodeInfoItem title={`${actionsCount} required action${actionsCount !== 1 ? 's' : ''}`}>
                ✓ {actionsCount}
              </NodeInfoItem>
            )}
            {notificationsCount > 0 && (
              <NodeInfoItem title={`${notificationsCount} notification${notificationsCount !== 1 ? 's' : ''}`}>
                🔔 {notificationsCount}
              </NodeInfoItem>
            )}
          </NodeInfo>
        )}
        
        {/* Show assigned role if available */}
        {data.assignedRole && (
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            Assigned to: {data.assignedRole.name}
          </div>
        )}
      </NodeContent>
      
      {/* Action buttons visible only when node is selected */}
      {selected && (
        <NodeActions>
          <IconButton 
            size="small" 
            aria-label="edit stage"
            onClick={handleEdit}
            sx={{ bgcolor: 'background.paper' }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            aria-label="delete stage"
            onClick={handleDelete}
            sx={{ bgcolor: 'background.paper' }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </NodeActions>
      )}
    </NodeContainer>
  );
};

export default StageNode;