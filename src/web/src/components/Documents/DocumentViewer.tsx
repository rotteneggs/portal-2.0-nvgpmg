import React, { useState, useEffect, useRef, useCallback } from 'react'; // react v18.2.0
import styled from '@emotion/styled'; // @emotion/styled v11.10.6
import { 
  Box, 
  Typography, 
  IconButton, 
  Tooltip, 
  CircularProgress // mui/material v5.11.10
} from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateRight, 
  RotateLeft, 
  Download, 
  Close,
  Fullscreen,
  FullscreenExit // mui/icons-material v5.11.11
} from '@mui/icons-material';
import { 
  Document as PDFDocument, 
  Page as PDFPage, 
  pdfjs // react-pdf v6.2.0
} from 'react-pdf';

import { Document } from '../../types/document';
import DocumentService from '../../services/DocumentService';
import Button from '../Common/Button';
import LoadingSkeleton from '../Common/LoadingSkeleton';
import useNotification from '../../hooks/useNotification';
import { isImageFile, isPdfFile } from '../../utils/fileUtils';

// Set PDF.js worker source (required for PDF rendering)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Props interface for the DocumentViewer component
 */
interface DocumentViewerProps {
  /** The document object to display */
  Document: Document;
  /** Callback function to close the viewer */
  onClose: () => void;
  /** Whether to show the zoom, rotation, and download controls */
  showControls?: boolean;
  /** Additional CSS class to apply to the viewer */
  className?: string;
}

// Styled components for layout and visual elements
const ViewerContainer = styled(Box)`
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

const ViewerContent = styled(Box)`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  background-color: #EEEEEE; /* neutralLight from variables */
`;

const ControlsContainer = styled(Box)`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background-color: white;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 10;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const ImageViewer = styled.img`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
`;

const PdfContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-height: 100%;
  overflow: auto;
`;

const ErrorContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
`;

/**
 * A component for viewing and interacting with document files
 */
const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  Document: document, 
  onClose, 
  showControls = true, 
  className 
}) => {
  // Initialize state variables
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Create refs for the viewer container and image element
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize notification hook
  const { displaySuccess, displayError } = useNotification();

  /**
   * useEffect hook to load document content when document prop changes
   */
  useEffect(() => {
    // Function to load the document
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get the document download URL from the DocumentService
        const url = await DocumentService.getDocumentDownloadUrl(document.id);
        setDocumentUrl(url);
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError(err.message || 'Failed to load document.');
      } finally {
        setLoading(false);
      }
    };

    // Call the loadDocument function
    loadDocument();
  }, [document.id]);

  /**
   * useEffect hook to handle fullscreen mode changes
   */
  useEffect(() => {
    // Function to handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Add event listener for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Clean up the event listener on unmount
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  /**
   * Function to increase the zoom level
   */
  const handleZoomIn = useCallback(() => {
    setZoom((prevZoom) => Math.min(prevZoom + 0.1, 2));
  }, []);

  /**
   * Function to decrease the zoom level
   */
  const handleZoomOut = useCallback(() => {
    setZoom((prevZoom) => Math.max(prevZoom - 0.1, 0.5));
  }, []);

  /**
   * Function to rotate the document clockwise
   */
  const handleRotateClockwise = useCallback(() => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  }, []);

  /**
   * Function to rotate the document counter-clockwise
   */
  const handleRotateCounterClockwise = useCallback(() => {
    setRotation((prevRotation) => (prevRotation - 90 + 360) % 360);
  }, []);

  /**
   * Function to download the document
   */
  const handleDownload = useCallback(async () => {
    try {
      // Download the document using the DocumentService
      const blob = await DocumentService.downloadDocument(document.id);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Display success notification
      displaySuccess('Document download started');
    } catch (err: any) {
      console.error('Error downloading document:', err);
      displayError(err.message || 'Failed to download document.');
    }
  }, [document.id, document.file_name, displaySuccess, displayError]);

  /**
   * Function to toggle fullscreen mode
   */
  const handleFullscreenToggle = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  /**
   * Function to render PDF documents using react-pdf
   */
  const renderPdfViewer = () => {
    return (
      <PdfContainer>
        <PDFDocument
          file={documentUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(error) => {
            console.error('Error loading PDF:', error);
            setError('Failed to load PDF document.');
          }}
        >
          <PDFPage pageNumber={currentPage} rotation={rotation} scale={zoom} />
        </PDFDocument>
        {renderPdfControls()}
      </PdfContainer>
    );
  };

  /**
   * Function to render image documents
   */
  const renderImageViewer = () => {
    return (
      <ViewerContent>
        <ImageViewer
          src={documentUrl}
          alt={document.file_name}
          style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
          ref={imageRef}
        />
      </ViewerContent>
    );
  };

  /**
   * Function to render a message for unsupported file types
   */
  const renderUnsupportedFileType = () => {
    return (
      <ErrorContainer>
        <Typography variant="h6">Unsupported File Type</Typography>
        <Typography>
          The document type "{document.mime_type}" is not supported.
        </Typography>
      </ErrorContainer>
    );
  };

  /**
   * Function to render the zoom, rotation, and download controls
   */
  const renderControls = () => {
    return (
      <ControlsContainer>
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn} aria-label="Zoom In">
            <ZoomIn />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut} aria-label="Zoom Out">
            <ZoomOut />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Clockwise">
          <IconButton onClick={handleRotateClockwise} aria-label="Rotate Clockwise">
            <RotateRight />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Counter-Clockwise">
          <IconButton onClick={handleRotateCounterClockwise} aria-label="Rotate Counter-Clockwise">
            <RotateLeft />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton onClick={handleDownload} aria-label="Download">
            <Download />
          </IconButton>
        </Tooltip>
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          <IconButton onClick={handleFullscreenToggle} aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Tooltip>
      </ControlsContainer>
    );
  };

  /**
   * Function to render PDF-specific controls like page navigation
   */
  const renderPdfControls = () => {
    return (
      <ControlsContainer>
        <Typography>
          Page {currentPage} of {numPages}
        </Typography>
        <Button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages}
        >
          Next
        </Button>
      </ControlsContainer>
    );
  };

  // Determine which viewer to render based on document type
  let viewerContent: React.ReactNode;
  if (loading) {
    viewerContent = <LoadingSkeleton variant="rectangular" />;
  } else if (error) {
    viewerContent = (
      <ErrorContainer>
        <Typography variant="h6">Error Loading Document</Typography>
        <Typography>{error}</Typography>
      </ErrorContainer>
    );
  } else if (documentUrl) {
    if (document.is_pdf) {
      viewerContent = renderPdfViewer();
    } else if (document.is_image) {
      viewerContent = renderImageViewer();
    } else {
      viewerContent = renderUnsupportedFileType();
    }
  } else {
    viewerContent = (
      <ErrorContainer>
        <Typography variant="h6">No Document Available</Typography>
        <Typography>The document URL is missing.</Typography>
      </ErrorContainer>
    );
  }

  return (
    <ViewerContainer className={className} ref={containerRef}>
      <CloseButton onClick={onClose} aria-label="Close">
        <Close />
      </CloseButton>
      {viewerContent}
      {showControls && renderControls()}
    </ViewerContainer>
  );
};

export default DocumentViewer;