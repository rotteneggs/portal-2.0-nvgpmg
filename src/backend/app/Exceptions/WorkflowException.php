<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Exception class for handling workflow-related errors in the admissions system.
 * 
 * This class provides specialized error handling for workflow operations,
 * including transitions, validations, and permission checks within the
 * admission process workflow engine.
 */
class WorkflowException extends Exception
{
    /**
     * The workflow context data.
     *
     * @var array
     */
    protected array $context;

    /**
     * The HTTP status code.
     *
     * @var int
     */
    protected int $statusCode;

    /**
     * The error code identifier.
     *
     * @var string
     */
    protected string $errorCode;

    /**
     * Create a new WorkflowException instance.
     *
     * @param string $message The exception message
     * @param array $context Additional context data related to the workflow
     * @param int $statusCode HTTP status code (default: 400)
     * @param string $errorCode Specific error code identifier (default: WORKFLOW_ERROR)
     * @param Exception|null $previous Previous exception if nested
     * @return void
     */
    public function __construct(
        string $message,
        array $context = [],
        int $statusCode = 400,
        string $errorCode = 'WORKFLOW_ERROR',
        Exception $previous = null
    ) {
        parent::__construct($message, 0, $previous);
        $this->context = $context;
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
    }

    /**
     * Get the workflow context data.
     *
     * @return array Array of workflow context data
     */
    public function getContext(): array
    {
        return $this->context;
    }

    /**
     * Get the HTTP status code.
     *
     * @return int HTTP status code
     */
    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    /**
     * Get the error code.
     *
     * @return string Error code
     */
    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    /**
     * Render the exception as an HTTP response.
     *
     * @param Request $request
     * @return JsonResponse JSON response with error details
     */
    public function render(Request $request): JsonResponse
    {
        $error = [
            'success' => false,
            'error' => [
                'code' => $this->errorCode,
                'message' => $this->getMessage(),
                'details' => $this->context
            ]
        ];

        return new JsonResponse($error, $this->statusCode);
    }

    /**
     * Create an exception for attempts to modify an active workflow.
     *
     * @param string $workflowName The name of the workflow being modified
     * @param int $workflowId The ID of the workflow
     * @return static A new WorkflowException instance
     */
    public static function activeWorkflowModificationError(string $workflowName, int $workflowId): self
    {
        $message = "Cannot modify active workflow '$workflowName'. Deactivate the workflow before making changes.";
        $context = [
            'workflow_id' => $workflowId,
            'workflow_name' => $workflowName
        ];

        return new static($message, $context, 400, 'ACTIVE_WORKFLOW_MODIFICATION');
    }

    /**
     * Create an exception for invalid workflow transitions.
     *
     * @param string $message The error message
     * @param array $context Additional context about the transition
     * @return static A new WorkflowException instance
     */
    public static function invalidTransitionError(string $message, array $context = []): self
    {
        return new static($message, $context, 400, 'INVALID_TRANSITION');
    }

    /**
     * Create an exception for workflow validation failures.
     *
     * @param array $validationErrors Array of validation errors
     * @param int $workflowId The ID of the workflow
     * @return static A new WorkflowException instance
     */
    public static function workflowValidationError(array $validationErrors, int $workflowId): self
    {
        $message = 'Workflow validation failed. Please correct the errors and try again.';
        $context = [
            'workflow_id' => $workflowId,
            'validation_errors' => $validationErrors
        ];

        return new static($message, $context, 422, 'WORKFLOW_VALIDATION_ERROR');
    }

    /**
     * Create an exception for unmet stage requirements.
     *
     * @param string $stageName The name of the stage with unmet requirements
     * @param array $missingRequirements List of missing requirements
     * @return static A new WorkflowException instance
     */
    public static function stageRequirementsNotMetError(string $stageName, array $missingRequirements): self
    {
        $message = "Cannot proceed to stage '$stageName'. Required conditions have not been met.";
        $context = [
            'stage_name' => $stageName,
            'missing_requirements' => $missingRequirements
        ];

        return new static($message, $context, 400, 'STAGE_REQUIREMENTS_NOT_MET');
    }

    /**
     * Create an exception for workflow permission issues.
     *
     * @param string $transitionName The name of the transition requiring permission
     * @param array $requiredPermissions List of required permissions
     * @return static A new WorkflowException instance
     */
    public static function permissionDeniedError(string $transitionName, array $requiredPermissions): self
    {
        $message = "You do not have permission to perform the transition '$transitionName'.";
        $context = [
            'transition_name' => $transitionName,
            'required_permissions' => $requiredPermissions
        ];

        return new static($message, $context, 403, 'WORKFLOW_PERMISSION_DENIED');
    }
}