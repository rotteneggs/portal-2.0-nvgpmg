import React from 'react';
import styled from '@emotion/styled';
import { Tooltip, Divider } from '@mui/material';
import { 
  Add as AddIcon, 
  ZoomIn as ZoomInIcon, 
  ZoomOut as ZoomOutIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  PlayArrow as PlayArrowIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon
} from '@mui/icons-material'; // @mui/icons-material ^5.0.0
import Button from '../../components/Common/Button';
import { colors, spacing } from '../../styles/variables';

/**
 * Props interface for the WorkflowToolbar component
 */
interface WorkflowToolbarProps {
  /** ID of the current workflow being edited */
  workflowId: string;
  /** Handler for adding a new stage */
  onAddStage: () => void;
  /** Handler for creating a connection between stages */
  onCreateConnection: () => void;
  /** Handler for zooming in on the workflow */
  onZoomIn: () => void;
  /** Handler for zooming out of the workflow */
  onZoomOut: () => void;
  /** Handler for saving the workflow */
  onSave: () => void;
  /** Handler for testing the workflow */
  onTest: () => void;
  /** Handler for deleting selected elements */
  onDelete: () => void;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Whether the user is currently creating a connection */
  isCreatingConnection?: boolean;
  /** Whether any workflow element is currently selected */
  hasSelection?: boolean;
}

// Consistent size for all toolbar buttons
const BUTTON_SIZE = 'small';

// Styled container for the toolbar
const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacing.sm} ${spacing.md};
  background-color: ${colors.white};
  border-bottom: 1px solid ${colors.neutralLight};
`;

// Styled group for related buttons
const ToolbarGroup = styled.div`
  display: flex;
  gap: ${spacing.sm};
`;

// Styled divider between button groups
const StyledDivider = styled(Divider)`
  margin: 0 ${spacing.md};
  height: 24px;
`;

// Styled action button for consistent appearance
const ActionButton = styled(Button)`
  min-width: unset;
  padding: ${spacing.sm};
`;

/**
 * WorkflowToolbar component provides the control interface for the Workflow Editor
 * Contains buttons for adding stages, creating connections, zooming, saving, testing, and deleting elements
 */
const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  workflowId,
  onAddStage,
  onCreateConnection,
  onZoomIn,
  onZoomOut,
  onSave,
  onTest,
  onDelete,
  readOnly = false,
  isCreatingConnection = false,
  hasSelection = false,
}) => {
  return (
    <ToolbarContainer>
      {/* Stage and Connection Controls */}
      <ToolbarGroup>
        <Tooltip title="Add Stage" arrow placement="bottom" disabled={readOnly}>
          <span> {/* Span wrapper needed for disabled tooltips */}
            <ActionButton
              size={BUTTON_SIZE}
              startIcon={<AddIcon />}
              onClick={onAddStage}
              disabled={readOnly}
              aria-label="Add Stage"
            />
          </span>
        </Tooltip>
        
        <Tooltip 
          title={isCreatingConnection ? "Cancel Connection" : "Create Connection"} 
          arrow 
          placement="bottom"
          disabled={readOnly}
        >
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              color={isCreatingConnection ? "error" : "primary"}
              startIcon={isCreatingConnection ? <LinkOffIcon /> : <LinkIcon />}
              onClick={onCreateConnection}
              disabled={readOnly}
              aria-label={isCreatingConnection ? "Cancel Connection" : "Create Connection"}
            />
          </span>
        </Tooltip>
      </ToolbarGroup>
      
      <StyledDivider orientation="vertical" flexItem />
      
      {/* Zoom Controls */}
      <ToolbarGroup>
        <Tooltip title="Zoom In" arrow placement="bottom">
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              startIcon={<ZoomInIcon />}
              onClick={onZoomIn}
              aria-label="Zoom In"
            />
          </span>
        </Tooltip>
        
        <Tooltip title="Zoom Out" arrow placement="bottom">
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              startIcon={<ZoomOutIcon />}
              onClick={onZoomOut}
              aria-label="Zoom Out"
            />
          </span>
        </Tooltip>
      </ToolbarGroup>
      
      <StyledDivider orientation="vertical" flexItem />
      
      {/* Action Controls */}
      <ToolbarGroup>
        <Tooltip title="Save Workflow" arrow placement="bottom" disabled={readOnly}>
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              startIcon={<SaveIcon />}
              onClick={onSave}
              disabled={readOnly}
              aria-label="Save Workflow"
            />
          </span>
        </Tooltip>
        
        <Tooltip title="Test Workflow" arrow placement="bottom">
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              startIcon={<PlayArrowIcon />}
              onClick={onTest}
              aria-label="Test Workflow"
            />
          </span>
        </Tooltip>
      </ToolbarGroup>
      
      <StyledDivider orientation="vertical" flexItem />
      
      {/* Delete Control */}
      <ToolbarGroup>
        <Tooltip 
          title="Delete Selection" 
          arrow 
          placement="bottom"
          disabled={readOnly || !hasSelection}
        >
          <span>
            <ActionButton
              size={BUTTON_SIZE}
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onDelete}
              disabled={readOnly || !hasSelection}
              aria-label="Delete Selection"
            />
          </span>
        </Tooltip>
      </ToolbarGroup>
    </ToolbarContainer>
  );
};

export default WorkflowToolbar;