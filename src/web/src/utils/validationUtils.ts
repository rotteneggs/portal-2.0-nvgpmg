import { ValidationError, FormErrors } from '../types/common';

/**
 * Validates that a field has a non-empty value
 * @param value The value to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const required = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return message || 'This field is required';
  }
  return undefined;
};

/**
 * Validates that a string has at least a minimum length
 * @param value The value to validate
 * @param min The minimum length required
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const minLength = (value: any, min: number, message?: string): string | undefined => {
  if (value === undefined || value === null || typeof value !== 'string') {
    return undefined; // Let required validator handle empty values
  }
  if (value.length < min) {
    return message || `Must be at least ${min} characters`;
  }
  return undefined;
};

/**
 * Validates that a string does not exceed a maximum length
 * @param value The value to validate
 * @param max The maximum length allowed
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const maxLength = (value: any, max: number, message?: string): string | undefined => {
  if (value === undefined || value === null || typeof value !== 'string') {
    return undefined; // Let required validator handle empty values
  }
  if (value.length > max) {
    return message || `Must not exceed ${max} characters`;
  }
  return undefined;
};

/**
 * Validates that a value is a properly formatted email address
 * @param value The value to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const email = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(value)) {
    return message || 'Please enter a valid email address';
  }
  return undefined;
};

/**
 * Validates that a value is a properly formatted phone number
 * @param value The value to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const phoneNumber = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  // Allows formats like: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
  const phoneRegex = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  
  if (!phoneRegex.test(value)) {
    return message || 'Please enter a valid phone number';
  }
  return undefined;
};

/**
 * Validates that a value contains only numeric characters
 * @param value The value to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const numeric = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  const numericRegex = /^[0-9]+$/;
  
  if (!numericRegex.test(value.toString())) {
    return message || 'Please enter only numeric characters';
  }
  return undefined;
};

/**
 * Validates that a value is a valid date string
 * @param value The value to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const date = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  const dateObj = new Date(value);
  
  // Check if date is valid and not NaN
  if (isNaN(dateObj.getTime())) {
    return message || 'Please enter a valid date';
  }
  return undefined;
};

/**
 * Validates that a numeric value is at least a minimum value
 * @param value The value to validate
 * @param min The minimum value allowed
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const min = (value: any, min: number, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue) || numValue < min) {
    return message || `Value must be at least ${min}`;
  }
  return undefined;
};

/**
 * Validates that a numeric value does not exceed a maximum value
 * @param value The value to validate
 * @param max The maximum value allowed
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const max = (value: any, max: number, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue) || numValue > max) {
    return message || `Value must not exceed ${max}`;
  }
  return undefined;
};

/**
 * Validates that a value matches a regular expression pattern
 * @param value The value to validate
 * @param regex The regular expression to test against
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const pattern = (value: any, regex: RegExp, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  if (!regex.test(value.toString())) {
    return message || 'Value does not match the required pattern';
  }
  return undefined;
};

/**
 * Validates that a password meets complexity requirements
 * @param value The password to validate
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const passwordComplexity = (value: any, message?: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined; // Let required validator handle empty values
  }
  
  const minLength = 12;
  const hasLowercase = /[a-z]/.test(value);
  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
  
  if (
    value.length < minLength ||
    !hasLowercase ||
    !hasUppercase ||
    !hasNumber ||
    !hasSpecialChar
  ) {
    return message || 'Password must be at least 12 characters and include lowercase, uppercase, number, and special character';
  }
  return undefined;
};

/**
 * Validates that a value matches another field's value (for password confirmation)
 * @param value The value to validate
 * @param fieldToMatch The name of the field to match against
 * @param allValues All form values
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const match = (
  value: any,
  fieldToMatch: string,
  allValues: Record<string, any>,
  message?: string
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined; // Let required validator handle empty values
  }
  
  const valueToMatch = allValues[fieldToMatch];
  
  if (value !== valueToMatch) {
    return message || `Must match ${fieldToMatch.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
  }
  return undefined;
};

/**
 * Validates that a file is of an allowed type
 * @param file The file to validate
 * @param allowedTypes Array of allowed file types/extensions
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const fileType = (
  file: File,
  allowedTypes: string[],
  message?: string
): string | undefined => {
  if (!file) {
    return undefined; // Let required validator handle empty values
  }
  
  // Extract file extension from name
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  // Check if file type is in allowed list (by extension or MIME type)
  const isAllowed = allowedTypes.some(type => {
    if (type.startsWith('.')) {
      // Check by extension
      return `.${fileExtension}` === type.toLowerCase();
    } else {
      // Check by MIME type
      return file.type === type || file.type.startsWith(`${type}/`);
    }
  });
  
  if (!isAllowed) {
    return message || `File type not allowed. Accepted types: ${allowedTypes.join(', ')}`;
  }
  return undefined;
};

/**
 * Validates that a file does not exceed a maximum size
 * @param file The file to validate
 * @param maxSizeInBytes Maximum file size in bytes
 * @param message Custom error message (optional)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const fileSize = (
  file: File,
  maxSizeInBytes: number,
  message?: string
): string | undefined => {
  if (!file) {
    return undefined; // Let required validator handle empty values
  }
  
  if (file.size > maxSizeInBytes) {
    const maxSizeInMB = maxSizeInBytes / (1024 * 1024);
    return message || `File size exceeds maximum allowed size (${maxSizeInMB} MB)`;
  }
  return undefined;
};

/**
 * Combines multiple validators into a single validator function
 * @param validators Array of validator functions to combine
 * @returns Combined validator function that runs all validators in sequence
 */
export const composeValidators = (validators: Function[]): Function => {
  return (value: any, allValues: Record<string, any>) => {
    for (const validator of validators) {
      const error = validator(value, allValues);
      if (error) {
        return error;
      }
    }
    return undefined;
  };
};

/**
 * Validates a single field value against its validation rules
 * @param value The field value to validate
 * @param validator A validator function or array of validator functions
 * @param allValues All form values (for cross-field validation)
 * @returns Error message if validation fails, undefined if validation passes
 */
export const validateField = (
  value: any,
  validator: Function | Function[],
  allValues: Record<string, any> = {}
): string | undefined => {
  if (Array.isArray(validator)) {
    return composeValidators(validator)(value, allValues);
  }
  return validator(value, allValues);
};

/**
 * Validates all form values against their validation schema
 * @param values Object containing all form values
 * @param validationSchema Object mapping field names to validator functions
 * @returns Object containing field names and error messages for invalid fields
 */
export const validateForm = (
  values: Record<string, any>,
  validationSchema: Record<string, Function | Function[]>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const field in validationSchema) {
    if (Object.prototype.hasOwnProperty.call(validationSchema, field)) {
      const error = validateField(values[field], validationSchema[field], values);
      if (error) {
        errors[field] = error;
      }
    }
  }
  
  return errors;
};