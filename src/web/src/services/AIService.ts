/**
 * AI Service for interacting with AI-powered features in the Student Admissions Enrollment Platform.
 * This service provides methods for document analysis, chatbot interaction, and personalized recommendations.
 * 
 * @version 1.0.0
 */
import apiClient from '../api/apiClient';
import { ApiResponse } from '../types/api';
import { Document, AIDocumentAnalysisResult } from '../types/document';
import { ID } from '../types/common';

/**
 * Sends a document for AI analysis to extract information and verify authenticity
 * 
 * @param documentId - The ID of the document to analyze
 * @returns Promise resolving to the AI analysis results
 */
const analyzeDocument = (documentId: ID): Promise<ApiResponse<AIDocumentAnalysisResult>> => {
  return apiClient.post('ai/documents/analyze', { document_id: documentId });
};

/**
 * Gets the results of a previous document analysis
 * 
 * @param documentId - The ID of the document to get analysis results for
 * @returns Promise resolving to the AI analysis results
 */
const getDocumentAnalysisResult = (documentId: ID): Promise<ApiResponse<AIDocumentAnalysisResult>> => {
  return apiClient.get(`ai/documents/${documentId}/analysis`);
};

/**
 * Gets a response from the AI chatbot based on user input and context
 * 
 * @param message - The user's message to the chatbot
 * @param context - Additional context information (e.g., current page, application status)
 * @returns Promise resolving to the chatbot response and suggested follow-up questions
 */
const getChatbotResponse = (
  message: string,
  context: Record<string, any> = {}
): Promise<ApiResponse<{ response: string, suggestions: string[] }>> => {
  return apiClient.post('ai/chatbot', { message, context });
};

/**
 * Gets AI-driven recommendations for completing an application
 * 
 * @param applicationId - The ID of the application to get recommendations for
 * @returns Promise resolving to personalized recommendations for application completion
 */
const getApplicationRecommendations = (
  applicationId: ID
): Promise<ApiResponse<{ recommendations: Array<{ type: string, message: string, priority: number }> }>> => {
  return apiClient.get(`ai/applications/${applicationId}/recommendations`);
};

/**
 * Gets AI-driven suggestions for document preparation
 * 
 * @param applicationId - The ID of the application
 * @param documentType - The type of document to get suggestions for
 * @returns Promise resolving to document preparation suggestions
 */
const getDocumentSuggestions = (
  applicationId: ID,
  documentType: string
): Promise<ApiResponse<{ suggestions: Array<{ tip: string, importance: string }> }>> => {
  return apiClient.get('ai/documents/suggestions', {
    application_id: applicationId,
    document_type: documentType
  });
};

/**
 * Gets fraud detection analysis for a document
 * 
 * @param documentId - The ID of the document to analyze for potential fraud
 * @returns Promise resolving to fraud detection results
 */
const getFraudDetectionResult = (
  documentId: ID
): Promise<ApiResponse<{ authenticity_score: number, potential_issues: string[], verification_recommendation: string }>> => {
  return apiClient.get(`ai/documents/${documentId}/fraud-detection`);
};

export default {
  analyzeDocument,
  getDocumentAnalysisResult,
  getChatbotResponse,
  getApplicationRecommendations,
  getDocumentSuggestions,
  getFraudDetectionResult
};