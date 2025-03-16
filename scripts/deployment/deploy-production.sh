#!/bin/bash
#
# deploy-production.sh
#
# Deploys the Student Admissions Enrollment Platform to the production environment
# using a blue/green deployment strategy with gradual traffic shifting.
#
# This script:
# - Builds and pushes Docker images to the container registry
# - Updates Kubernetes configurations with new image tags
# - Deploys a blue environment alongside the existing green environment
# - Performs smoke tests to verify the blue environment
# - Gradually shifts traffic from green to blue (20%, 50%, 100%)
# - Runs comprehensive post-deployment tests
# - Cleans up the old environment after successful deployment
#
# The script includes comprehensive validation steps and automatic rollback
# procedures if any issues are detected during the deployment process.

# Exit immediately if a command exits with a non-zero status
set -e

# Get script directory and repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
ENVIRONMENT="production"
AWS_REGION="us-east-1"
EKS_CLUSTER_NAME="admissions-production"
REGISTRY="ghcr.io"
REPOSITORY=""
IMAGE_TAG="production-latest"
KUSTOMIZE_DIR="${REPO_ROOT}/infrastructure/kubernetes/overlays/production"
BACKEND_IMAGE=""
FRONTEND_IMAGE=""
NAMESPACE="admissions-production"
DEPLOYMENT_ID="$(date +%Y%m%d%H%M%S)"
SMOKE_TEST_URL=""
APPROVAL_REQUIRED=true

# Display usage information
print_usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo
    echo "Deploy the Student Admissions Enrollment Platform to production using a"
    echo "blue/green deployment strategy with gradual traffic shifting."
    echo
    echo "Options:"
    echo "  -r, --registry URL          Container registry URL (default: ghcr.io)"
    echo "  -o, --repository REPO       GitHub repository name in owner/repo format (required)"
    echo "  -t, --tag TAG               Image tag (default: production-latest)"
    echo "  -c, --cluster NAME          EKS cluster name (default: admissions-production)"
    echo "  -n, --namespace NS          Kubernetes namespace (default: admissions-production)"
    echo "  -u, --url URL               URL for smoke tests (required)"
    echo "  -a, --aws-region REGION     AWS region (default: us-east-1)"
    echo "  -y, --yes                   Skip approval prompts"
    echo "  -h, --help                  Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $(basename "$0") --repository myorg/admissions-platform --url https://admissions.example.edu"
    echo "  $(basename "$0") -o myorg/admissions-platform -u https://admissions.example.edu -y"
}

# Parse command line arguments
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
            -u|--url)
                SMOKE_TEST_URL="$2"
                shift 2
                ;;
            -a|--aws-region)
                AWS_REGION="$2"
                shift 2
                ;;
            -y|--yes)
                APPROVAL_REQUIRED=false
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

    # Set backend and frontend image variables
    BACKEND_IMAGE="${REGISTRY}/${REPOSITORY}/admissions-backend:${IMAGE_TAG}"
    FRONTEND_IMAGE="${REGISTRY}/${REPOSITORY}/admissions-frontend:${IMAGE_TAG}"

    # Validate required parameters
    if [ -z "$REPOSITORY" ]; then
        echo "Error: Repository name is required"
        print_usage
        return 1
    fi

    if [ -z "$SMOKE_TEST_URL" ]; then
        echo "Error: Smoke test URL is required"
        print_usage
        return 1
    fi

    return 0
}

# Check if all required tools are installed
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
    
    # Check if docker is installed (required for building images)
    if ! command -v docker &> /dev/null; then
        echo "Error: docker is not installed or not in PATH"
        return 1
    fi
    
    echo "All prerequisites are installed."
    return 0
}

# Configure AWS credentials and EKS cluster access
configure_aws() {
    echo "Configuring AWS and EKS access..."
    
    # Check if AWS credentials are available
    if ! aws sts get-caller-identity &> /dev/null; then
        echo "Error: AWS credentials not configured or insufficient permissions"
        echo "Please run 'aws configure' or ensure your IAM role has appropriate permissions"
        return 1
    fi
    
    # Configure AWS CLI with region
    aws configure set region "${AWS_REGION}"
    
    # Update kubeconfig for EKS cluster access
    if ! aws eks update-kubeconfig --name "${EKS_CLUSTER_NAME}" --region "${AWS_REGION}"; then
        echo "Error: Failed to update kubeconfig for EKS cluster '${EKS_CLUSTER_NAME}'"
        return 1
    fi
    
    # Verify connection to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        echo "Error: Could not connect to EKS cluster"
        return 1
    fi
    
    echo "AWS and EKS access configured successfully."
    return 0
}

# Build and push Docker images for deployment
build_and_push_images() {
    echo "Building and pushing Docker images..."
    
    # Source the build-images.sh script
    source "${SCRIPT_DIR}/build-images.sh"
    
    # Build backend image with production configuration
    if ! build_backend_image "production"; then
        echo "Error: Failed to build backend image"
        return 1
    fi
    
    # Build frontend image with production configuration
    if ! build_frontend_image "production"; then
        echo "Error: Failed to build frontend image"
        return 1
    fi
    
    # Push images to container registry
    if ! push_images; then
        echo "Error: Failed to push images to registry"
        return 1
    fi
    
    echo "Docker images built and pushed successfully."
    return 0
}

# Update Kubernetes Kustomize configuration with new image tags
update_kustomization() {
    echo "Updating Kustomize configuration with new image tags..."
    
    # Navigate to Kustomize directory
    cd "${KUSTOMIZE_DIR}" || {
        echo "Error: Failed to navigate to Kustomize directory '${KUSTOMIZE_DIR}'"
        return 1
    }
    
    # Use kustomize to update image tags
    if ! kustomize edit set image admissions-platform/backend="${BACKEND_IMAGE}"; then
        echo "Error: Failed to update backend image tag in kustomization.yaml"
        return 1
    fi
    
    if ! kustomize edit set image admissions-platform/frontend="${FRONTEND_IMAGE}"; then
        echo "Error: Failed to update frontend image tag in kustomization.yaml"
        return 1
    fi
    
    echo "Kustomize configuration updated successfully."
    return 0
}

# Deploy the blue environment for blue/green deployment
deploy_blue_environment() {
    echo "Deploying blue environment..."
    
    # Create blue namespace if it doesn't exist
    if ! kubectl get namespace "${NAMESPACE}-blue" &> /dev/null; then
        if ! kubectl create namespace "${NAMESPACE}-blue"; then
            echo "Error: Failed to create blue namespace"
            return 1
        fi
    fi
    
    # Label the namespace for easier identification
    kubectl label namespace "${NAMESPACE}-blue" deployment-id="${DEPLOYMENT_ID}" --overwrite
    
    # Apply Kustomize configuration to blue environment
    if ! kubectl apply -k "${KUSTOMIZE_DIR}" -n "${NAMESPACE}-blue"; then
        echo "Error: Failed to apply Kustomize configuration to blue environment"
        return 1
    fi
    
    # Wait for deployments to be ready
    echo "Waiting for deployments to be ready..."
    
    # Wait for backend deployment
    if ! kubectl rollout status deployment/backend -n "${NAMESPACE}-blue" --timeout=10m; then
        echo "Error: Backend deployment not ready within timeout"
        return 1
    fi
    
    # Wait for frontend deployment
    if ! kubectl rollout status deployment/frontend -n "${NAMESPACE}-blue" --timeout=5m; then
        echo "Error: Frontend deployment not ready within timeout"
        return 1
    fi
    
    echo "Blue environment deployed successfully."
    return 0
}

# Run smoke tests against the newly deployed environment
run_smoke_tests() {
    echo "Running smoke tests against blue environment..."
    
    # Wait for services to be fully available
    echo "Waiting for services to be available..."
    sleep 30
    
    # Set up port-forwarding to access the service for testing
    # This runs in the background with a process ID we can kill later
    kubectl port-forward svc/frontend -n "${NAMESPACE}-blue" 8080:80 &
    PORT_FORWARD_PID=$!
    
    # Give the port-forward a moment to establish
    sleep 5
    
    # Run basic health check
    if ! curl -s http://localhost:8080/health | grep -q "healthy"; then
        echo "Error: Health check failed"
        kill $PORT_FORWARD_PID
        return 1
    fi
    
    # Run API health check
    if ! curl -s http://localhost:8080/api/v1/health | grep -q "status.*ok"; then
        echo "Error: API health check failed"
        kill $PORT_FORWARD_PID
        return 1
    fi
    
    # Test application login page loads
    if ! curl -s -L http://localhost:8080/login | grep -q "<title>"; then
        echo "Error: Login page not accessible"
        kill $PORT_FORWARD_PID
        return 1
    fi
    
    # Clean up port-forward
    kill $PORT_FORWARD_PID
    
    echo "Smoke tests completed successfully."
    return 0
}

# Request manual approval before proceeding with traffic shifting
request_approval() {
    if [ "$APPROVAL_REQUIRED" = true ]; then
        echo
        echo "============================================================"
        echo "DEPLOYMENT APPROVAL REQUIRED"
        echo "============================================================"
        echo "New deployment is ready in the blue environment."
        echo
        echo "Deployment details:"
        echo "  - Deployment ID: ${DEPLOYMENT_ID}"
        echo "  - Backend Image: ${BACKEND_IMAGE}"
        echo "  - Frontend Image: ${FRONTEND_IMAGE}"
        echo "  - Namespace: ${NAMESPACE}-blue"
        echo
        echo "The deployment has passed initial smoke tests."
        echo "Do you want to proceed with gradually shifting traffic to the new deployment?"
        echo "This will start directing production traffic to the new version."
        echo
        read -p "Type 'yes' to continue or anything else to abort: " APPROVAL
        
        if [ "$APPROVAL" != "yes" ]; then
            echo "Deployment aborted by user."
            return 1
        fi
        
        echo "Approval granted. Proceeding with traffic shifting."
    else
        echo "Automatic approval for traffic shifting (--yes flag was used)."
    fi
    
    return 0
}

# Gradually shift traffic from green to blue environment
shift_traffic_gradually() {
    echo "Gradually shifting traffic to blue environment..."
    
    # Apply 20% traffic shift to blue environment
    echo "Shifting 20% of traffic to blue environment..."
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: admissions-platform
  namespace: ${NAMESPACE}
spec:
  hosts:
  - "admissions.example.edu"
  gateways:
  - admissions-gateway
  http:
  - route:
    - destination:
        host: frontend.${NAMESPACE}-blue.svc.cluster.local
        port:
          number: 80
      weight: 20
    - destination:
        host: frontend.${NAMESPACE}.svc.cluster.local
        port:
          number: 80
      weight: 80
EOF
    
    # Wait and monitor metrics (5 minutes)
    echo "Monitoring 20% traffic shift for 5 minutes..."
    for i in {1..5}; do
        echo "Minute $i of 5..."
        
        # Check error rates in blue environment
        ERROR_RATE=$(kubectl logs -n "${NAMESPACE}-blue" -l app=frontend --tail=100 | grep ERROR | wc -l)
        if [ "$ERROR_RATE" -gt 5 ]; then
            echo "Error: High error rate detected in blue environment"
            return 1
        fi
        
        # Simulate monitoring with sleep
        sleep 60
    done
    
    # Apply 50% traffic shift to blue environment
    echo "Shifting 50% of traffic to blue environment..."
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: admissions-platform
  namespace: ${NAMESPACE}
spec:
  hosts:
  - "admissions.example.edu"
  gateways:
  - admissions-gateway
  http:
  - route:
    - destination:
        host: frontend.${NAMESPACE}-blue.svc.cluster.local
        port:
          number: 80
      weight: 50
    - destination:
        host: frontend.${NAMESPACE}.svc.cluster.local
        port:
          number: 80
      weight: 50
EOF
    
    # Wait and monitor metrics (5 minutes)
    echo "Monitoring 50% traffic shift for 5 minutes..."
    for i in {1..5}; do
        echo "Minute $i of 5..."
        
        # Check error rates in blue environment
        ERROR_RATE=$(kubectl logs -n "${NAMESPACE}-blue" -l app=frontend --tail=100 | grep ERROR | wc -l)
        if [ "$ERROR_RATE" -gt 5 ]; then
            echo "Error: High error rate detected in blue environment"
            return 1
        fi
        
        # Simulate monitoring with sleep
        sleep 60
    done
    
    # Apply 100% traffic shift to blue environment
    echo "Shifting 100% of traffic to blue environment..."
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: admissions-platform
  namespace: ${NAMESPACE}
spec:
  hosts:
  - "admissions.example.edu"
  gateways:
  - admissions-gateway
  http:
  - route:
    - destination:
        host: frontend.${NAMESPACE}-blue.svc.cluster.local
        port:
          number: 80
      weight: 100
EOF
    
    # Verify traffic routing
    echo "Verifying traffic routing..."
    sleep 30
    
    # Check that requests are being routed to blue environment
    BLUE_REQUESTS=$(kubectl logs -n "${NAMESPACE}-blue" -l app=frontend --tail=100 | grep GET | wc -l)
    if [ "$BLUE_REQUESTS" -lt 1 ]; then
        echo "Error: Traffic not properly routed to blue environment"
        return 1
    fi
    
    echo "Traffic successfully shifted to blue environment."
    return 0
}

# Run comprehensive tests after traffic switch
run_post_deployment_tests() {
    echo "Running post-deployment tests..."
    
    # Run end-to-end tests against production environment
    echo "Running end-to-end tests..."
    
    # Create temporary test files directory if it doesn't exist
    mkdir -p "${REPO_ROOT}/tmp/tests"
    
    # Test key application flows using curl
    
    # Test 1: Home page accessibility
    if ! curl -s -o "${REPO_ROOT}/tmp/tests/home.html" -L "${SMOKE_TEST_URL}"; then
        echo "Error: Failed to access home page"
        return 1
    fi
    
    # Test 2: Login page accessibility
    if ! curl -s -o "${REPO_ROOT}/tmp/tests/login.html" -L "${SMOKE_TEST_URL}/login"; then
        echo "Error: Failed to access login page"
        return 1
    fi
    
    # Test 3: API health endpoint
    if ! curl -s -o "${REPO_ROOT}/tmp/tests/api-health.json" -L "${SMOKE_TEST_URL}/api/v1/health"; then
        echo "Error: Failed to access API health endpoint"
        return 1
    fi
    
    # Verify API health response
    if ! grep -q "status.*ok" "${REPO_ROOT}/tmp/tests/api-health.json"; then
        echo "Error: API health check failed"
        return 1
    fi
    
    # Check integration points with mock data
    echo "Checking integration points..."
    # Test SIS integration endpoint
    if ! curl -s -o "${REPO_ROOT}/tmp/tests/sis-status.json" -L "${SMOKE_TEST_URL}/api/v1/integrations/sis/status"; then
        echo "Error: Failed to check SIS integration status"
        return 1
    fi
    
    # Monitor error rates and performance metrics
    echo "Monitoring error rates and performance..."
    # Check logs for errors
    ERROR_COUNT=$(kubectl logs -n "${NAMESPACE}-blue" -l app=backend --tail=500 | grep -i error | wc -l)
    if [ "$ERROR_COUNT" -gt 10 ]; then
        echo "Warning: High error count detected in logs: $ERROR_COUNT"
        # Don't fail deployment yet, just warn
    fi
    
    echo "Post-deployment tests completed successfully."
    return 0
}

# Clean up the old (green) environment after successful deployment
cleanup_green_environment() {
    echo "Cleaning up green environment..."
    
    # Verify blue environment is stable
    echo "Verifying blue environment stability..."
    # Check pod status in blue environment
    if ! kubectl get pods -n "${NAMESPACE}-blue" | grep -q "Running"; then
        echo "Error: Blue environment is not stable"
        return 1
    fi
    
    # Take snapshot of green environment for potential rollback
    echo "Taking snapshot of green environment configuration..."
    mkdir -p "${REPO_ROOT}/tmp"
    kubectl get all -n "${NAMESPACE}" -o yaml > "${REPO_ROOT}/tmp/green-environment-backup-${DEPLOYMENT_ID}.yaml"
    
    # Rename blue environment to green (swap the active environment)
    echo "Swapping blue environment to green..."
    
    # Copy all resources from blue to green namespace
    kubectl get all -n "${NAMESPACE}-blue" -o yaml | sed "s/${NAMESPACE}-blue/${NAMESPACE}/g" | kubectl apply -f -
    
    # Update config maps and secrets
    kubectl get configmaps -n "${NAMESPACE}-blue" -o yaml | sed "s/${NAMESPACE}-blue/${NAMESPACE}/g" | kubectl apply -f -
    kubectl get secrets -n "${NAMESPACE}-blue" -o yaml | sed "s/${NAMESPACE}-blue/${NAMESPACE}/g" | kubectl apply -f -
    
    # Remove blue namespace
    echo "Removing blue namespace..."
    kubectl delete namespace "${NAMESPACE}-blue"
    
    echo "Green environment cleanup completed."
    return 0
}

# Roll back to the previous deployment if current deployment fails
rollback_deployment() {
    echo "Rolling back deployment due to failure..."
    
    # Switch traffic back to the green environment
    echo "Switching traffic back to green environment..."
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: admissions-platform
  namespace: ${NAMESPACE}
spec:
  hosts:
  - "admissions.example.edu"
  gateways:
  - admissions-gateway
  http:
  - route:
    - destination:
        host: frontend.${NAMESPACE}.svc.cluster.local
        port:
          number: 80
      weight: 100
EOF
    
    # Remove failed blue environment
    echo "Removing failed blue environment..."
    kubectl delete namespace "${NAMESPACE}-blue" --grace-period=10
    
    # Notify about rollback
    echo "Sending rollback notification..."
    send_notifications "ROLLBACK" "Deployment has been rolled back due to failure"
    
    echo "Rollback completed."
    return 0
}

# Send deployment status notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    echo "Sending deployment notification: ${status} - ${message}"
    
    # Format notification message with deployment details
    local notification_message="
Deployment Status: ${status}
Deployment ID: ${DEPLOYMENT_ID}
Backend Image: ${BACKEND_IMAGE}
Frontend Image: ${FRONTEND_IMAGE}
Environment: ${ENVIRONMENT}
Timestamp: $(date)

Message: ${message}
"
    
    # Send notification to Slack (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${notification_message}\"}" \
            "${SLACK_WEBHOOK_URL}"
    fi
    
    # Send email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${notification_message}" | mail -s "Deployment ${status}: ${DEPLOYMENT_ID}" "${NOTIFICATION_EMAIL}"
    fi
    
    # Log notification to deployment history
    mkdir -p "${REPO_ROOT}/logs"
    echo "${notification_message}" >> "${REPO_ROOT}/logs/deployment-history.log"
    
    return 0
}

# Monitor the deployment for a specified period after completion
monitor_deployment() {
    local duration_minutes="$1"
    
    echo "Monitoring deployment for ${duration_minutes} minutes..."
    
    for ((i=1; i<=duration_minutes; i++)); do
        echo "Monitoring minute ${i}/${duration_minutes}..."
        
        # Monitor application health metrics
        # Check if the deployment is still healthy
        if ! kubectl get pods -n "${NAMESPACE}" | grep -q "Running"; then
            echo "Error: Deployment health check failed during monitoring"
            return 1
        fi
        
        # Check for backend errors
        ERROR_COUNT=$(kubectl logs -n "${NAMESPACE}" -l app=backend --tail=100 | grep -i error | wc -l)
        if [ "$ERROR_COUNT" -gt 5 ]; then
            echo "Warning: Errors detected in backend logs during monitoring"
            # Log the warning but continue monitoring
        fi
        
        # Sleep for one minute before next check
        sleep 60
    done
    
    echo "Deployment monitoring completed successfully."
    return 0
}

# Main function that orchestrates the deployment process
main() {
    # Parse command line arguments
    parse_arguments "$@"
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Check prerequisites
    check_prerequisites
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Configure AWS and Kubernetes access
    configure_aws
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Send notification that deployment has started
    send_notifications "STARTED" "Deployment to production has started"
    
    # Build and push Docker images
    build_and_push_images
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Failed to build and push Docker images"
        exit 1
    fi
    
    # Update Kustomize configuration
    update_kustomization
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Failed to update Kustomize configuration"
        exit 1
    fi
    
    # Deploy blue environment
    deploy_blue_environment
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Failed to deploy blue environment"
        rollback_deployment
        exit 1
    fi
    
    # Run smoke tests
    run_smoke_tests
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Smoke tests failed"
        rollback_deployment
        exit 1
    fi
    
    # Request approval for traffic shifting
    request_approval
    if [ $? -ne 0 ]; then
        send_notifications "ABORTED" "Deployment aborted by user"
        rollback_deployment
        exit 1
    fi
    
    # Gradually shift traffic to blue environment
    shift_traffic_gradually
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Failed to shift traffic to blue environment"
        rollback_deployment
        exit 1
    fi
    
    # Run post-deployment tests
    run_post_deployment_tests
    if [ $? -ne 0 ]; then
        send_notifications "FAILED" "Post-deployment tests failed"
        rollback_deployment
        exit 1
    fi
    
    # Clean up green environment
    cleanup_green_environment
    if [ $? -ne 0 ]; then
        send_notifications "WARNING" "Failed to clean up green environment, but deployment is successful"
        # Don't roll back here as the deployment is already successful
    fi
    
    # Monitor deployment for stability (30 minutes)
    monitor_deployment 30
    if [ $? -ne 0 ]; then
        send_notifications "WARNING" "Post-deployment monitoring detected issues"
        # Alert but don't roll back automatically after full deployment
    fi
    
    # Send successful completion notification
    send_notifications "COMPLETED" "Deployment to production completed successfully"
    
    echo "Deployment completed successfully."
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?