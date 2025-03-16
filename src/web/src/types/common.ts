/**
 * Common type definitions used throughout the Student Admissions Enrollment Platform
 * frontend application. This file provides reusable types for IDs, timestamps,
 * nullable values, and other common patterns to ensure consistency.
 */

// Basic type aliases
export type ID = number;
export type Timestamp = string; // ISO 8601 format

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;
export type Dictionary<T> = Record<string, T>;

/**
 * Represents the status of asynchronous operations
 */
export enum AsyncStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Interface for tracking loading state with error information
 */
export interface LoadingState {
  status: AsyncStatus;
  error: Nullable<string>;
}

/**
 * Interface for pagination parameters used in list requests
 */
export interface PaginationParams {
  page: number;
  per_page: number;
}

/**
 * Interface for sorting parameters used in list requests
 */
export interface SortParams {
  sort_by: string;
  sort_direction: 'asc' | 'desc';
}

/**
 * Interface for date range selections
 */
export interface DateRange {
  start_date: string; // ISO 8601 format
  end_date: string; // ISO 8601 format
}

/**
 * Interface for address information used in multiple entities
 */
export interface Address {
  address_line1: string;
  address_line2: Nullable<string>;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/**
 * Interface for select/dropdown options used in form components
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

/**
 * Interface for form validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Generic type for form validation errors mapped to form fields
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Interface for tracking the status of user actions
 */
export interface ActionStatus {
  loading: boolean;
  success: boolean;
  error: Nullable<string>;
}

/**
 * Interface for file objects with preview URLs
 */
export interface FileWithPreview {
  file: File;
  preview: string;
}

/**
 * Enum representing theme modes for the application
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * Enum representing responsive design breakpoints
 */
export enum Breakpoint {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl'
}

/**
 * Interface for breakpoint width values in pixels
 */
export interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}