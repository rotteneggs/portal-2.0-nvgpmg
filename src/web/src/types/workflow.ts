/**
 * TypeScript type definitions for workflow-related data structures in the Student Admissions Enrollment Platform.
 * This file defines interfaces for workflows, stages, transitions, and related entities used in the
 * WYSIWYG workflow editor and application status tracking features.
 */

import { ID } from './common';
import { User } from './user';
import { Application } from './application';
import { Node, Edge, XYPosition } from 'reactflow'; // reactflow ^11.0.0

/**
 * Enum defining the possible types of admissions workflows
 */
export enum WorkflowType {
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  TRANSFER = 'transfer'
}

/**
 * Interface defining the structure of a workflow in the admissions system
 */
export interface Workflow {
  id: ID;
  name: string;
  description: string;
  application_type: WorkflowType;
  is_active: boolean;
  created_by_user_id: ID;
  created_at: string;
  updated_at: string;
}

/**
 * Interface defining the structure of a stage within a workflow
 */
export interface WorkflowStage {
  id: ID;
  workflow_id: ID;
  name: string;
  description: string;
  sequence: number;
  required_documents: string[];
  required_actions: string[];
  notification_triggers: NotificationTrigger[];
  assigned_role_id: ID;
  position: WorkflowStagePosition;
  created_at: string;
  updated_at: string;
  assignedRole?: { id: ID; name: string };
}

/**
 * Interface defining the position of a workflow stage in the editor canvas
 */
export interface WorkflowStagePosition {
  x: number;
  y: number;
}

/**
 * Interface defining a notification trigger configuration for workflow stages
 */
export interface NotificationTrigger {
  event: string;
  recipient: string;
  template: string;
  channels: string[];
}

/**
 * Interface defining a transition between workflow stages
 */
export interface WorkflowTransition {
  id: ID;
  source_stage_id: ID;
  target_stage_id: ID;
  name: string;
  description: string;
  transition_conditions: TransitionCondition[];
  required_permissions: string[];
  is_automatic: boolean;
  created_at: string;
  updated_at: string;
  sourceStage?: WorkflowStage;
  targetStage?: WorkflowStage;
}

/**
 * Interface defining a condition that must be met for a transition to be available
 */
export interface TransitionCondition {
  field: string;
  operator: string;
  value: any;
}

/**
 * Interface defining filter criteria for fetching workflows
 */
export interface WorkflowFilter {
  type?: WorkflowType | WorkflowType[];
  is_active?: boolean;
  created_by?: ID;
  search?: string;
}

/**
 * Interface defining filter criteria for fetching workflow transitions
 */
export interface WorkflowTransitionFilter {
  source_stage_id?: ID;
  target_stage_id?: ID;
  is_automatic?: boolean;
}

/**
 * Interface defining the result of validating a workflow
 */
export interface WorkflowValidationResult {
  is_valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
}

/**
 * Interface defining an error found during workflow validation
 */
export interface WorkflowValidationError {
  code: string;
  message: string;
  entity_type: string;
  entity_id: ID;
}

/**
 * Interface defining a warning found during workflow validation
 */
export interface WorkflowValidationWarning {
  code: string;
  message: string;
  entity_type: string;
  entity_id: ID;
}

/**
 * Interface defining the status timeline for an application
 */
export interface ApplicationStatusTimeline {
  application_id: ID;
  current_stage: WorkflowStage;
  history: ApplicationStatusHistoryItem[];
  estimated_completion: string;
}

/**
 * Interface defining a historical status entry for an application
 */
export interface ApplicationStatusHistoryItem {
  status_id: ID;
  stage: WorkflowStage;
  status: string;
  notes: string;
  created_by: User;
  created_at: string;
}

/**
 * Interface extending React Flow Node type for workflow stage nodes
 */
export interface WorkflowStageNode extends Node {
  id: string;
  type: string;
  position: XYPosition;
  data: WorkflowStage;
}

/**
 * Interface extending React Flow Edge type for workflow transition edges
 */
export interface WorkflowTransitionEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  data: WorkflowTransition;
}

/**
 * Interface defining the state for the workflow editor component
 */
export interface WorkflowEditorState {
  workflow: Workflow;
  selectedStage: WorkflowStage | null;
  selectedTransition: WorkflowTransition | null;
  transitionSource: WorkflowStage | null;
  isDragging: boolean;
  isCreatingTransition: boolean;
  zoom: number;
  pan: { x: number; y: number };
}