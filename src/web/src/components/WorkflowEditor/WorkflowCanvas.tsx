import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.0
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  useReactFlow,
  MarkerType,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow'; // reactflow ^11.0.0
import 'reactflow/dist/style.css';
import {
  Drawer,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material'; // @mui/material ^5.0.0
import {
  Add,
  ZoomIn,
  ZoomOut,
  Delete,
  Close,
} from '@mui/icons-material'; // @mui/icons-material ^5.0.0

import StageNode from './StageNode';
import TransitionEdge from './TransitionEdge';
import StageProperties from './StageProperties';
import TransitionProperties from './TransitionProperties';
import {
  WorkflowStage,
  WorkflowTransition,
  WorkflowStageNode,
  WorkflowTransitionEdge,
} from '../../types/workflow';
import {
  convertStagesToNodes,
  convertTransitionsToEdges,
  updateStagePosition,
  getDefaultStagePosition,
  createDefaultTransition,
} from '../../services/WorkflowService';
import {
  createNewWorkflowStage,
  updateExistingWorkflowStage,
  deleteExistingWorkflowStage,
  createNewWorkflowTransition,
  updateExistingWorkflowTransition,
  deleteExistingWorkflowTransition,
  setSelectedStage,
  setSelectedTransition,
  setTransitionSource,
  setIsDragging,
  setIsCreatingTransition,
  setZoom,
  setPan
} from '../../redux/slices/workflowsSlice';

// Define custom node and edge types for React Flow
const nodeTypes = { stageNode: StageNode };
const edgeTypes = { transitionEdge: TransitionEdge };

// Define default options for new edges
const defaultEdgeOptions = {
  type: 'transitionEdge',
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
  animated: false,
};

// Define styling for the connection line
const connectionLineStyle = { stroke: '#1976D2', strokeWidth: 2 };

// Define the props for the WorkflowCanvas component
interface WorkflowCanvasProps {
  workflowId: string;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  readOnly: boolean;
  onSave: () => void;
}

// Styled components for the workflow canvas
const CanvasContainer = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
`;

const StyledReactFlow = styled(ReactFlow)`
  background-color: #f5f5f5;
  border: 1px solid #ddd;
`;

const ControlPanel = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 5px;
  display: flex;
  gap: 5px;
`;

const PropertiesDrawer = styled(Drawer)`
  .MuiDrawer-paper {
    width: 350px;
    padding: 16px;
  }
`;

const DrawerHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const DrawerTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 500;
`;

/**
 * The main component for the workflow editor canvas that allows visual editing of workflow stages and transitions.
 */
const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflowId,
  stages,
  transitions,
  readOnly,
  onSave,
}) => {
  // Initialize React Flow state for nodes and edges
  const { nodes: initialNodes } = convertStagesToNodes(stages);
  const { edges: initialEdges } = convertTransitionsToEdges(transitions);
  const { setNodes, setEdges, onNodesChange } = useNodesState(initialNodes);
  const { setEdges, onEdgesChange } = useEdgesState(initialEdges);

  // Get React Flow instance
  const reactFlowInstance = useReactFlow();

  // Access Redux dispatch and workflow editor state
  const dispatch = useDispatch();
  const selectedStage = useSelector((state: any) => state.workflows.editor.selectedStage);
  const selectedTransition = useSelector((state: any) => state.workflows.editor.selectedTransition);
  const isCreatingTransition = useSelector((state: any) => state.workflows.editor.isCreatingTransition);
  const transitionSource = useSelector((state: any) => state.workflows.editor.transitionSource);
  const zoom = useSelector((state: any) => state.workflows.editor.zoom);
  const pan = useSelector((state: any) => state.workflows.editor.pan);

  // Manage state for the properties side panel
  const [stagePropertiesOpen, setStagePropertiesOpen] = useState(false);
  const [transitionPropertiesOpen, setTransitionPropertiesOpen] = useState(false);

  // Update nodes and edges when stages or transitions change
  useEffect(() => {
    setNodes(convertStagesToNodes(stages));
    setEdges(convertTransitionsToEdges(transitions));
  }, [stages, transitions, setNodes, setEdges]);

  // Open properties panel when a stage is selected
  useEffect(() => {
    setStagePropertiesOpen(!!selectedStage);
  }, [selectedStage]);

  // Open properties panel when a transition is selected
  useEffect(() => {
    setTransitionPropertiesOpen(!!selectedTransition);
  }, [selectedTransition]);

  // Update zoom and pan when Redux state changes
  useEffect(() => {
    reactFlowInstance.setZoom(zoom);
    reactFlowInstance.setTransform({ x: pan.x, y: pan.y, zoom: zoom });
  }, [zoom, pan, reactFlowInstance]);

  // Handle node changes (position updates, selection)
  const handleNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position') {
        if (change.id && change.position) {
          const stageId = parseInt(change.id, 10);
          dispatch(updateExistingWorkflowStage({
            workflowId,
            stageId,
            stage: { position: change.position },
          }));
        }
      } else if (change.type === 'select') {
        if (change.selected) {
          const stageId = parseInt(change.id, 10);
          const stage = stages.find(s => s.id === stageId) || null;
          dispatch(setSelectedStage(stage));
        } else {
          dispatch(setSelectedStage(null));
        }
      }
    });
    setNodes(ns => onNodesChange(changes, ns));
  }, [setNodes, onNodesChange, workflowId, stages, dispatch]);

  // Handle edge changes (selection, deletion)
  const handleEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'select') {
        if (change.selected) {
          const transitionId = parseInt(change.id, 10);
          const transition = transitions.find(t => t.id === transitionId) || null;
          dispatch(setSelectedTransition(transition));
        } else {
          dispatch(setSelectedTransition(null));
        }
      } else if (change.type === 'remove') {
        const transitionId = parseInt(change.id, 10);
        dispatch(deleteExistingWorkflowTransition({ workflowId, transitionId }));
      }
    });
    setEdges(es => onEdgesChange(changes, es));
  }, [setEdges, onEdgesChange, workflowId, transitions, dispatch]);

  // Handle connecting nodes (creating transitions)
  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    if (transitionSource) {
      dispatch(createNewWorkflowTransition({
        workflowId,
        transition: createDefaultTransition(transitionSource.id, parseInt(connection.target, 10)),
      }));
      dispatch(setIsCreatingTransition(false));
      dispatch(setTransitionSource(null));
    }
    setEdges(es => addEdge(connection, es));
  }, [setEdges, workflowId, transitionSource, dispatch]);

  // Handle node drag events
  const handleNodeDragStart = useCallback(() => {
    dispatch(setIsDragging(true));
  }, [dispatch]);

  const handleNodeDrag = useCallback(() => {
    dispatch(setIsDragging(true));
  }, [dispatch]);

  const handleNodeDragStop = useCallback(() => {
    dispatch(setIsDragging(false));
  }, [dispatch]);

  // Handle pane click to deselect items
  const handlePaneClick = useCallback(() => {
    dispatch(setSelectedStage(null));
    dispatch(setSelectedTransition(null));
  }, [dispatch]);

  // Handle adding a new stage
  const handleAddStage = useCallback(() => {
    const newStagePosition = getDefaultStagePosition(stages);
    dispatch(createNewWorkflowStage({
      workflowId,
      stage: { position: newStagePosition },
    }));
  }, [workflowId, stages, dispatch]);

  // Handle deleting selected items
  const handleDeleteSelected = useCallback(() => {
    if (selectedStage) {
      dispatch(deleteExistingWorkflowStage({ workflowId, stageId: selectedStage.id }));
    } else if (selectedTransition) {
      dispatch(deleteExistingWorkflowTransition({ workflowId, transitionId: selectedTransition.id }));
    }
  }, [workflowId, selectedStage, selectedTransition, dispatch]);

  // Handle zooming in and out
  const handleZoomIn = useCallback(() => {
    dispatch(setZoom(zoom + 0.1));
  }, [zoom, dispatch]);

  const handleZoomOut = useCallback(() => {
    dispatch(setZoom(zoom - 0.1));
  }, [zoom, dispatch]);

  // Handle saving the workflow
  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  return (
    <CanvasContainer>
      <StyledReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        fitView
        readOnly={readOnly}
      >
        <Background variant="dots" gap={20} size={1} />
        <Controls />
        <MiniMap />
        <Panel position="top-left">
          <ControlPanel>
            <Tooltip title="Add Stage">
              <IconButton aria-label="add stage" onClick={handleAddStage}>
                <Add />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom In">
              <IconButton aria-label="zoom in" onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton aria-label="zoom out" onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Selected">
              <IconButton aria-label="delete selected" onClick={handleDeleteSelected}>
                <Delete />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save">
              <IconButton aria-label="save" onClick={handleSave}>
                <Close />
              </IconButton>
            </Tooltip>
          </ControlPanel>
        </Panel>
      </StyledReactFlow>

      <PropertiesDrawer
        anchor="right"
        open={stagePropertiesOpen}
        onClose={() => dispatch(setSelectedStage(null))}
      >
        <DrawerHeader>
          <DrawerTitle>Stage Properties</DrawerTitle>
          <IconButton onClick={() => dispatch(setSelectedStage(null))}>
            <Close />
          </IconButton>
        </DrawerHeader>
        <StageProperties stage={selectedStage} workflowId={workflowId} onUpdate={() => {}} />
      </PropertiesDrawer>

      <PropertiesDrawer
        anchor="right"
        open={transitionPropertiesOpen}
        onClose={() => dispatch(setSelectedTransition(null))}
      >
        <DrawerHeader>
          <DrawerTitle>Transition Properties</DrawerTitle>
          <IconButton onClick={() => dispatch(setSelectedTransition(null))}>
            <Close />
          </IconButton>
        </DrawerHeader>
        <TransitionProperties transition={selectedTransition} workflowId={workflowId} onUpdate={() => {}} />
      </PropertiesDrawer>
    </CanvasContainer>
  );
};

export default WorkflowCanvas;