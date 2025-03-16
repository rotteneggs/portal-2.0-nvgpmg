/**
 * Service module that provides utility functions and business logic for workflow management
 * in the Student Admissions Enrollment Platform. This service acts as an intermediary layer 
 * between the UI components (particularly the workflow editor) and the API/Redux state,
 * handling data transformations, validations, and complex operations related to workflows,
 * stages, and transitions.
 */

import {
  Workflow,
  WorkflowStage,
  WorkflowTransition,
  WorkflowType,
  WorkflowStageNode,
  WorkflowTransitionEdge,
  WorkflowValidationResult,
  ApplicationStatusTimeline,
  WorkflowStagePosition
} from '../types/workflow';
import { ID } from '../types/common';
import {
  getWorkflowStages,
  updateWorkflowStage,
  getWorkflowTransitions,
  validateWorkflow
} from '../api/workflows';
import { Node, Edge, XYPosition, Position } from 'reactflow'; // reactflow ^11.0.0

/**
 * Converts workflow stages to React Flow nodes for visualization
 * @param stages - Array of workflow stages to convert
 * @returns Array of React Flow nodes with workflow stage data
 */
export const convertStagesToNodes = (stages: WorkflowStage[]): WorkflowStageNode[] => {
  return stages.map(stage => ({
    id: String(stage.id),
    type: 'stageNode',
    position: stage.position || { x: 0, y: 0 },
    data: stage,
    draggable: true,
    selectable: true
  }));
};

/**
 * Converts workflow transitions to React Flow edges for visualization
 * @param transitions - Array of workflow transitions to convert
 * @returns Array of React Flow edges with workflow transition data
 */
export const convertTransitionsToEdges = (transitions: WorkflowTransition[]): WorkflowTransitionEdge[] => {
  return transitions.map(transition => ({
    id: String(transition.id),
    source: String(transition.source_stage_id),
    target: String(transition.target_stage_id),
    type: 'transitionEdge',
    animated: transition.is_automatic,
    data: transition,
    style: { strokeWidth: 2 }
  }));
};

/**
 * Updates the position of a workflow stage in the backend
 * @param workflowId - ID of the workflow containing the stage
 * @param stageId - ID of the stage to update
 * @param position - New position coordinates for the stage
 * @returns Promise resolving to the updated stage
 */
export const updateStagePosition = (
  workflowId: ID,
  stageId: ID,
  position: WorkflowStagePosition
): Promise<WorkflowStage> => {
  return updateWorkflowStage(workflowId, stageId, { position });
};

/**
 * Validates a workflow for completeness and correctness
 * @param workflowId - ID of the workflow to validate
 * @returns Promise resolving to the validation results
 */
export const validateWorkflowData = (workflowId: ID): Promise<WorkflowValidationResult> => {
  return validateWorkflow(workflowId);
};

/**
 * Generates a default position for a new workflow stage
 * @param existingStages - Array of existing stages in the workflow
 * @returns Position coordinates for the new stage
 */
export const getDefaultStagePosition = (existingStages: WorkflowStage[]): WorkflowStagePosition => {
  if (!existingStages || existingStages.length === 0) {
    return { x: 250, y: 250 };
  }

  // Calculate the average position of all existing stages
  const sumX = existingStages.reduce((sum, stage) => sum + (stage.position?.x || 0), 0);
  const sumY = existingStages.reduce((sum, stage) => sum + (stage.position?.y || 0), 0);
  
  const avgX = sumX / existingStages.length;
  const avgY = sumY / existingStages.length;
  
  // Add an offset to avoid direct overlap
  return { x: avgX + 150, y: avgY + 100 };
};

/**
 * Finds a workflow stage by its ID
 * @param stages - Array of workflow stages to search
 * @param stageId - ID of the stage to find
 * @returns The found stage or undefined if not found
 */
export const getStageById = (stages: WorkflowStage[], stageId: ID): WorkflowStage | undefined => {
  return stages.find(stage => stage.id === stageId);
};

/**
 * Finds a workflow transition by its ID
 * @param transitions - Array of workflow transitions to search
 * @param transitionId - ID of the transition to find
 * @returns The found transition or undefined if not found
 */
export const getTransitionById = (
  transitions: WorkflowTransition[],
  transitionId: ID
): WorkflowTransition | undefined => {
  return transitions.find(transition => transition.id === transitionId);
};

/**
 * Finds all transitions between two stages
 * @param transitions - Array of workflow transitions to search
 * @param sourceStageId - ID of the source stage
 * @param targetStageId - ID of the target stage
 * @returns Array of transitions between the specified stages
 */
export const getTransitionsBetweenStages = (
  transitions: WorkflowTransition[],
  sourceStageId: ID,
  targetStageId: ID
): WorkflowTransition[] => {
  return transitions.filter(
    transition => 
      transition.source_stage_id === sourceStageId && 
      transition.target_stage_id === targetStageId
  );
};

/**
 * Finds all outgoing transitions from a stage
 * @param transitions - Array of workflow transitions to search
 * @param stageId - ID of the stage to find outgoing transitions for
 * @returns Array of outgoing transitions from the specified stage
 */
export const getOutgoingTransitions = (
  transitions: WorkflowTransition[],
  stageId: ID
): WorkflowTransition[] => {
  return transitions.filter(transition => transition.source_stage_id === stageId);
};

/**
 * Finds all incoming transitions to a stage
 * @param transitions - Array of workflow transitions to search
 * @param stageId - ID of the stage to find incoming transitions for
 * @returns Array of incoming transitions to the specified stage
 */
export const getIncomingTransitions = (
  transitions: WorkflowTransition[],
  stageId: ID
): WorkflowTransition[] => {
  return transitions.filter(transition => transition.target_stage_id === stageId);
};

/**
 * Creates a default transition object between two stages
 * @param sourceStageId - ID of the source stage
 * @param targetStageId - ID of the target stage
 * @returns Partial transition object with default values
 */
export const createDefaultTransition = (
  sourceStageId: ID,
  targetStageId: ID
): Partial<WorkflowTransition> => {
  return {
    source_stage_id: sourceStageId,
    target_stage_id: targetStageId,
    name: 'New Transition',
    description: 'Description for the new transition',
    is_automatic: false,
    transition_conditions: [],
    required_permissions: []
  };
};

/**
 * Creates a default stage object with a given position
 * @param workflowId - ID of the workflow to create a stage for
 * @param position - Position coordinates for the new stage
 * @returns Partial stage object with default values
 */
export const createDefaultStage = (
  workflowId: ID,
  position: WorkflowStagePosition
): Partial<WorkflowStage> => {
  return {
    workflow_id: workflowId,
    name: 'New Stage',
    description: 'Description for the new stage',
    sequence: 0, // This will be updated later
    required_documents: [],
    required_actions: [],
    notification_triggers: [],
    position
  };
};

/**
 * Formats a date string for display in the application timeline
 * @param dateString - ISO date string to format
 * @returns Formatted date string
 */
export const formatTimelineDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * Calculates the estimated completion date for an application based on its current status and historical data
 * @param timeline - Application status timeline data
 * @returns Estimated completion date string
 */
export const calculateEstimatedCompletion = (timeline: ApplicationStatusTimeline): string => {
  // If there's already an estimated completion date in the timeline, use it
  if (timeline.estimated_completion) {
    return formatTimelineDate(timeline.estimated_completion);
  }
  
  // Otherwise, calculate based on current stage and history
  // This is a simplified implementation - in a real system, this would be more complex
  const today = new Date();
  
  // Add an estimated number of days based on the current stage
  // This would typically come from historical data analysis
  const estimatedDaysRemaining = 14; // Default to 2 weeks
  
  const estimatedDate = new Date(today);
  estimatedDate.setDate(today.getDate() + estimatedDaysRemaining);
  
  return formatTimelineDate(estimatedDate.toISOString());
};

/**
 * Loads all necessary data for a workflow, including stages and transitions
 * @param workflowId - ID of the workflow to load data for
 * @returns Promise resolving to the workflow data
 */
export const loadWorkflowData = (
  workflowId: ID
): Promise<{ stages: WorkflowStage[], transitions: WorkflowTransition[] }> => {
  return Promise.all([
    getWorkflowStages(workflowId),
    getWorkflowTransitions(workflowId)
  ]).then(([stages, transitions]) => ({
    stages,
    transitions
  }));
};