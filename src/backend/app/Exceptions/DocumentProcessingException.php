<?php

namespace App\Exceptions;

use Exception; // PHP 8.2

/**
 * Custom exception class for handling document processing errors in the
 * Student Admissions Enrollment Platform.
 * 
 * This exception provides specialized error handling for different types of
 * document-related failures with meaningful error codes and context information.
 */
class DocumentProcessingException extends Exception
{
    /**
     * The specific error code identifying the type of document processing error.
     */
    protected string $errorCode;
    
    /**
     * Context information about the document being processed.
     */
    protected array $documentContext;

    /**
     * Create a new document processing exception instance.
     *
     * @param string $message The exception message
     * @param int $code The exception code
     * @param \Throwable|null $previous The previous exception
     * @param string $errorCode The specific document error code
     * @param array $documentContext Additional context information about the document
     */
    public function __construct(
        string $message, 
        int $code = 0, 
        ?\Throwable $previous = null, 
        string $errorCode = '', 
        array $documentContext = []
    ) {
        parent::__construct($message, $code, $previous);
        $this->errorCode = $errorCode;
        $this->documentContext = $documentContext;
    }

    /**
     * Get the error code for this exception.
     *
     * @return string Error code identifying the type of document processing error
     */
    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /**
     * Get the document context information.
     *
     * @return array Context information about the document being processed
     */
    public function getDocumentContext(): array
    {
        return $this->documentContext;
    }

    /**
     * Create an exception for document upload errors.
     *
     * @param string $message The error message
     * @param array $context The document context (filename, size, user, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromUploadError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_UPLOAD_ERROR', $context);
    }

    /**
     * Create an exception for document storage errors.
     *
     * @param string $message The error message
     * @param array $context The document context (filepath, storage provider, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromStorageError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_STORAGE_ERROR', $context);
    }

    /**
     * Create an exception for document format errors (invalid type, size, etc.).
     *
     * @param string $message The error message
     * @param array $context The document context (file type, size, validation errors, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromFormatError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_FORMAT_ERROR', $context);
    }

    /**
     * Create an exception for document verification errors.
     *
     * @param string $message The error message
     * @param array $context The document context (verification method, status, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromVerificationError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_VERIFICATION_ERROR', $context);
    }

    /**
     * Create an exception for document analysis errors (AI processing failures).
     *
     * @param string $message The error message
     * @param array $context The document context (analysis method, confidence scores, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromAnalysisError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_ANALYSIS_ERROR', $context);
    }

    /**
     * Create an exception for document access errors (permissions, missing files).
     *
     * @param string $message The error message
     * @param array $context The document context (access request details, permissions, etc.)
     * @param \Throwable|null $previous The previous exception
     * @return self A new DocumentProcessingException instance
     */
    public static function createFromAccessError(
        string $message, 
        array $context = [], 
        ?\Throwable $previous = null
    ): self {
        return new static($message, 0, $previous, 'DOCUMENT_ACCESS_ERROR', $context);
    }
}