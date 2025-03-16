#!/bin/bash
# build-images.sh
#
# Script to build and push Docker images for the Student Admissions Enrollment Platform
# This script provides reusable functions for building backend and frontend images with
# appropriate tags and configurations, and pushing them to a container registry.
# It is used by both manual deployment scripts and CI/CD workflows.

set -e  # Exit immediately if a command exits with a non-zero status

# Get script directory and repository root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
REGISTRY="ghcr.io"
REPOSITORY=""
BACKEND_IMAGE="admissions-backend"
FRONTEND_IMAGE="admissions-frontend"
IMAGE_TAG="latest"
BUILD_BACKEND=false
BUILD_FRONTEND=false
PUSH_IMAGES=false
REGISTRY_USERNAME=""
REGISTRY_PASSWORD=""

# Display usage information
print_usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo
    echo "Build and push Docker images for the Student Admissions Enrollment Platform"
    echo
    echo "Options:"
    echo "  -r, --registry URL         Container registry URL (default: ghcr.io)"
    echo "  -o, --repository REPO      GitHub repository name in owner/repo format (required)"
    echo "  -b, --backend              Build backend image"
    echo "  -f, --frontend             Build frontend image"
    echo "  -a, --all                  Build both backend and frontend images"
    echo "  -e, --environment ENV      Build for specific environment: development, staging, production (default: production)"
    echo "  -t, --tag TAG              Image tag (default: latest)"
    echo "  -p, --push                 Push images to registry after building"
    echo "  -u, --username USER        Registry username for login (optional)"
    echo "  -w, --password PASS        Registry password or token for login (optional)"
    echo "  -h, --help                 Show this help message and exit"
    echo
    echo "Examples:"
    echo "  $(basename "$0") --repository myorg/admissions-platform --all --environment production --tag v1.0.0 --push"
    echo "  $(basename "$0") -o myorg/admissions-platform -b -e staging -t latest"
}

# Parse command line arguments
parse_arguments() {
    ENVIRONMENT="production"  # Default environment

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
            -b|--backend)
                BUILD_BACKEND=true
                shift
                ;;
            -f|--frontend)
                BUILD_FRONTEND=true
                shift
                ;;
            -a|--all)
                BUILD_BACKEND=true
                BUILD_FRONTEND=true
                shift
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            -p|--push)
                PUSH_IMAGES=true
                shift
                ;;
            -u|--username)
                REGISTRY_USERNAME="$2"
                shift 2
                ;;
            -w|--password)
                REGISTRY_PASSWORD="$2"
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

    # Set environment-specific build arguments
    case "$ENVIRONMENT" in
        development)
            BACKEND_ENV_ARGS="--build-arg APP_ENV=local --build-arg APP_DEBUG=true --build-arg LOG_CHANNEL=stderr"
            FRONTEND_ENV_ARGS="--build-arg REACT_APP_API_URL=http://localhost:8000/api/v1 --build-arg REACT_APP_ENV=development"
            FRONTEND_TARGET="--target development"
            ;;
        staging)
            BACKEND_ENV_ARGS="--build-arg APP_ENV=staging --build-arg APP_DEBUG=false --build-arg LOG_CHANNEL=stack"
            FRONTEND_ENV_ARGS="--build-arg REACT_APP_API_URL=/api/v1 --build-arg REACT_APP_ENV=staging"
            FRONTEND_TARGET="--target production"
            ;;
        production)
            BACKEND_ENV_ARGS="--build-arg APP_ENV=production --build-arg APP_DEBUG=false --build-arg LOG_CHANNEL=stack"
            FRONTEND_ENV_ARGS="--build-arg REACT_APP_API_URL=/api/v1 --build-arg REACT_APP_ENV=production"
            FRONTEND_TARGET="--target production"
            ;;
        *)
            echo "Error: Unknown environment $ENVIRONMENT. Use development, staging, or production."
            return 1
            ;;
    esac

    # Validate required parameters
    if [ -z "$REPOSITORY" ]; then
        echo "Error: Repository name is required"
        print_usage
        return 1
    fi

    # If no build option is specified, show usage
    if [ "$BUILD_BACKEND" = false ] && [ "$BUILD_FRONTEND" = false ]; then
        echo "Error: No build option specified (--backend, --frontend, or --all)"
        print_usage
        return 1
    fi

    return 0
}

# Check if Docker is installed and the user has necessary permissions
check_prerequisites() {
    # Check if docker command is available
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed or not in PATH"
        return 1
    fi

    # Check if user has permission to run docker
    if ! docker info &> /dev/null; then
        echo "Error: Docker daemon is not running or you don't have permission to use it"
        return 1
    fi

    return 0
}

# Build the Docker image for the Laravel backend
build_backend_image() {
    local environment="$1"
    
    echo "Building backend image for $environment environment..."
    
    cd "$REPO_ROOT" || { echo "Error: Failed to navigate to repository root"; return 1; }
    
    docker build \
        -f src/backend/docker/Dockerfile \
        -t "${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}" \
        ${BACKEND_ENV_ARGS} \
        ./src/backend

    # Check if build was successful
    if [ $? -ne 0 ]; then
        echo "Error: Failed to build backend image"
        return 1
    fi
    
    echo "Backend image built successfully: ${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}"
    return 0
}

# Build the Docker image for the React frontend
build_frontend_image() {
    local environment="$1"
    
    echo "Building frontend image for $environment environment..."
    
    cd "$REPO_ROOT" || { echo "Error: Failed to navigate to repository root"; return 1; }
    
    docker build \
        -f src/web/Dockerfile \
        -t "${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}" \
        ${FRONTEND_ENV_ARGS} \
        ${FRONTEND_TARGET} \
        ./src/web

    # Check if build was successful
    if [ $? -ne 0 ]; then
        echo "Error: Failed to build frontend image"
        return 1
    fi
    
    echo "Frontend image built successfully: ${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}"
    return 0
}

# Login to container registry if credentials are provided
login_to_registry() {
    # Check if registry username and password are provided
    if [ -n "$REGISTRY_USERNAME" ] && [ -n "$REGISTRY_PASSWORD" ]; then
        echo "Logging in to registry ${REGISTRY}..."
        echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USERNAME" --password-stdin
        
        if [ $? -ne 0 ]; then
            echo "Error: Failed to login to registry"
            return 1
        fi
        
        echo "Successfully logged in to registry"
    else
        echo "No registry credentials provided, skipping login"
        echo "Note: If the registry requires authentication, push may fail"
    fi
    
    return 0
}

# Push built Docker images to the container registry
push_images() {
    echo "Pushing Docker images to registry..."
    
    # Push backend image if it was built
    if [ "$BUILD_BACKEND" = true ]; then
        echo "Pushing backend image to ${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}"
        docker push "${REGISTRY}/${REPOSITORY}/${BACKEND_IMAGE}:${IMAGE_TAG}"
        
        if [ $? -ne 0 ]; then
            echo "Error: Failed to push backend image"
            return 1
        fi
    fi
    
    # Push frontend image if it was built
    if [ "$BUILD_FRONTEND" = true ]; then
        echo "Pushing frontend image to ${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}"
        docker push "${REGISTRY}/${REPOSITORY}/${FRONTEND_IMAGE}:${IMAGE_TAG}"
        
        if [ $? -ne 0 ]; then
            echo "Error: Failed to push frontend image"
            return 1
        fi
    fi
    
    echo "Images pushed successfully to registry"
    return 0
}

# Main function
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
    
    # Login to registry if pushing images
    if [ "$PUSH_IMAGES" = true ]; then
        login_to_registry
        if [ $? -ne 0 ]; then
            return 1
        fi
    fi
    
    # Build backend image if requested
    if [ "$BUILD_BACKEND" = true ]; then
        build_backend_image "$ENVIRONMENT"
        if [ $? -ne 0 ]; then
            return 1
        fi
    fi
    
    # Build frontend image if requested
    if [ "$BUILD_FRONTEND" = true ]; then
        build_frontend_image "$ENVIRONMENT"
        if [ $? -ne 0 ]; then
            return 1
        fi
    fi
    
    # Push images if requested
    if [ "$PUSH_IMAGES" = true ]; then
        push_images
        if [ $? -ne 0 ]; then
            return 1
        fi
    fi
    
    echo "Build process completed successfully"
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?