# src/web/src/pages/Documents/DocumentsPage.tsx
```typescript
import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useParams, useNavigate } from 'react-router-dom'; // react-router-dom v6.8.1
import { Box, Typography, Divider, Tabs, Tab } from '@mui/material'; // @mui/material v5.11.10
import { Add as AddIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material'; // @mui/icons-material v5.11.11
import { styled } from '@emotion/styled'; // @emotion/styled v11.10.6

import DashboardLayout from '../../layouts/DashboardLayout';
import DocumentLibrary from '../../components/Documents/DocumentLibrary';
import Button from '../../components/Common/Button';
import Card from '../../components/Common/Card';
import DocumentService from '../../services/DocumentService';
import { DocumentType, Document } from '../../types/document';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';

// Styled components
const PageContainer = styled(Box)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const HeaderContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme => theme.spacing(3)};
`;

const TabsContainer = styled(Box)`
  margin-bottom: ${theme => theme.spacing(3)};
`;

const DocumentsContainer = styled(Box)`
  margin-top: ${theme => theme.spacing(2)};
`;

const LoadingContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

/**
 * Page component that displays a list of user documents with filtering, sorting, and management capabilities
 */
const DocumentsPage: React.FC = () => {
  // Extract applicationId from URL parameters
  const { applicationId } = useParams<{ applicationId: string }>();

  // Get user information and admin status from useAuth hook
  const { user, isAdmin } = useAuth();

  // Get navigation function from useNavigate hook
  const navigate = useNavigate();

  // Get notification functions from useNotification hook
  const { displaySuccess, displayError } = useNotification();

  // Initialize state for loading, documents, selected document, document types, and active tab
  const [loading, setLoading] = useState<boolean>(true);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [filteredDocumentTypes, setFilteredDocumentTypes] = useState<string[]>([]);

  // Create fetchDocumentTypes function to load allowed document types
  const fetchDocumentTypes = useCallback(async () => {
    try {
      const allowedTypes = await DocumentService.getAllowedDocumentTypes();
      setDocumentTypes(allowedTypes.allowed_types);
    } catch (error: any) {
      displayError(error.message || 'Failed to load document types.');
    }
  }, [displayError]);

  // Create fetchDocuments function to load documents for the current application
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch document types if not already loaded
      if (documentTypes.length === 0) {
        await fetchDocumentTypes();
      }
    } catch (error: any) {
      displayError(error.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [displayError, fetchDocumentTypes, documentTypes.length]);

  // Define handleDocumentSelect function to handle document selection and navigation to document view
  const handleDocumentSelect = useCallback((document: Document) => {
    navigate(`/documents/${document.id}`);
  }, [navigate]);

  // Define handleUploadClick function to navigate to document upload page
  const handleUploadClick = useCallback(() => {
    navigate(`/applications/${applicationId}/upload-document`);
  }, [navigate, applicationId]);

  // Define handleTabChange function to switch between document tabs
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Use useEffect to fetch document types and documents on component mount
  useEffect(() => {
    if (applicationId) {
      fetchDocuments();
    }
  }, [fetchDocuments, applicationId]);

  // Update filtered document types when active tab or documentTypes changes
  useEffect(() => {
    let filteredTypes: string[] = [];
    switch (activeTab) {
      case 1: // Academic
        filteredTypes = ['TRANSCRIPT', 'TEST_SCORE'];
        break;
      case 2: // Personal
        filteredTypes = ['PERSONAL_STATEMENT', 'RECOMMENDATION', 'IDENTIFICATION'];
        break;
      case 3: // Financial
        filteredTypes = ['FINANCIAL'];
        break;
      case 4: // Other
        filteredTypes = ['OTHER'];
        break;
      default:
        filteredTypes = documentTypes;
        break;
    }
    setFilteredDocumentTypes(filteredTypes);
  }, [activeTab, documentTypes]);

  // Render DashboardLayout with "Documents" title
  return (
    <DashboardLayout title="Documents">
      <PageContainer>
        {/* Render page header with title and upload button */}
        <HeaderContainer>
          <Typography variant="h4">My Documents</Typography>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleUploadClick}>
            Upload Document
          </Button>
        </HeaderContainer>

        {/* Render tabs for different document categories if document types are available */}
        {documentTypes.length > 0 && (
          <TabsContainer>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="document categories">
              <Tab label="All Documents" />
              <Tab label="Academic" />
              <Tab label="Personal" />
              <Tab label="Financial" />
              <Tab label="Other" />
            </Tabs>
          </TabsContainer>
        )}

        {/* Render DocumentLibrary component with appropriate props */}
        <DocumentsContainer>
          {loading ? (
            <LoadingContainer>
              <Typography>Loading documents...</Typography>
            </LoadingContainer>
          ) : (
            <DocumentLibrary
              applicationId={applicationId || ''}
              documentTypes={filteredDocumentTypes}
              onDocumentSelect={handleDocumentSelect}
              isAdmin={isAdmin}
            />
          )}
        </DocumentsContainer>
      </PageContainer>
    </DashboardLayout>
  );
};

export default DocumentsPage;