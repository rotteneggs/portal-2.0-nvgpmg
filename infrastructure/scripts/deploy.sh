#!/bin/bash
#
# deploy.sh
#
# Main deployment script for the Student Admissions Enrollment Platform
# This script serves as a unified entry point for deployments across different
# environments (development, staging, production) with appropriate validation
# and rollback procedures.
#
# Author: DevOps Team
# Version: 1.0.0

# Exit immediately if a command exits with a non-zero status
set -e

# Get script directory and repository root paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values for parameters
ENVIRONMENT="development"
AWS_REGION="us-east-1"
REGISTRY="ghcr.io"
REPOSITORY=""
IMAGE_TAG=""
SKIP_BUILD=false
SKIP_INFRA=false
SKIP_TESTS=false
FORCE_DEPLOY=false

# Display usage information
print_usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo
    echo "Deploy the Student Admissions Enrollment Platform to the specified environment."
    echo
    echo "Options:"
    echo "  -e, --environment ENV       Target environment: development, staging, production"
    echo "  -r, --registry URL          Container registry URL (default: ghcr.io)"
    echo "  -o, --repository REPO       GitHub repository name in owner/repo format (required)"
    echo "  -t, --tag TAG               Image tag (default: derived from environment and git commit)"
    echo "  -a, --aws-region REGION     AWS region (default: us-east-1)"
    echo "  --skip-build                Skip building and pushing Docker images"
    echo "  --skip-infra                Skip infrastructure deployment (Terraform)"
    echo "  --skip-tests                Skip post-deployment tests"
    echo "  -f, --force                 Force deployment without confirmation prompts"
    echo "  -h, --help                  Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $(basename "$0") -e staging -o myorg/admissions-platform -t v1.0.0"
    echo "  $(basename "$0") --environment production --repository myorg/admissions-platform --force"
    echo "  $(basename "$0") -e development -o myorg/admissions-platform --skip-infra"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--registry)
                REGISTRY="$2"
                shift 2
                ;;
            -o|--repository)
                REPOSITORY="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -a|--aws-region)
                AWS_REGION="$2"
                shift 2
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-infra)
                SKIP_INFRA=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -f|--force)
                FORCE_DEPLOY=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                echo "Error: Unknown option $1"
                print_usage
                return 1
                ;;
        esac
    done

    # Validate environment
    case "$ENVIRONMENT" in
        development|staging|production)
            # Valid environment
            ;;
        *)
            echo "Error: Invalid environment '$ENVIRONMENT'. Must be one of: development, staging, production"
            return 1
            ;;
    esac

    # Validate required parameters
    if [ -z "$REPOSITORY" ]; then
        echo "Error: Repository name is required"
        print_usage
        return 1
    fi

    # Set default image tag if not provided
    if [ -z "$IMAGE_TAG" ]; then
        # Get current git commit hash (short)
        GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        # Generate tag based on environment and git commit
        IMAGE_TAG="${ENVIRONMENT}-${GIT_COMMIT}-$(date +%Y%m%d%H%M)"
    fi

    return 0
}

# Check if all required tools are installed
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if required tools are installed
    for cmd in kubectl aws terraform docker; do
        if ! command -v $cmd &> /dev/null; then
            echo "Error: $cmd is not installed or not in PATH"
            return 1
        fi
    done
    
    # Check if we can access the repository
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        echo "Error: Not inside a git repository"
        return 1
    fi
    
    # Check if AWS credentials are configured (if not skipping infrastructure)
    if [ "$SKIP_INFRA" = false ]; then
        if ! aws sts get-caller-identity &> /dev/null; then
            echo "Error: AWS credentials not configured or insufficient permissions"
            echo "Please run 'aws configure' or ensure your IAM role has appropriate permissions"
            return 1
        fi
    fi
    
    echo "All prerequisites are met."
    return 0
}

# Set environment-specific variables
set_environment_variables() {
    echo "Setting environment-specific variables for $ENVIRONMENT environment..."
    
    # Set EKS cluster name based on environment
    EKS_CLUSTER_NAME="admissions-${ENVIRONMENT}"
    
    # Set Kubernetes namespace based on environment
    NAMESPACE="admissions-${ENVIRONMENT}"
    
    # Set terraform directory based on environment
    TERRAFORM_DIR="${REPO_ROOT}/infrastructure/terraform/${ENVIRONMENT}"
    
    # Set kustomize directory based on environment
    KUSTOMIZE_DIR="${REPO_ROOT}/infrastructure/kubernetes/overlays/${ENVIRONMENT}"
    
    # Validate that the environment-specific directories exist
    if [ ! -d "$TERRAFORM_DIR" ] && [ "$SKIP_INFRA" = false ]; then
        echo "Error: Terraform directory '$TERRAFORM_DIR' does not exist"
        return 1
    fi
    
    if [ ! -d "$KUSTOMIZE_DIR" ]; then
        echo "Error: Kustomize directory '$KUSTOMIZE_DIR' does not exist"
        return 1
    fi
    
    return 0
}

# Confirm deployment with user (unless force flag is set)
confirm_deployment() {
    if [ "$FORCE_DEPLOY" = true ]; then
        echo "Skipping confirmation due to --force flag"
        return 0
    fi
    
    echo
    echo "======== DEPLOYMENT CONFIRMATION ========"
    echo "Environment:     $ENVIRONMENT"
    echo "Repository:      $REPOSITORY"
    echo "Image Tag:       $IMAGE_TAG"
    echo "AWS Region:      $AWS_REGION"
    echo "Skip Build:      $SKIP_BUILD"
    echo "Skip Infra:      $SKIP_INFRA"
    echo "Skip Tests:      $SKIP_TESTS"
    echo "========================================"
    echo
    read -p "Do you want to proceed with the deployment? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled by user."
        return 1
    fi
    
    return 0
}

# Deploy or update infrastructure using Terraform
deploy_infrastructure() {
    if [ "$SKIP_INFRA" = true ]; then
        echo "Skipping infrastructure deployment as requested."
        return 0
    fi
    
    echo "Deploying infrastructure for $ENVIRONMENT environment..."
    
    # Create directory for Terraform output if it doesn't exist
    mkdir -p "${REPO_ROOT}/tmp"
    
    # Change to the Terraform directory
    cd "$TERRAFORM_DIR" || { echo "Error: Failed to navigate to Terraform directory"; return 1; }
    
    # Initialize Terraform
    echo "Initializing Terraform..."
    if ! terraform init; then
        echo "Error: Failed to initialize Terraform"
        return 1
    fi
    
    # Validate Terraform configuration
    echo "Validating Terraform configuration..."
    if ! terraform validate; then
        echo "Error: Terraform validation failed"
        return 1
    fi
    
    # Plan Terraform changes
    echo "Planning Terraform changes..."
    if ! terraform plan -var="aws_region=${AWS_REGION}" -var="environment=${ENVIRONMENT}" -out=tfplan; then
        echo "Error: Terraform plan failed"
        return 1
    fi
    
    # Apply Terraform changes
    echo "Applying Terraform changes..."
    if ! terraform apply -auto-approve tfplan; then
        echo "Error: Terraform apply failed"
        return 1
    fi
    
    # Export Terraform outputs for use in application deployment
    echo "Exporting Terraform outputs..."
    terraform output -json > "${REPO_ROOT}/tmp/${ENVIRONMENT}-terraform-output.json"
    
    echo "Infrastructure deployment completed successfully."
    return 0
}

# Build and push Docker images
build_images() {
    if [ "$SKIP_BUILD" = true ]; then
        echo "Skipping image building as requested."
        return 0
    fi
    
    echo "Building Docker images for $ENVIRONMENT environment..."
    
    # Source the build-images.sh script to access its functions
    source "${SCRIPT_DIR}/deployment/build-images.sh"
    
    # Build backend image
    echo "Building backend image..."
    if ! build_backend_image "$ENVIRONMENT"; then
        echo "Error: Failed to build backend image"
        return 1
    fi
    
    # Build frontend image
    echo "Building frontend image..."
    if ! build_frontend_image "$ENVIRONMENT"; then
        echo "Error: Failed to build frontend image"
        return 1
    fi
    
    # Push images to registry
    echo "Pushing images to registry..."
    if ! push_images; then
        echo "Error: Failed to push images"
        return 1
    fi
    
    echo "Docker images built and pushed successfully."
    return 0
}

# Deploy the application to the target environment using environment-specific script
deploy_application() {
    echo "Deploying application to $ENVIRONMENT environment..."
    
    # Determine which environment-specific deployment script to use
    case "$ENVIRONMENT" in
        development)
            # For development, we'll perform a simple deployment directly
            echo "Performing simple deployment for development environment..."
            
            # Apply Kubernetes manifests using kustomize
            if ! kubectl apply -k "$KUSTOMIZE_DIR"; then
                echo "Error: Failed to apply Kubernetes manifests for development"
                return 1
            fi
            
            # Wait for deployments to be ready
            echo "Waiting for deployments to be ready..."
            if ! kubectl wait --for=condition=available --timeout=300s deployment -l app=admissions-platform -n "$NAMESPACE"; then
                echo "Error: Deployments did not become ready within timeout"
                return 1
            fi
            ;;
            
        staging)
            # For staging, use the dedicated staging deployment script
            echo "Executing staging deployment script..."
            
            # Execute the staging deployment script with appropriate parameters
            if ! "${SCRIPT_DIR}/deployment/deploy-staging.sh" \
                --registry "$REGISTRY" \
                --repository "$REPOSITORY" \
                --tag "$IMAGE_TAG" \
                --aws-region "$AWS_REGION"; then
                
                echo "Error: Staging deployment failed"
                return 1
            fi
            ;;
            
        production)
            # For production, use the dedicated production deployment script
            echo "Executing production deployment script..."
            
            # Execute the production deployment script with appropriate parameters
            if ! "${SCRIPT_DIR}/deployment/deploy-production.sh" \
                --registry "$REGISTRY" \
                --repository "$REPOSITORY" \
                --tag "$IMAGE_TAG" \
                --aws-region "$AWS_REGION" \
                $([ "$FORCE_DEPLOY" = true ] && echo "--yes"); then
                
                echo "Error: Production deployment failed"
                return 1
            fi
            ;;
            
        *)
            echo "Error: Unsupported environment for deployment: $ENVIRONMENT"
            return 1
            ;;
    esac
    
    echo "Application deployment completed successfully."
    return 0
}

# Run tests to verify the deployment
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        echo "Skipping post-deployment tests as requested."
        return 0
    fi
    
    echo "Running post-deployment tests for $ENVIRONMENT environment..."
    
    # Determine test strategy based on environment
    case "$ENVIRONMENT" in
        development)
            # Basic smoke tests for development
            echo "Running smoke tests for development environment..."
            
            # Get the service URL for testing
            SERVICE_NAME=$(kubectl get svc -l app=admissions-platform,component=frontend -n "$NAMESPACE" -o name | head -n 1)
            
            if [ -z "$SERVICE_NAME" ]; then
                echo "Error: Could not find frontend service for testing"
                return 1
            fi
            
            # Port-forward for testing
            echo "Setting up port-forward for smoke tests..."
            kubectl port-forward $SERVICE_NAME 8080:80 -n "$NAMESPACE" &
            PORT_FORWARD_PID=$!
            
            # Give it a moment to establish
            sleep 5
            
            # Simple HTTP check
            if ! curl -s http://localhost:8080/health | grep -q "healthy"; then
                echo "Error: Health check failed"
                kill $PORT_FORWARD_PID
                return 1
            fi
            
            # API health check
            if ! curl -s http://localhost:8080/api/v1/health | grep -q "status"; then
                echo "Error: API health check failed"
                kill $PORT_FORWARD_PID
                return 1
            fi
            
            # Kill the port-forward
            kill $PORT_FORWARD_PID
            
            echo "Smoke tests passed successfully."
            ;;
            
        staging|production)
            # More comprehensive tests were already run by the environment-specific scripts
            echo "Comprehensive tests already executed by environment-specific deployment script."
            ;;
            
        *)
            echo "Error: Unsupported environment for testing: $ENVIRONMENT"
            return 1
            ;;
    esac
    
    echo "Post-deployment tests completed successfully."
    return 0
}

# Send deployment status notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    echo "Sending deployment notification: $status - $message"
    
    # Format notification message
    NOTIFICATION_SUBJECT="Deployment $status: $REPOSITORY to $ENVIRONMENT"
    NOTIFICATION_MESSAGE="$message\n\nDeployment Details:\n"
    NOTIFICATION_MESSAGE+="- Environment: $ENVIRONMENT\n"
    NOTIFICATION_MESSAGE+="- Repository: $REPOSITORY\n"
    NOTIFICATION_MESSAGE+="- Image Tag: $IMAGE_TAG\n"
    NOTIFICATION_MESSAGE+="- Timestamp: $(date)\n"
    
    # Create logs directory if it doesn't exist
    mkdir -p "${REPO_ROOT}/logs"
    
    # Log notification to deployment history
    echo "[$(date)] [$ENVIRONMENT] $status: $message (Tag: $IMAGE_TAG)" >> "${REPO_ROOT}/logs/deployment-history.log"
    
    # Additional notification methods could be implemented here:
    # - Slack notifications
    # - Email notifications
    # - Integration with monitoring/alerting systems
    
    return 0
}

# Main function that orchestrates the deployment process
main() {
    # Parse command line arguments
    parse_arguments "$@"
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Check prerequisites
    check_prerequisites
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Set environment-specific variables
    set_environment_variables
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Confirm deployment with user
    confirm_deployment
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Send notification that deployment has started
    send_notifications "STARTED" "Deployment to $ENVIRONMENT has started"
    
    # Deploy infrastructure if not skipped
    deploy_infrastructure
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Infrastructure deployment failed"
        return 1
    fi
    
    # Build and push Docker images if not skipped
    build_images
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Image building failed"
        return 1
    fi
    
    # Deploy application
    deploy_application
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Application deployment failed"
        return 1
    fi
    
    # Run tests if not skipped
    run_tests
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Post-deployment tests failed"
        return 1
    fi
    
    # Send successful completion notification
    send_notifications "COMPLETED" "Deployment to $ENVIRONMENT completed successfully"
    
    echo "Deployment to $ENVIRONMENT environment completed successfully."
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?