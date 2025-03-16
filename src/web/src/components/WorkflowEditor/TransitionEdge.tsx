import React from 'react';
import styled from '@emotion/styled';
import { EdgeProps, getBezierPath } from 'reactflow'; // reactflow ^11.0.0
import { colors } from '../../styles/variables';
import { WorkflowTransition } from '../../types/workflow';

// Helper function to calculate edge parameters for rendering the bezier path
const getEdgeParams = (sourceX, sourceY, targetX, targetY) => {
  // Calculate the horizontal and vertical distances between source and target
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  
  // Determine the control point offset based on the distance
  const offset = Math.max(dx, dy) * 0.3;
  
  return {
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlPointOffset: offset
  };
};

// Styled components for the edge visualization
const EdgePath = styled.path`
  stroke-width: 2;
  fill: none;
  transition: stroke 0.2s, stroke-width 0.2s;
  cursor: pointer;
  
  &:hover {
    stroke-width: 3;
  }
  
  &.automatic {
    stroke-dasharray: 5,5;
  }
  
  &.selected {
    stroke-width: 3;
  }
`;

const EdgeLabel = styled.div`
  position: absolute;
  background-color: ${colors.white};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: all;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  transform: translate(-50%, -50%);
  z-index: 1;
  cursor: pointer;
  border: 1px solid ${colors.neutralLight};
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  
  &:hover {
    border-color: ${colors.primary};
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  
  &.selected {
    border-color: ${colors.primary};
    background-color: ${`${colors.primary}10`};
  }
`;

const EdgeLabelText = styled.span`
  display: block;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

// The main edge component that represents a workflow transition
const TransitionEdge: React.FC<EdgeProps<WorkflowTransition>> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
  markerEnd
}) => {
  // Generate the bezier path using React Flow's utility
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: 'right',
    targetPosition: 'left',
    curvature: 0.25,
  });
  
  // Extract transition data (with fallback for safety)
  const transition = data || {};
  const { name, is_automatic } = transition;
  
  // Determine styling based on selection state and transition properties
  const isSelected = !!selected;
  const isAutomatic = !!is_automatic;
  
  // Choose colors based on state
  let strokeColor;
  if (isSelected) {
    strokeColor = colors.primary;
  } else if (isAutomatic) {
    strokeColor = colors.success;
  } else {
    strokeColor = colors.neutralDark;
  }
  
  // Build class names for conditional styling
  const edgePathClasses = [
    isAutomatic ? 'automatic' : '',
    isSelected ? 'selected' : ''
  ].filter(Boolean).join(' ');
  
  const edgeLabelClasses = [
    isSelected ? 'selected' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <>
      {/* Edge path with styling based on transition type and selection state */}
      <EdgePath
        id={id}
        d={path}
        stroke={strokeColor}
        className={edgePathClasses}
        markerEnd={markerEnd}
        data-testid={`transition-edge-${id}`}
      />
      
      {/* Edge label displayed only if transition has a name */}
      {name && labelX && labelY && (
        <EdgeLabel
          style={{ left: labelX, top: labelY }}
          className={edgeLabelClasses}
        >
          <EdgeLabelText style={{ color: isSelected ? colors.primary : colors.neutralDark }}>
            {name}
          </EdgeLabelText>
        </EdgeLabel>
      )}
    </>
  );
};

export default TransitionEdge;