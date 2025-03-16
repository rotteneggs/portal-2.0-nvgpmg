/**
 * Service responsible for application management in the Student Admissions Enrollment Platform.
 * This service provides a higher-level interface for application operations including creation,
 * submission, status tracking, and document requirements, with additional client-side validation
 * and processing.
 */
import applicationsApi from '../api/applications';
import DocumentService from './DocumentService';
import FileUploadService from './FileUploadService';
import notificationService from './NotificationService';
import {
  Application,
  ApplicationListItem,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  ApplicationCompletionStatus,
  ApplicationFilter,
  ApplicationFormStep,
  ApplicationStatus
} from '../types/application';
import { DocumentType } from '../types/document';
import { formatError } from '../utils/errorUtils';

/**
 * Fetch applications with optional filtering and pagination
 * 
 * @param filters - Optional filters for the applications list
 * @param page - Page number for pagination (default: 1)
 * @param perPage - Number of items per page (default: 10)
 * @returns Promise resolving to applications list with pagination
 */
const getApplications = async (
  filters: ApplicationFilter = {},
  page: number = 1,
  perPage: number = 10
): Promise<{ applications: ApplicationListItem[], pagination: any }> => {
  try {
    const response = await applicationsApi.getApplications(filters, page, perPage);
    return {
      applications: response.data,
      pagination: response.meta?.pagination
    };
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Fetch a specific application by ID with optional includes
 * 
 * @param id - The ID of the application to fetch
 * @param includeDocuments - Whether to include related documents (default: false)
 * @param includeStatuses - Whether to include status history (default: false)
 * @returns Promise resolving to application details
 */
const getApplication = async (
  id: number,
  includeDocuments: boolean = false,
  includeStatuses: boolean = false
): Promise<Application> => {
  try {
    const response = await applicationsApi.getApplication(id, includeDocuments, includeStatuses);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Create a new application with the specified type, term, and year
 * 
 * @param applicationData - Application creation data including type, term, and year
 * @returns Promise resolving to the created application
 */
const createApplication = async (
  applicationData: ApplicationCreateRequest
): Promise<Application> => {
  try {
    // Validate required fields
    if (!applicationData.application_type || !applicationData.academic_term || !applicationData.academic_year) {
      throw new Error('Application type, academic term, and academic year are required');
    }
    
    const response = await applicationsApi.createApplication(applicationData);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Update an existing application with new data
 * 
 * @param id - The ID of the application to update
 * @param applicationData - The updated application data
 * @returns Promise resolving to the updated application
 */
const updateApplication = async (
  id: number,
  applicationData: ApplicationUpdateRequest
): Promise<Application> => {
  try {
    // Validate that we have application data to update
    if (!applicationData.application_data) {
      throw new Error('Application data is required');
    }
    
    const response = await applicationsApi.updateApplication(id, applicationData);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Submit an application for review after validation
 * 
 * @param id - The ID of the application to submit
 * @returns Promise resolving to the submitted application
 */
const submitApplication = async (id: number): Promise<Application> => {
  try {
    // First check if the application is complete
    const completionStatus = await checkApplicationComplete(id);
    
    if (!completionStatus.isComplete) {
      throw new Error(`Cannot submit incomplete application. Missing items: ${completionStatus.missingItems.join(', ')}`);
    }
    
    const response = await applicationsApi.submitApplication(id);
    return response.data;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Delete a draft application
 * 
 * @param id - The ID of the application to delete
 * @returns Promise resolving to true if deletion was successful
 */
const deleteApplication = async (id: number): Promise<boolean> => {
  try {
    await applicationsApi.deleteApplication(id);
    return true;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Check if an application is complete and ready for submission
 * 
 * @param id - The ID of the application to check
 * @returns Promise resolving to completion status with missing items
 */
const checkApplicationComplete = async (id: number): Promise<ApplicationCompletionStatus> => {
  try {
    return await applicationsApi.checkApplicationComplete(id);
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Get a list of required documents for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to array of required document types
 */
const getRequiredDocuments = async (id: number): Promise<string[]> => {
  try {
    return await applicationsApi.getRequiredDocuments(id);
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Get a list of missing documents for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to array of missing document types
 */
const getMissingDocuments = async (id: number): Promise<string[]> => {
  try {
    return await applicationsApi.getMissingDocuments(id);
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Get the status history for an application
 * 
 * @param id - The ID of the application
 * @returns Promise resolving to array of status history records
 */
const getApplicationStatuses = async (id: number): Promise<any[]> => {
  try {
    return await applicationsApi.getApplicationStatuses(id);
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Upload a document for a specific application
 * 
 * @param applicationId - The ID of the application
 * @param file - The file to upload
 * @param documentType - The type of document being uploaded
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to the uploaded document data
 */
const uploadApplicationDocument = async (
  applicationId: number,
  file: File,
  documentType: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  try {
    // Validate file and document type
    if (!file) {
      throw new Error('File is required');
    }
    
    if (!documentType) {
      throw new Error('Document type is required');
    }
    
    return await FileUploadService.uploadDocumentFile(
      file,
      documentType,
      applicationId,
      onProgress
    );
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Get all documents for a specific application
 * 
 * @param applicationId - The ID of the application
 * @returns Promise resolving to array of application documents
 */
const getApplicationDocuments = async (applicationId: number): Promise<any[]> => {
  try {
    const documents = await DocumentService.getDocumentsByApplication(applicationId);
    return documents;
  } catch (error) {
    throw formatError(error);
  }
};

/**
 * Validate a specific step of the application form
 * 
 * @param step - The step to validate
 * @param stepData - The data for the step being validated
 * @returns Validation result with errors if any
 */
const validateApplicationStep = (
  step: ApplicationFormStep,
  stepData: any
): { valid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // If stepData is undefined or null, return invalid result immediately
  if (!stepData) {
    return { valid: false, errors: { [step]: 'This section is incomplete' } };
  }

  switch (step) {
    case ApplicationFormStep.PERSONAL_INFORMATION:
      // Validate personal information
      if (!stepData.first_name) {
        errors.first_name = 'First name is required';
      }
      
      if (!stepData.last_name) {
        errors.last_name = 'Last name is required';
      }
      
      if (!stepData.date_of_birth) {
        errors.date_of_birth = 'Date of birth is required';
      } else if (new Date(stepData.date_of_birth) > new Date()) {
        errors.date_of_birth = 'Date of birth cannot be in the future';
      }
      
      if (!stepData.gender) {
        errors.gender = 'Gender is required';
      }
      
      if (!stepData.citizenship) {
        errors.citizenship = 'Citizenship information is required';
      }
      break;
      
    case ApplicationFormStep.CONTACT_DETAILS:
      // Validate contact details
      if (!stepData.email) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stepData.email)) {
        errors.email = 'Valid email address is required';
      }
      
      if (!stepData.phone_number) {
        errors.phone_number = 'Phone number is required';
      }
      
      if (!stepData.address_line1) {
        errors.address_line1 = 'Address is required';
      }
      
      if (!stepData.city) {
        errors.city = 'City is required';
      }
      
      if (!stepData.state) {
        errors.state = 'State/Province is required';
      }
      
      if (!stepData.postal_code) {
        errors.postal_code = 'Postal code is required';
      }
      
      if (!stepData.country) {
        errors.country = 'Country is required';
      }
      break;
      
    case ApplicationFormStep.ACADEMIC_HISTORY:
      // Validate academic history
      if (!stepData.institutions || !Array.isArray(stepData.institutions) || stepData.institutions.length === 0) {
        errors.institutions = 'At least one educational institution is required';
      } else {
        stepData.institutions.forEach((institution: any, index: number) => {
          if (!institution.name) {
            errors[`institutions[${index}].name`] = 'Institution name is required';
          }
          
          if (!institution.start_date) {
            errors[`institutions[${index}].start_date`] = 'Start date is required';
          }
          
          if (!institution.city || !institution.state || !institution.country) {
            errors[`institutions[${index}].location`] = 'Institution location is required';
          }
        });
      }
      break;
      
    case ApplicationFormStep.TEST_SCORES:
      // Validate test scores
      if (stepData.has_taken_tests === undefined) {
        errors.has_taken_tests = 'Please indicate whether you have taken standardized tests';
      } else if (stepData.has_taken_tests) {
        if (!stepData.scores || !Array.isArray(stepData.scores) || stepData.scores.length === 0) {
          errors.scores = 'At least one test score is required';
        } else {
          stepData.scores.forEach((score: any, index: number) => {
            if (!score.test_type) {
              errors[`scores[${index}].test_type`] = 'Test type is required';
            }
            
            if (!score.test_date) {
              errors[`scores[${index}].test_date`] = 'Test date is required';
            }
            
            if (!score.scores || Object.keys(score.scores).length === 0) {
              errors[`scores[${index}].scores`] = 'Test scores are required';
            }
          });
        }
      }
      break;
      
    case ApplicationFormStep.PERSONAL_STATEMENT:
      // Validate personal statement
      if (!stepData.statement || stepData.statement.trim().length === 0) {
        errors.statement = 'Personal statement is required';
      } else if (stepData.statement.length < 250) {
        errors.statement = 'Personal statement should be at least 250 characters';
      }
      break;
      
    case ApplicationFormStep.RECOMMENDATIONS:
      // Validate recommendations
      if (!stepData.recommendations || !Array.isArray(stepData.recommendations)) {
        errors.recommendations = 'Recommendations are required';
      } else {
        // Validate based on required number of recommendations (typical: 2-3)
        const requiredRecommendations = 2; // This could be dynamic based on program
        
        if (stepData.recommendations.length < requiredRecommendations) {
          errors.recommendations = `At least ${requiredRecommendations} recommendations are required`;
        } else {
          stepData.recommendations.forEach((rec: any, index: number) => {
            if (!rec.recommender_name) {
              errors[`recommendations[${index}].recommender_name`] = 'Recommender name is required';
            }
            
            if (!rec.recommender_email) {
              errors[`recommendations[${index}].recommender_email`] = 'Recommender email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.recommender_email)) {
              errors[`recommendations[${index}].recommender_email`] = 'Valid email address is required';
            }
            
            if (!rec.relationship) {
              errors[`recommendations[${index}].relationship`] = 'Relationship is required';
            }
          });
        }
      }
      break;
      
    case ApplicationFormStep.REVIEW_SUBMIT:
      // For review & submit, validate that all previous steps are complete
      // This is a higher-level validation that would check the application as a whole
      // Usually handled by checkApplicationComplete instead of here
      break;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Calculate the completion percentage of an application
 * 
 * @param application - The application to calculate completion for
 * @returns Percentage of application completion (0-100)
 */
const calculateCompletionPercentage = (application: Application): number => {
  if (!application || !application.application_data) {
    return 0;
  }
  
  // Define weights for each section if needed
  const sectionWeights = {
    [ApplicationFormStep.PERSONAL_INFORMATION]: 1,
    [ApplicationFormStep.CONTACT_DETAILS]: 1,
    [ApplicationFormStep.ACADEMIC_HISTORY]: 1,
    [ApplicationFormStep.TEST_SCORES]: 1,
    [ApplicationFormStep.PERSONAL_STATEMENT]: 1,
    [ApplicationFormStep.RECOMMENDATIONS]: 1,
    [ApplicationFormStep.REVIEW_SUBMIT]: 0 // The review step doesn't count toward completion
  };
  
  let completedWeight = 0;
  const totalWeight = Object.values(sectionWeights).reduce((sum, weight) => sum + weight, 0);
  
  // Check completion of each section
  Object.entries(sectionWeights).forEach(([step, weight]) => {
    if (step === ApplicationFormStep.REVIEW_SUBMIT) {
      return; // Skip review step
    }
    
    const stepData = application.application_data[step as ApplicationFormStep];
    if (stepData) {
      const validationResult = validateApplicationStep(step as ApplicationFormStep, stepData);
      
      if (validationResult.valid) {
        completedWeight += weight;
      }
    }
  });
  
  // Calculate percentage and round to whole number
  const percentage = (completedWeight / totalWeight) * 100;
  return Math.min(100, Math.round(percentage));
};

/**
 * Subscribe to real-time updates for an application
 * 
 * @param applicationId - The ID of the application to subscribe to
 * @param callback - Function to call when updates are received
 * @returns Unsubscribe function to clean up the subscription
 */
const subscribeToApplicationUpdates = (
  applicationId: number,
  callback: (updateData: any) => void
): () => void => {
  return notificationService.subscribeToRealTimeNotifications(
    applicationId.toString(),
    (notification) => {
      // Filter for application-related notifications
      if (notification.data && notification.data.application_id === applicationId) {
        callback(notification);
      }
    }
  );
};

/**
 * Get the next required step for an application that needs completion
 * 
 * @param application - The application to check
 * @returns The next step that needs completion or null if all complete
 */
const getNextRequiredStep = (application: Application): ApplicationFormStep | null => {
  if (!application || !application.application_data) {
    return ApplicationFormStep.PERSONAL_INFORMATION;
  }
  
  // Order of steps to check
  const steps = [
    ApplicationFormStep.PERSONAL_INFORMATION,
    ApplicationFormStep.CONTACT_DETAILS,
    ApplicationFormStep.ACADEMIC_HISTORY,
    ApplicationFormStep.TEST_SCORES,
    ApplicationFormStep.PERSONAL_STATEMENT,
    ApplicationFormStep.RECOMMENDATIONS,
    ApplicationFormStep.REVIEW_SUBMIT
  ];
  
  // Check each step in order
  for (const step of steps) {
    const stepData = application.application_data[step];
    // If the step data doesn't exist or is empty, it's not complete
    if (!stepData || Object.keys(stepData).length === 0) {
      return step;
    }
    
    const validationResult = validateApplicationStep(step, stepData);
    if (!validationResult.valid) {
      return step;
    }
  }
  
  // All steps are complete
  return null;
};

const ApplicationService = {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  submitApplication,
  deleteApplication,
  checkApplicationComplete,
  getRequiredDocuments,
  getMissingDocuments,
  getApplicationStatuses,
  uploadApplicationDocument,
  getApplicationDocuments,
  validateApplicationStep,
  calculateCompletionPercentage,
  subscribeToApplicationUpdates,
  getNextRequiredStep
};

export default ApplicationService;