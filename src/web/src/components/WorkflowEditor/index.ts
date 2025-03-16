import StageNode from './StageNode';
import StageProperties from './StageProperties';
import TransitionEdge from './TransitionEdge';
import TransitionProperties from './TransitionProperties';
import WorkflowCanvas from './WorkflowCanvas';
import WorkflowLibrary from './WorkflowLibrary';
import WorkflowToolbar from './WorkflowToolbar';
import { NodeProps, EdgeProps } from 'reactflow'; // reactflow ^11.0.0
import { WorkflowStage, WorkflowTransition } from '../../types/workflow';

/**
 * Exports the StageNode component for use in the workflow editor.
 * This component represents a stage in the visual workflow editor.
 */
export type { NodeProps, EdgeProps }
export { StageNode };
/**
 * Exports the StageProperties component for use in the workflow editor.
 * This component provides an interface for editing the properties of a selected stage.
 */
export type { StagePropertiesProps } from './StageProperties';
export { StageProperties };
/**
 * Exports the TransitionEdge component for use in the workflow editor.
 * This component represents a transition between two stages in the visual workflow editor.
 */
export { TransitionEdge };
/**
 * Exports the TransitionProperties component for use in the workflow editor.
 * This component provides an interface for editing the properties of a selected transition.
 */
export type { TransitionPropertiesProps } from './TransitionProperties';
export { TransitionProperties };
/**
 * Exports the WorkflowCanvas component for use in the workflow editor.
 * This component provides the main canvas for visually designing and editing workflows.
 */
export type { WorkflowCanvasProps } from './WorkflowCanvas';
export { WorkflowCanvas };
/**
 * Exports the WorkflowLibrary component for use in the workflow editor.
 * This component provides a library of pre-built workflow templates that can be used as a starting point.
 */
export type { WorkflowLibraryProps } from './WorkflowLibrary';
export { WorkflowLibrary };
/**
 * Exports the WorkflowToolbar component for use in the workflow editor.
 * This component provides a toolbar with actions for manipulating the workflow canvas.
 */
export type { WorkflowToolbarProps } from './WorkflowToolbar';
export { WorkflowToolbar };