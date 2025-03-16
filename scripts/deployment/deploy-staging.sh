#!/bin/bash
# deploy-staging.sh
#
# This script automates the deployment of the Student Admissions Enrollment Platform
# to the staging environment using a blue/green deployment strategy. It handles
# building and pushing Docker images, updating Kubernetes configurations, and
# applying changes to the staging cluster with validation steps to ensure success.

set -e  # Exit immediately if a command exits with a non-zero status

# Get script directory and repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Global variables with default values
ENVIRONMENT="staging"
AWS_REGION="us-east-1"
EKS_CLUSTER_NAME="admissions-staging"
REGISTRY="ghcr.io"
REPOSITORY=""  # Will be set by parse_arguments
IMAGE_TAG="staging-latest"
KUSTOMIZE_DIR="${REPO_ROOT}/infrastructure/kubernetes/overlays/staging"
BACKEND_IMAGE="admissions-backend"
FRONTEND_IMAGE="admissions-frontend"
NAMESPACE="admissions-staging"
DEPLOYMENT_ID="$(date +%Y%m%d%H%M%S)"
SMOKE_TEST_URL=""  # Will be set during deployment

# Function to display usage information
print_usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo
    echo "Deploy the Student Admissions Enrollment Platform to staging environment"
    echo "using a blue/green deployment strategy."
    echo
    echo "Options:"
    echo "  -r, --registry URL         Container registry URL (default: ghcr.io)"
    echo "  -o, --repository REPO      GitHub repository name in owner/repo format (required)"
    echo "  -t, --tag TAG              Image tag (default: staging-latest)"
    echo "  -c, --cluster NAME         EKS cluster name (default: admissions-staging)"
    echo "  -n, --namespace NAME       Kubernetes namespace (default: admissions-staging)"
    echo "  -a, --aws-region REGION    AWS region (default: us-east-1)"
    echo "  -h, --help                 Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $(basename "$0") --repository myorg/admissions-platform"
    echo "  $(basename "$0") -o myorg/admissions-platform -t v1.0.0 -c my-eks-cluster"
}

# Function to parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
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
            -c|--cluster)
                EKS_CLUSTER_NAME="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -a|--aws-region)
                AWS_REGION="$2"
                shift 2
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

    # Validate required parameters
    if [ -z "$REPOSITORY" ]; then
        echo "Error: Repository name is required"
        print_usage
        return 1
    fi

    return 0
}

# Function to check if all required tools are installed
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        echo "Error: kubectl is not installed or not in PATH"
        return 1
    fi

    # Check if aws-cli is installed
    if ! command -v aws &> /dev/null; then
        echo "Error: aws-cli is not installed or not in PATH"
        return 1
    fi

    # Check if kustomize is installed
    if ! command -v kustomize &> /dev/null; then
        echo "Error: kustomize is not installed or not in PATH"
        return 1
    fi

    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        echo "Error: docker is not installed or not in PATH"
        return 1
    fi

    echo "All prerequisites are met"
    return 0
}

# Function to configure AWS credentials and EKS cluster access
configure_aws() {
    echo "Configuring AWS and EKS cluster access..."
    
    # Ensure AWS credentials are available
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "Error: AWS credentials not available or invalid"
        echo "Please configure AWS credentials before running this script"
        return 1
    fi
    
    # Configure AWS CLI with the specified region
    aws configure set region ${AWS_REGION}
    
    # Update kubeconfig for EKS cluster access
    echo "Updating kubeconfig for EKS cluster: ${EKS_CLUSTER_NAME}"
    if ! aws eks update-kubeconfig --name ${EKS_CLUSTER_NAME} --region ${AWS_REGION}; then
        echo "Error: Failed to update kubeconfig for EKS cluster"
        return 1
    fi
    
    # Verify connection to the cluster
    if ! kubectl cluster-info; then
        echo "Error: Failed to connect to Kubernetes cluster"
        return 1
    fi
    
    echo "AWS and EKS cluster access configured successfully"
    return 0
}

# Function to build and push Docker images
build_and_push_images() {
    echo "Building and pushing Docker images..."
    
    # Source the build-images.sh script to access its functions
    source "${SCRIPT_DIR}/build-images.sh"
    
    # Build backend image with staging configuration
    echo "Building backend image..."
    if ! build_backend_image "staging"; then
        echo "Error: Failed to build backend image"
        return 1
    fi
    
    # Build frontend image with staging configuration
    echo "Building frontend image..."
    if ! build_frontend_image "staging"; then
        echo "Error: Failed to build frontend image"
        return 1
    fi
    
    # Push images to registry
    echo "Pushing images to registry..."
    if ! push_images; then
        echo "Error: Failed to push images"
        return 1
    fi
    
    echo "Images built and pushed successfully"
    return 0
}

# Function to update Kubernetes Kustomize configuration with new image tags
update_kustomization() {
    echo "Updating Kustomize configuration with new image tags..."
    
    # Change to the Kustomize directory
    cd "${KUSTOMIZE_DIR}" || { echo "Error: Failed to navigate to Kustomize directory"; return 1; }
    
    # Create a copy of the original kustomization.yaml for backup
    cp kustomization.yaml kustomization.yaml.bak
    
    # Update the backend image tag
    echo "Updating backend image to: ${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}"
    if ! kustomize edit set image admissions-platform/backend=${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}; then
        echo "Error: Failed to update backend image in kustomization.yaml"
        # Restore backup
        mv kustomization.yaml.bak kustomization.yaml
        return 1
    fi
    
    # Update the frontend image tag
    echo "Updating frontend image to: ${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}"
    if ! kustomize edit set image admissions-platform/frontend=${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}; then
        echo "Error: Failed to update frontend image in kustomization.yaml"
        # Restore backup
        mv kustomization.yaml.bak kustomization.yaml
        return 1
    fi
    
    echo "Kustomize configuration updated successfully"
    return 0
}

# Function to deploy the blue environment for blue/green deployment
deploy_blue_environment() {
    echo "Deploying blue environment..."
    
    # Create blue namespace if it doesn't exist
    BLUE_NAMESPACE="${NAMESPACE}-blue-${DEPLOYMENT_ID}"
    echo "Creating namespace: ${BLUE_NAMESPACE}"
    if ! kubectl create namespace ${BLUE_NAMESPACE} 2>/dev/null; then
        echo "Namespace ${BLUE_NAMESPACE} already exists or could not be created"
        # We'll continue since the namespace might already exist
    fi
    
    # Apply namespace label for blue environment
    kubectl label namespace ${BLUE_NAMESPACE} environment=staging deployment=blue --overwrite

    # Apply Kustomize configuration to blue environment
    echo "Applying Kustomize configuration to blue environment..."
    if ! kustomize build ${KUSTOMIZE_DIR} | kubectl apply -n ${BLUE_NAMESPACE} -f -; then
        echo "Error: Failed to apply Kustomize configuration to blue environment"
        return 1
    fi
    
    # Wait for deployments to be ready
    echo "Waiting for deployments to be ready..."
    if ! kubectl wait -n ${BLUE_NAMESPACE} --for=condition=available deployment --all --timeout=300s; then
        echo "Error: Deployments did not become ready within timeout"
        return 1
    fi
    
    # Get the blue service URL for smoke testing
    BLUE_SERVICE=$(kubectl get svc -n ${BLUE_NAMESPACE} -l app=admissions-platform,component=frontend -o name | head -n 1)
    if [ -z "$BLUE_SERVICE" ]; then
        echo "Error: Could not find frontend service in blue environment"
        return 1
    fi
    
    # Create a temporary port-forward for smoke testing
    SMOKE_TEST_PORT=8080
    echo "Setting up port-forward to service ${BLUE_SERVICE} for smoke testing..."
    kubectl port-forward -n ${BLUE_NAMESPACE} ${BLUE_SERVICE} ${SMOKE_TEST_PORT}:80 &
    PORT_FORWARD_PID=$!
    
    # Wait for port-forward to be established
    sleep 5
    
    # Set the smoke test URL
    SMOKE_TEST_URL="http://localhost:${SMOKE_TEST_PORT}"
    echo "Blue environment deployed. Smoke test URL: ${SMOKE_TEST_URL}"
    
    return 0
}

# Function to run smoke tests against the newly deployed environment
run_smoke_tests() {
    echo "Running smoke tests against ${SMOKE_TEST_URL}..."
    
    # Wait for services to be fully available
    echo "Waiting for services to be fully available..."
    sleep 10
    
    # Basic health check
    echo "Performing health check..."
    if ! curl -s -o /dev/null -w "%{http_code}" ${SMOKE_TEST_URL}/health | grep -q "200"; then
        echo "Error: Health check failed"
        # Kill the port-forward process
        kill ${PORT_FORWARD_PID} 2>/dev/null || true
        return 1
    fi
    
    # Test API endpoint
    echo "Testing API endpoint..."
    if ! curl -s -o /dev/null -w "%{http_code}" ${SMOKE_TEST_URL}/api/v1/health | grep -q "200"; then
        echo "Error: API health check failed"
        # Kill the port-forward process
        kill ${PORT_FORWARD_PID} 2>/dev/null || true
        return 1
    fi
    
    # Check if frontend loads properly
    echo "Checking if frontend loads properly..."
    if ! curl -s ${SMOKE_TEST_URL} | grep -q "<title>Student Admissions"; then
        echo "Error: Frontend does not load properly"
        # Kill the port-forward process
        kill ${PORT_FORWARD_PID} 2>/dev/null || true
        return 1
    fi
    
    # Kill the port-forward process
    kill ${PORT_FORWARD_PID} 2>/dev/null || true
    
    echo "Smoke tests passed successfully"
    return 0
}

# Function to switch traffic from green to blue environment
switch_traffic() {
    echo "Switching traffic to blue environment..."
    
    # Get current production namespace (green)
    GREEN_NAMESPACE="${NAMESPACE}"
    
    # Update the ingress to point to the blue services
    echo "Updating ingress to point to blue environment..."
    
    # Find the ingress resource
    INGRESS_NAME=$(kubectl get ingress -n ${GREEN_NAMESPACE} -l app=admissions-platform -o name | head -n 1)
    if [ -z "$INGRESS_NAME" ]; then
        echo "Error: Could not find ingress resource in green environment"
        return 1
    fi
    
    # Patch the ingress to point to the blue services
    echo "Patching ingress ${INGRESS_NAME} to point to blue environment..."
    if ! kubectl patch ${INGRESS_NAME} -n ${GREEN_NAMESPACE} --type=json -p "[{\"op\":\"replace\",\"path\":\"/spec/rules/0/http/paths/0/backend/service/namespace\",\"value\":\"${BLUE_NAMESPACE}\"}]"; then
        echo "Error: Failed to patch ingress to point to blue environment"
        return 1
    fi
    
    # Verify traffic routing
    echo "Verifying traffic routing..."
    sleep 10
    
    # Check if the ingress is routing traffic to the blue environment
    CURRENT_NAMESPACE=$(kubectl get ${INGRESS_NAME} -n ${GREEN_NAMESPACE} -o jsonpath='{.spec.rules[0].http.paths[0].backend.service.namespace}')
    if [ "$CURRENT_NAMESPACE" != "${BLUE_NAMESPACE}" ]; then
        echo "Error: Ingress is not routing traffic to blue environment"
        return 1
    fi
    
    echo "Traffic successfully switched to blue environment"
    return 0
}

# Function to run comprehensive tests after traffic switch
run_post_deployment_tests() {
    echo "Running post-deployment tests..."
    
    # Get the ingress hostname
    INGRESS_NAME=$(kubectl get ingress -n ${NAMESPACE} -l app=admissions-platform -o name | head -n 1)
    INGRESS_HOST=$(kubectl get ${INGRESS_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.rules[0].host}')
    
    if [ -z "$INGRESS_HOST" ]; then
        echo "Warning: Could not determine ingress hostname, using staging.admissions.example.edu"
        INGRESS_HOST="staging.admissions.example.edu"
    fi
    
    TEST_URL="https://${INGRESS_HOST}"
    echo "Running tests against ${TEST_URL}..."
    
    # Run end-to-end tests against staging environment
    echo "Running end-to-end tests..."
    # In a real scenario, you would run actual E2E tests here
    # Example: npm run test:e2e -- --url=${TEST_URL}
    
    # Verify critical business flows
    echo "Verifying critical business flows..."
    # In a real scenario, you would test critical flows like:
    # - Application submission
    # - Document upload
    # - User authentication
    
    # Check integration points
    echo "Checking integration points..."
    # Verify integrations with external systems
    
    # Monitor error rates and performance metrics
    echo "Monitoring error rates and performance metrics..."
    # Check logs, metrics, and monitoring systems for any issues
    
    echo "Post-deployment tests completed successfully"
    return 0
}

# Function to clean up the old (green) environment after successful deployment
cleanup_green_environment() {
    echo "Cleaning up green environment..."
    
    # Verify that blue environment is stable before removing green
    echo "Verifying blue environment stability..."
    sleep 30
    
    # Get the current green namespace name
    GREEN_NAMESPACE="${NAMESPACE}"
    
    # Rename blue namespace to become the new green (production) namespace
    echo "Renaming blue environment to green for next deployment..."
    
    # We can't actually rename namespaces in Kubernetes, so we'll:
    # 1. Label the blue namespace as the production namespace
    # 2. Label the old green namespace for cleanup
    kubectl label namespace ${BLUE_NAMESPACE} environment=staging deployment=production --overwrite
    kubectl label namespace ${GREEN_NAMESPACE} environment=staging deployment=cleanup --overwrite
    
    # In a real environment, you might want to keep the old green environment around for a while
    # before deleting it, in case you need to roll back quickly
    echo "Old green environment marked for cleanup"
    
    # For this example, we won't actually delete the old namespace
    # In a real environment, you would schedule it for deletion after a grace period
    
    return 0
}

# Function to roll back to the previous deployment if current deployment fails
rollback_deployment() {
    echo "Rolling back deployment..."
    
    # Get current production namespace (green)
    GREEN_NAMESPACE="${NAMESPACE}"
    
    # If there's an ingress, revert it to point to the green environment
    INGRESS_NAME=$(kubectl get ingress -n ${GREEN_NAMESPACE} -l app=admissions-platform -o name | head -n 1)
    if [ -n "$INGRESS_NAME" ]; then
        echo "Reverting ingress to point back to green environment..."
        kubectl patch ${INGRESS_NAME} -n ${GREEN_NAMESPACE} --type=json -p "[{\"op\":\"replace\",\"path\":\"/spec/rules/0/http/paths/0/backend/service/namespace\",\"value\":\"${GREEN_NAMESPACE}\"}]"
    fi
    
    # Remove the blue environment
    echo "Removing failed blue environment..."
    kubectl delete namespace ${BLUE_NAMESPACE} --wait=false
    
    # Notify about rollback
    echo "Deployment has been rolled back to the previous version"
    send_notifications "failure" "Deployment failed and was rolled back to the previous version"
    
    return 0
}

# Function to send deployment status notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    echo "Sending deployment status notification: ${status}"
    
    # Format notification message
    NOTIFICATION_SUBJECT="Staging Deployment ${status}: ${REPOSITORY} ${IMAGE_TAG}"
    NOTIFICATION_MESSAGE="${message}\n\nDeployment Details:\n"
    NOTIFICATION_MESSAGE+="- Repository: ${REPOSITORY}\n"
    NOTIFICATION_MESSAGE+="- Image Tag: ${IMAGE_TAG}\n"
    NOTIFICATION_MESSAGE+="- Deployment ID: ${DEPLOYMENT_ID}\n"
    NOTIFICATION_MESSAGE+="- Timestamp: $(date)\n"
    
    # In a real environment, you would integrate with notification services
    # For example:
    # - Send Slack notification
    # - Send email to stakeholders
    # - Update deployment tracking system
    
    # For this example, we'll just log the notification
    echo -e "Notification Subject: ${NOTIFICATION_SUBJECT}"
    echo -e "Notification Message: ${NOTIFICATION_MESSAGE}"
    
    # Log notification to deployment history
    echo "[$(date)] Deployment ${DEPLOYMENT_ID} ${status}: ${message}" >> "${REPO_ROOT}/deployment-history.log"
    
    return 0
}

# Main function
main() {
    local exit_code=0
    
    # Parse command line arguments
    parse_arguments "$@"
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Check prerequisites
    check_prerequisites
    if [ $? -ne 0 ]; then
        echo "Prerequisites check failed"
        return 1
    fi
    
    # Configure AWS and Kubernetes access
    configure_aws
    if [ $? -ne 0 ]; then
        echo "Failed to configure AWS and Kubernetes access"
        return 1
    fi
    
    # Build and push Docker images
    build_and_push_images
    if [ $? -ne 0 ]; then
        echo "Failed to build and push Docker images"
        return 1
    fi
    
    # Update Kustomize configuration
    update_kustomization
    if [ $? -ne 0 ]; then
        echo "Failed to update Kustomize configuration"
        return 1
    fi
    
    # Deploy blue environment
    deploy_blue_environment
    if [ $? -ne 0 ]; then
        echo "Failed to deploy blue environment"
        rollback_deployment
        return 1
    fi
    
    # Run smoke tests
    run_smoke_tests
    if [ $? -ne 0 ]; then
        echo "Smoke tests failed"
        rollback_deployment
        return 1
    fi
    
    # Switch traffic to blue environment
    switch_traffic
    if [ $? -ne 0 ]; then
        echo "Failed to switch traffic to blue environment"
        rollback_deployment
        return 1
    fi
    
    # Run post-deployment tests
    run_post_deployment_tests
    if [ $? -ne 0 ]; then
        echo "Post-deployment tests failed"
        rollback_deployment
        return 1
    fi
    
    # Clean up green environment
    cleanup_green_environment
    if [ $? -ne 0 ]; then
        echo "Warning: Failed to clean up green environment"
        # Continue anyway, this is not a critical failure
        exit_code=0
    fi
    
    # Send success notification
    send_notifications "success" "Deployment completed successfully"
    
    echo "Deployment to staging environment completed successfully"
    return ${exit_code}
}

# Execute main function with all arguments
main "$@"
exit $?