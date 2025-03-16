import { useState, useEffect, useCallback, useRef } from 'react'; // react v18.2.0
import { FormErrors } from '../types/common';
import { validateForm, validateField } from '../utils/validationUtils';

/**
 * Options for the useForm hook
 */
interface UseFormOptions {
  initialValues: Record<string, any>;
  validationSchema?: Record<string, Function | Array<Function>>;
  onSubmit?: (values: any, formHelpers: { setSubmitting: (isSubmitting: boolean) => void }) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Return type for the useForm hook
 */
interface UseFormReturn {
  values: Record<string, any>;
  errors: FormErrors<any>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isDirty: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string | undefined) => void;
  setFieldTouched: (field: string, isTouched?: boolean) => void;
  setValues: (values: Record<string, any>) => void;
  setErrors: (errors: FormErrors<any>) => void;
  setTouched: (touched: Record<string, boolean>) => void;
  resetForm: () => void;
  validateField: (field: string) => Promise<string | undefined>;
  validateForm: () => Promise<FormErrors<any>>;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Custom React hook for managing form state, validation, and submission
 * 
 * Features:
 * - Form state management (values, errors, touched)
 * - Form validation on change, blur, and submit
 * - Support for cross-field validation
 * - Async validation and submission
 * - Form helpers for manipulating state
 * 
 * @param options Configuration options for the form
 * @returns Form state and helper methods
 */
function useForm(options: UseFormOptions): UseFormReturn {
  const {
    initialValues,
    validationSchema = {},
    onSubmit = () => {},
    validateOnChange = false,
    validateOnBlur = true
  } = options;

  // Initialize form state
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<FormErrors<any>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Store validation schema and onSubmit in refs to prevent unnecessary rerenders
  const validationSchemaRef = useRef(validationSchema);
  const onSubmitRef = useRef(onSubmit);

  // Update refs when validation schema or onSubmit handler changes
  useEffect(() => {
    validationSchemaRef.current = validationSchema;
  }, [validationSchema]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  /**
   * Handle input change events
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = e.target;
      
      // Handle different input types
      const newValue = type === 'checkbox' ? checked : value;
      
      // Update form values
      setValues(prevValues => ({
        ...prevValues,
        [name]: newValue
      }));
      
      // Mark form as dirty since a value has changed
      setIsDirty(true);
      
      // Validate the field if validateOnChange is enabled
      if (validateOnChange && validationSchemaRef.current[name]) {
        validateFieldInternal(name, newValue);
      }
    },
    [validateOnChange]
  );

  /**
   * Handle input blur events
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      
      // Mark field as touched
      setTouched(prevTouched => ({
        ...prevTouched,
        [name]: true
      }));
      
      // Validate the field if validateOnBlur is enabled
      if (validateOnBlur && validationSchemaRef.current[name]) {
        validateFieldInternal(name);
      }
    },
    [validateOnBlur]
  );

  /**
   * Internal method to validate a single field
   */
  const validateFieldInternal = useCallback((field: string, value?: any) => {
    const validator = validationSchemaRef.current[field];
    if (!validator) return Promise.resolve(undefined);
    
    const fieldValue = value !== undefined ? value : values[field];
    const error = validateField(fieldValue, validator, values);
    
    setErrors(prevErrors => ({
      ...prevErrors,
      [field]: error
    }));
    
    return Promise.resolve(error);
  }, [values]);

  /**
   * Set a field's value programmatically
   */
  const setFieldValue = useCallback((field: string, value: any) => {
    setValues(prevValues => ({
      ...prevValues,
      [field]: value
    }));
    
    setIsDirty(true);
    
    // Validate the field if validateOnChange is enabled
    if (validateOnChange && validationSchemaRef.current[field]) {
      validateFieldInternal(field, value);
    }
  }, [validateOnChange, validateFieldInternal]);

  /**
   * Set a field's error programmatically
   */
  const setFieldError = useCallback((field: string, error: string | undefined) => {
    setErrors(prevErrors => ({
      ...prevErrors,
      [field]: error
    }));
  }, []);

  /**
   * Set a field's touched state programmatically
   */
  const setFieldTouched = useCallback((field: string, isTouched: boolean = true) => {
    setTouched(prevTouched => ({
      ...prevTouched,
      [field]: isTouched
    }));
    
    // Validate the field if validateOnBlur is enabled and field is marked as touched
    if (validateOnBlur && isTouched && validationSchemaRef.current[field]) {
      validateFieldInternal(field);
    }
  }, [validateOnBlur, validateFieldInternal]);

  /**
   * Update multiple form values at once
   */
  const setFormValues = useCallback((newValues: Record<string, any>) => {
    setValues(prevValues => ({
      ...prevValues,
      ...newValues
    }));
    
    setIsDirty(true);
    
    // Validate updated fields if validateOnChange is enabled
    if (validateOnChange) {
      Object.keys(newValues).forEach(key => {
        if (validationSchemaRef.current[key]) {
          validateFieldInternal(key, newValues[key]);
        }
      });
    }
  }, [validateOnChange, validateFieldInternal]);

  /**
   * Update multiple errors at once
   */
  const setFormErrors = useCallback((newErrors: FormErrors<any>) => {
    setErrors(prevErrors => ({
      ...prevErrors,
      ...newErrors
    }));
  }, []);

  /**
   * Update multiple touched fields at once
   */
  const setFormTouched = useCallback((newTouched: Record<string, boolean>) => {
    setTouched(prevTouched => ({
      ...prevTouched,
      ...newTouched
    }));
    
    // Validate touched fields if validateOnBlur is enabled
    if (validateOnBlur) {
      Object.entries(newTouched).forEach(([key, isTouched]) => {
        if (isTouched && validationSchemaRef.current[key]) {
          validateFieldInternal(key);
        }
      });
    }
  }, [validateOnBlur, validateFieldInternal]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsValidating(false);
    setIsDirty(false);
  }, [initialValues]);

  /**
   * Validate a single field and return any validation error
   */
  const validateFieldMethod = useCallback(async (field: string): Promise<string | undefined> => {
    return validateFieldInternal(field);
  }, [validateFieldInternal]);

  /**
   * Validate entire form and return validation errors
   */
  const validateFormMethod = useCallback(async (): Promise<FormErrors<any>> => {
    setIsValidating(true);
    
    const validationErrors = validateForm(values, validationSchemaRef.current);
    setErrors(validationErrors);
    
    setIsValidating(false);
    return validationErrors;
  }, [values]);

  /**
   * Form submission handler
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      
      setIsSubmitting(true);
      
      // Validate all fields
      const validationErrors = await validateFormMethod();
      
      // If form is valid, call onSubmit handler
      if (Object.keys(validationErrors).length === 0) {
        try {
          await onSubmitRef.current(values, {
            setSubmitting: setIsSubmitting
          });
        } catch (error) {
          console.error('Form submission error:', error);
          setIsSubmitting(false);
        }
      } else {
        // Mark all fields with errors as touched
        const touchedFields = Object.keys(validationErrors).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true
          }),
          {} as Record<string, boolean>
        );
        
        setTouched(prevTouched => ({
          ...prevTouched,
          ...touchedFields
        }));
        
        setIsSubmitting(false);
      }
    },
    [validateFormMethod, values]
  );

  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    isValidating,
    isDirty,
    
    // Form event handlers
    handleChange,
    handleBlur,
    
    // Form helpers
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues: setFormValues,
    setErrors: setFormErrors,
    setTouched: setFormTouched,
    resetForm,
    
    // Validation methods
    validateField: validateFieldMethod,
    validateForm: validateFormMethod,
    
    // Submission handler
    handleSubmit
  };
}

export default useForm;