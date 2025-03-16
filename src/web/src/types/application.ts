import { ID, Timestamp, Nullable } from './common';
import { ApiResponse, ApiPaginatedResponse } from './api';
import { DocumentType } from './document';

/**
 * Enum representing different types of applications that can be submitted
 */
export enum ApplicationType {
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  TRANSFER = 'transfer',
  INTERNATIONAL = 'international'
}

/**
 * Enum representing the possible statuses of an application
 * Based on the application status transition diagram in the specification
 */
export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  ADDITIONAL_INFO_REQUESTED = 'additional_info_requested',
  COMMITTEE_REVIEW = 'committee_review',
  DECISION_PENDING = 'decision_pending',
  ACCEPTED = 'accepted',
  WAITLISTED = 'waitlisted',
  REJECTED = 'rejected',
  DEPOSIT_PAID = 'deposit_paid',
  ENROLLED = 'enrolled',
  DECLINED = 'declined'
}

/**
 * Enum representing the steps in the multi-step application form
 * Supporting the multi-step application form requirement (F-001-RQ-001)
 */
export enum ApplicationFormStep {
  PERSONAL_INFORMATION = 'personal_information',
  CONTACT_DETAILS = 'contact_details',
  ACADEMIC_HISTORY = 'academic_history',
  TEST_SCORES = 'test_scores',
  PERSONAL_STATEMENT = 'personal_statement',
  RECOMMENDATIONS = 'recommendations',
  REVIEW_SUBMIT = 'review_submit'
}

/**
 * Enum representing academic terms for application submission
 */
export enum AcademicTerm {
  FALL = 'fall',
  SPRING = 'spring',
  SUMMER = 'summer',
  WINTER = 'winter'
}

/**
 * Interface for personal information section of the application
 */
export interface PersonalInformation {
  first_name: string;
  middle_name: Nullable<string>;
  last_name: string;
  date_of_birth: string; // Format: YYYY-MM-DD
  gender: string;
  citizenship: string;
  ssn: Nullable<string>; // Optional Social Security Number
}

/**
 * Interface for contact details section of the application
 */
export interface ContactDetails {
  email: string;
  phone_number: string;
  address_line1: string;
  address_line2: Nullable<string>;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/**
 * Interface for academic history section of the application
 */
export interface AcademicHistory {
  institutions: Array<{
    name: string;
    city: string;
    state: string;
    country: string;
    start_date: string; // Format: YYYY-MM-DD
    end_date: string; // Format: YYYY-MM-DD
    degree: Nullable<string>;
    major: Nullable<string>;
    gpa: Nullable<number>;
  }>;
}

/**
 * Interface for a test score in the application
 */
export interface TestScore {
  test_type: string; // SAT, ACT, GRE, etc.
  test_date: string; // Format: YYYY-MM-DD
  scores: Record<string, number>; // Different sections of the test and their scores
}

/**
 * Interface for test scores section of the application
 */
export interface TestScores {
  has_taken_tests: boolean;
  scores: TestScore[];
}

/**
 * Interface for personal statement section of the application
 */
export interface PersonalStatement {
  statement: string; // The text of the personal statement
}

/**
 * Interface for a recommendation in the application
 */
export interface Recommendation {
  recommender_name: string;
  recommender_email: string;
  recommender_title: string;
  recommender_institution: string;
  relationship: string;
  status: string; // requested, received, etc.
  requested_at: Nullable<Timestamp>;
  received_at: Nullable<Timestamp>;
}

/**
 * Interface for recommendations section of the application
 */
export interface Recommendations {
  recommendations: Recommendation[];
}

/**
 * Interface for the complete application data combining all sections
 */
export interface ApplicationData {
  personal_information: PersonalInformation;
  contact_details: ContactDetails;
  academic_history: AcademicHistory;
  test_scores: TestScores;
  personal_statement: PersonalStatement;
  recommendations: Recommendations;
}

/**
 * Interface for an application status history record
 */
export interface ApplicationStatusRecord {
  id: ID;
  application_id: ID;
  workflow_stage_id: Nullable<ID>;
  status: string;
  notes: Nullable<string>;
  created_by_user_id: ID;
  created_at: Timestamp;
}

/**
 * Interface for a complete application with all its data and related entities
 */
export interface Application {
  id: ID;
  user_id: ID;
  application_type: string;
  academic_term: string;
  academic_year: string;
  current_status_id: Nullable<ID>;
  application_data: ApplicationData;
  is_submitted: boolean;
  submitted_at: Nullable<Timestamp>;
  created_at: Timestamp;
  updated_at: Timestamp;
  
  // Related entities that might be included in responses
  current_status: Nullable<ApplicationStatusRecord>;
  statuses: Nullable<ApplicationStatusRecord[]>;
  documents: Nullable<any[]>; // We'll use any[] here since we don't have the full Document interface
}

/**
 * Interface for a simplified application list item used in listings and dashboards
 */
export interface ApplicationListItem {
  id: ID;
  application_type: string;
  academic_term: string;
  academic_year: string;
  status: string;
  is_submitted: boolean;
  submitted_at: Nullable<Timestamp>;
  created_at: Timestamp;
  updated_at: Timestamp;
  completion_percentage: number;
}

/**
 * Interface for creating a new application
 */
export interface ApplicationCreateRequest {
  application_type: string;
  academic_term: string;
  academic_year: string;
}

/**
 * Interface for updating an existing application
 */
export interface ApplicationUpdateRequest {
  application_data: Partial<ApplicationData>;
}

/**
 * Interface for submitting an application for review
 */
export interface ApplicationSubmitRequest {
  application_id: ID;
}

/**
 * Type for API response containing a single application
 */
export type ApplicationResponse = ApiResponse<Application>;

/**
 * Type for API response containing a paginated list of applications
 */
export type ApplicationListResponse = ApiPaginatedResponse<ApplicationListItem>;

/**
 * Interface for application completion status information
 */
export interface ApplicationCompletionStatus {
  isComplete: boolean;
  missingItems: string[];
  completionPercentage: number;
}

/**
 * Interface for filtering applications in listings and searches
 */
export interface ApplicationFilter {
  application_type: Nullable<string>;
  academic_term: Nullable<string>;
  academic_year: Nullable<string>;
  status: Nullable<string>;
  is_submitted: Nullable<boolean>;
  search: Nullable<string>;
}

/**
 * Interface for the applications state in Redux store
 */
export interface ApplicationsState {
  applications: ApplicationListItem[];
  currentApplication: Nullable<Application>;
  currentStep: ApplicationFormStep;
  loading: boolean;
  error: Nullable<string>;
  requiredDocuments: string[];
  missingDocuments: string[];
  completionStatus: Nullable<ApplicationCompletionStatus>;
}