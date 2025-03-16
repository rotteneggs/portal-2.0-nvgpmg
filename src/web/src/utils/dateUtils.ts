/**
 * Date utility functions for the Student Admissions Enrollment Platform
 * 
 * This module provides helper functions for date manipulation, formatting, and comparison
 * to ensure consistent date handling throughout the application.
 */

// date-fns v2.29.0
import { 
  format, 
  parse, 
  isValid, 
  isAfter, 
  isBefore, 
  differenceInDays, 
  addDays, 
  addMonths 
} from 'date-fns';

/**
 * Formats a date object or string into a human-readable string using the specified format
 * 
 * @param date - The date to format (Date object, string, or null/undefined)
 * @param formatString - The format string to use (e.g., 'MM/dd/yyyy')
 * @returns Formatted date string or empty string if date is invalid
 * 
 * @example
 * // Returns "01/15/2023"
 * formatDate(new Date(2023, 0, 15), 'MM/dd/yyyy')
 */
export const formatDate = (
  date: Date | string | null | undefined,
  formatString: string
): string => {
  if (date === null || date === undefined) {
    return '';
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return '';
  }

  return format(dateObj, formatString);
};

/**
 * Parses a date string into a Date object using the specified format
 * 
 * @param dateString - The date string to parse
 * @param formatString - The format string to use (e.g., 'MM/dd/yyyy')
 * @returns Parsed Date object or null if parsing fails
 * 
 * @example
 * // Returns Date object for January 15, 2023
 * parseDate('01/15/2023', 'MM/dd/yyyy')
 */
export const parseDate = (
  dateString: string,
  formatString: string
): Date | null => {
  if (!dateString) {
    return null;
  }

  try {
    const parsedDate = parse(dateString, formatString, new Date());
    if (!isValid(parsedDate)) {
      return null;
    }
    return parsedDate;
  } catch (error) {
    return null;
  }
};

/**
 * Checks if a date object or string is valid
 * 
 * @param date - The date to validate (Date object, string, or null/undefined)
 * @returns True if the date is valid, false otherwise
 * 
 * @example
 * // Returns true
 * isDateValid(new Date())
 * 
 * @example
 * // Returns false
 * isDateValid('invalid-date')
 */
export const isDateValid = (
  date: Date | string | null | undefined
): boolean => {
  if (date === null || date === undefined) {
    return false;
  }

  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  return isValid(dateObj);
};

/**
 * Checks if a date is after another date
 * 
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns True if date is after dateToCompare, false otherwise
 * 
 * @example
 * // Returns true
 * isDateAfter(new Date(2023, 1, 1), new Date(2023, 0, 1))
 */
export const isDateAfter = (
  date: Date | string | null | undefined,
  dateToCompare: Date | string | null | undefined
): boolean => {
  if (!date || !dateToCompare) {
    return false;
  }

  let dateObj: Date;
  let compareObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (typeof dateToCompare === 'string') {
    compareObj = new Date(dateToCompare);
  } else {
    compareObj = dateToCompare;
  }

  if (!isValid(dateObj) || !isValid(compareObj)) {
    return false;
  }

  return isAfter(dateObj, compareObj);
};

/**
 * Checks if a date is before another date
 * 
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns True if date is before dateToCompare, false otherwise
 * 
 * @example
 * // Returns true
 * isDateBefore(new Date(2023, 0, 1), new Date(2023, 1, 1))
 */
export const isDateBefore = (
  date: Date | string | null | undefined,
  dateToCompare: Date | string | null | undefined
): boolean => {
  if (!date || !dateToCompare) {
    return false;
  }

  let dateObj: Date;
  let compareObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (typeof dateToCompare === 'string') {
    compareObj = new Date(dateToCompare);
  } else {
    compareObj = dateToCompare;
  }

  if (!isValid(dateObj) || !isValid(compareObj)) {
    return false;
  }

  return isBefore(dateObj, compareObj);
};

/**
 * Calculates the number of days between two dates
 * 
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of days between the dates, or 0 if either date is invalid
 * 
 * @example
 * // Returns 31
 * getDaysBetween(new Date(2023, 0, 1), new Date(2023, 1, 1))
 */
export const getDaysBetween = (
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number => {
  if (!startDate || !endDate) {
    return 0;
  }

  let startObj: Date;
  let endObj: Date;

  if (typeof startDate === 'string') {
    startObj = new Date(startDate);
  } else {
    startObj = startDate;
  }

  if (typeof endDate === 'string') {
    endObj = new Date(endDate);
  } else {
    endObj = endDate;
  }

  if (!isValid(startObj) || !isValid(endObj)) {
    return 0;
  }

  // Use Math.abs to ensure the result is positive, regardless of which date comes first
  return Math.abs(differenceInDays(endObj, startObj));
};

/**
 * Adds a specified number of days to a date
 * 
 * @param date - The base date
 * @param days - Number of days to add
 * @returns New date with days added, or null if the input date is invalid
 * 
 * @example
 * // Returns Date object for January 11, 2023
 * addDaysToDate(new Date(2023, 0, 1), 10)
 */
export const addDaysToDate = (
  date: Date | string | null | undefined,
  days: number
): Date | null => {
  if (!date) {
    return null;
  }

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return null;
  }

  return addDays(dateObj, days);
};

/**
 * Adds a specified number of months to a date
 * 
 * @param date - The base date
 * @param months - Number of months to add
 * @returns New date with months added, or null if the input date is invalid
 * 
 * @example
 * // Returns Date object for April 1, 2023
 * addMonthsToDate(new Date(2023, 0, 1), 3)
 */
export const addMonthsToDate = (
  date: Date | string | null | undefined,
  months: number
): Date | null => {
  if (!date) {
    return null;
  }

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return null;
  }

  return addMonths(dateObj, months);
};

/**
 * Returns a human-readable label describing a date relative to today
 * 
 * @param date - The date to describe
 * @returns Relative date label or formatted date if more than 7 days away
 * 
 * @example
 * // Returns "Tomorrow" if the date is tomorrow
 * getRelativeDateLabel(addDaysToDate(new Date(), 1))
 * 
 * @example
 * // Returns "In 3 days" if the date is 3 days from now
 * getRelativeDateLabel(addDaysToDate(new Date(), 3))
 */
export const getRelativeDateLabel = (
  date: Date | string | null | undefined
): string => {
  if (!date) {
    return '';
  }

  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (!isValid(dateObj)) {
    return '';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  dateObj = new Date(dateObj);
  dateObj.setHours(0, 0, 0, 0);

  const diffDays = differenceInDays(dateObj, today);

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays > 0 && diffDays < 7) {
    return `In ${diffDays} days`;
  } else if (diffDays < 0 && diffDays > -7) {
    return `${Math.abs(diffDays)} days ago`;
  } else {
    return format(dateObj, 'MMM d, yyyy');
  }
};

/**
 * Returns the default date format string used throughout the application
 * 
 * @returns Default date format string (MM/dd/yyyy)
 * 
 * @example
 * // Returns "MM/dd/yyyy"
 * getDefaultDateFormat()
 */
export const getDefaultDateFormat = (): string => {
  return 'MM/dd/yyyy';
};