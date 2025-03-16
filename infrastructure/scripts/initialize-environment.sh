#!/bin/bash
# initialize-environment.sh
#
# This script initializes the development, staging, or production environment
# for the Student Admissions Enrollment Platform. It automates the setup of
# required infrastructure, configuration files, environment variables, and
# dependencies needed before deployment.
#
# Usage: ./initialize-environment.sh [environment] [options]
#   environment: dev, staging, or production
#   options:
#     --skip-terraform: Skip Terraform initialization
#     --skip-aws: Skip AWS credential setup
#     --generate-plan: Generate Terraform plan
#     --help: Display usage information

# Exit on any error
set -e

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../../" && pwd)
ENV_NAME=${1:-"dev"}
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform/environments/$ENV_NAME"
DOCKER_DIR="$PROJECT_ROOT/infrastructure/docker"
BACKEND_DIR="$PROJECT_ROOT/src/backend"
FRONTEND_DIR="$PROJECT_ROOT/src/web"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/initialize-environment-$(date +%Y%m%d-%H%M%S).log"
SKIP_TERRAFORM=false
SKIP_AWS=false
GENERATE_PLAN=false
AWS_PROFILE=${AWS_PROFILE:-"default"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Define color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper Functions
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local message="$timestamp - $1"
    echo -e "${BLUE}$message${NC}"
    mkdir -p "$LOG_DIR"
    echo "$message" >> "$LOG_FILE"
}

log_success() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local message="$timestamp - $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_warning() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local message="$timestamp - WARNING: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_error() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local message="$timestamp - ERROR: $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

display_usage() {
    cat << EOF
Usage: ./initialize-environment.sh [environment] [options]

Initialize the specified environment (dev, staging, or production) for the
Student Admissions Enrollment Platform.

Arguments:
  environment             Target environment: dev, staging, or production
                          (defaults to dev if not specified)

Options:
  --skip-terraform        Skip Terraform initialization
  --skip-aws              Skip AWS credential setup
  --generate-plan         Generate Terraform plan
  --help                  Display this help message

Examples:
  ./initialize-environment.sh dev
  ./initialize-environment.sh staging --generate-plan
  ./initialize-environment.sh production

Environment Variables:
  AWS_PROFILE             AWS profile to use
  AWS_REGION              AWS region for deployment
  TERRAFORM_BACKEND_BUCKET    S3 bucket for Terraform state
  TERRAFORM_BACKEND_DYNAMODB  DynamoDB table for state locking

EOF
    exit 0
}

check_dependencies() {
    log_message "Checking required dependencies..."
    
    # Check for common dependencies
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install jq and try again."
        return 1
    fi
    
    # Check Docker for all environments
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker and try again."
        return 1
    fi
    
    # Check docker-compose for dev environment
    if [[ "$ENV_NAME" == "dev" ]] && ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed. Please install docker-compose and try again."
        return 1
    fi
    
    # Check AWS CLI, Terraform, and kubectl for staging and production
    if [[ "$ENV_NAME" != "dev" ]]; then
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI is not installed. Please install AWS CLI and try again."
            return 1
        fi
        
        if ! command -v terraform &> /dev/null; then
            log_error "Terraform is not installed. Please install Terraform and try again."
            return 1
        fi
        
        if ! command -v kubectl &> /dev/null; then
            log_error "kubectl is not installed. Please install kubectl and try again."
            return 1
        fi
    fi
    
    log_success "All required dependencies are installed."
    return 0
}

validate_environment() {
    log_message "Validating environment: $ENV_NAME"
    
    case "$ENV_NAME" in
        dev|staging|production)
            log_success "Environment '$ENV_NAME' is valid."
            return 0
            ;;
        *)
            log_error "Invalid environment: $ENV_NAME. Must be one of: dev, staging, production."
            return 1
            ;;
    esac
}

setup_directories() {
    log_message "Setting up directories for $ENV_NAME environment..."
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    # Ensure Terraform directory exists for non-dev environments
    if [[ "$ENV_NAME" != "dev" ]]; then
        mkdir -p "$TERRAFORM_DIR"
    fi
    
    # Create any environment-specific directories
    case "$ENV_NAME" in
        dev)
            mkdir -p "$DOCKER_DIR/volumes/mysql"
            mkdir -p "$DOCKER_DIR/volumes/redis"
            mkdir -p "$DOCKER_DIR/volumes/storage"
            chmod -R 777 "$DOCKER_DIR/volumes/storage"
            ;;
        staging|production)
            # Create directories needed for Kubernetes configs
            mkdir -p "$PROJECT_ROOT/infrastructure/kubernetes/$ENV_NAME"
            ;;
    esac
    
    log_success "Directories set up successfully."
    return 0
}

setup_aws_credentials() {
    # Skip for dev environment or if --skip-aws flag is used
    if [[ "$ENV_NAME" == "dev" || "$SKIP_AWS" == true ]]; then
        if [[ "$ENV_NAME" != "dev" ]]; then
            log_warning "Skipping AWS credential setup as requested with --skip-aws"
        fi
        return 0
    fi
    
    log_message "Setting up AWS credentials for $ENV_NAME environment..."
    
    # Check if AWS CLI is configured
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        log_warning "AWS credentials not found or invalid for profile '$AWS_PROFILE'"
        
        # Prompt user to select or create a profile
        echo "Available AWS profiles:"
        aws configure list-profiles
        
        echo -n "Enter AWS profile to use (or 'new' to create a new profile): "
        read profile_input
        
        if [[ "$profile_input" == "new" ]]; then
            echo -n "Enter new profile name: "
            read new_profile
            
            aws configure --profile "$new_profile"
            AWS_PROFILE="$new_profile"
        else
            AWS_PROFILE="$profile_input"
        fi
        
        # Verify credentials again
        if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
            log_error "AWS credentials still invalid. Please configure AWS CLI manually."
            return 1
        fi
    fi
    
    # Set AWS_PROFILE for subsequent commands
    export AWS_PROFILE="$AWS_PROFILE"
    
    # Set AWS region if not already set
    if [[ -z "$AWS_REGION" ]]; then
        # Get default region from profile
        AWS_REGION=$(aws configure get region --profile "$AWS_PROFILE")
        if [[ -z "$AWS_REGION" ]]; then
            AWS_REGION="us-east-1"
            log_warning "AWS region not set. Using default: $AWS_REGION"
        fi
    fi
    export AWS_REGION="$AWS_REGION"
    
    log_success "AWS credentials set up successfully. Using profile: $AWS_PROFILE, region: $AWS_REGION"
    return 0
}

generate_env_files() {
    log_message "Generating environment files for $ENV_NAME environment..."
    
    # Create backend .env file
    BACKEND_ENV_FILE="$BACKEND_DIR/.env.$ENV_NAME"
    
    # Create frontend .env file
    FRONTEND_ENV_FILE="$FRONTEND_DIR/.env.$ENV_NAME"
    
    # Generate environment-specific values
    APP_KEY=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Common variables for all environments
    cat > "$BACKEND_ENV_FILE" << EOL
APP_NAME="Student Admissions Enrollment Platform"
APP_ENV=$ENV_NAME
APP_KEY=base64:$APP_KEY
APP_DEBUG=$([ "$ENV_NAME" == "production" ] && echo "false" || echo "true")
APP_URL=$([ "$ENV_NAME" == "dev" ] && echo "http://localhost" || echo "https://$ENV_NAME.admissions-platform.example.com")
LOG_CHANNEL=stack
LOG_LEVEL=$([ "$ENV_NAME" == "production" ] && echo "error" || echo "debug")

JWT_SECRET=$JWT_SECRET
JWT_TTL=60
JWT_REFRESH_TTL=20160

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
EOL

    # Environment-specific database and Redis configuration
    case "$ENV_NAME" in
        dev)
            cat >> "$BACKEND_ENV_FILE" << EOL
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=admissions_platform
DB_USERNAME=admissions_user
DB_PASSWORD=dev_password

REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

FILESYSTEM_DISK=local
BROADCAST_DRIVER=log
EOL
            ;;
        staging)
            # For staging, we'll use values from Terraform outputs when available
            # For now, use placeholders that will be replaced later
            cat >> "$BACKEND_ENV_FILE" << EOL
DB_CONNECTION=mysql
DB_HOST=DB_HOST_PLACEHOLDER
DB_PORT=3306
DB_DATABASE=admissions_platform
DB_USERNAME=DB_USERNAME_PLACEHOLDER
DB_PASSWORD=DB_PASSWORD_PLACEHOLDER

REDIS_HOST=REDIS_HOST_PLACEHOLDER
REDIS_PASSWORD=REDIS_PASSWORD_PLACEHOLDER
REDIS_PORT=6379

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID_PLACEHOLDER
AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY_PLACEHOLDER
AWS_DEFAULT_REGION=$AWS_REGION
AWS_BUCKET=AWS_BUCKET_PLACEHOLDER
AWS_URL=https://s3.$AWS_REGION.amazonaws.com/AWS_BUCKET_PLACEHOLDER

BROADCAST_DRIVER=redis
EOL
            ;;
        production)
            # For production, use placeholders that will be replaced by secure values
            cat >> "$BACKEND_ENV_FILE" << EOL
DB_CONNECTION=mysql
DB_HOST=DB_HOST_PLACEHOLDER
DB_PORT=3306
DB_DATABASE=admissions_platform
DB_USERNAME=DB_USERNAME_PLACEHOLDER
DB_PASSWORD=DB_PASSWORD_PLACEHOLDER

REDIS_HOST=REDIS_HOST_PLACEHOLDER
REDIS_PASSWORD=REDIS_PASSWORD_PLACEHOLDER
REDIS_PORT=6379

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID_PLACEHOLDER
AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY_PLACEHOLDER
AWS_DEFAULT_REGION=$AWS_REGION
AWS_BUCKET=AWS_BUCKET_PLACEHOLDER
AWS_URL=https://s3.$AWS_REGION.amazonaws.com/AWS_BUCKET_PLACEHOLDER

BROADCAST_DRIVER=redis
EOL
            ;;
    esac
    
    # Create frontend environment file
    cat > "$FRONTEND_ENV_FILE" << EOL
REACT_APP_ENV=$ENV_NAME
REACT_APP_API_URL=$([ "$ENV_NAME" == "dev" ] && echo "http://localhost/api/v1" || echo "https://$ENV_NAME.admissions-platform.example.com/api/v1")
REACT_APP_DEBUG=$([ "$ENV_NAME" == "production" ] && echo "false" || echo "true")
EOL

    # Set appropriate file permissions
    chmod 600 "$BACKEND_ENV_FILE"
    chmod 600 "$FRONTEND_ENV_FILE"
    
    log_success "Environment files generated successfully."
    return 0
}

setup_local_dev_environment() {
    # Only for dev environment
    if [[ "$ENV_NAME" != "dev" ]]; then
        return 0
    fi
    
    log_message "Setting up local development environment..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        return 1
    fi
    
    # Copy docker-compose file if it doesn't exist
    if [[ ! -f "$DOCKER_DIR/docker-compose.yml" ]]; then
        cp "$DOCKER_DIR/docker-compose.dev.yml" "$DOCKER_DIR/docker-compose.yml"
        log_message "Created docker-compose.yml from template."
    fi
    
    # Create .env file for docker-compose
    cat > "$DOCKER_DIR/.env" << EOL
COMPOSE_PROJECT_NAME=admissions_platform
DB_ROOT_PASSWORD=root_password
DB_DATABASE=admissions_platform
DB_USERNAME=admissions_user
DB_PASSWORD=dev_password
EOL
    
    # Ensure volumes exist and have correct permissions
    mkdir -p "$DOCKER_DIR/volumes/mysql"
    mkdir -p "$DOCKER_DIR/volumes/redis"
    mkdir -p "$DOCKER_DIR/volumes/storage"
    chmod -R 777 "$DOCKER_DIR/volumes/storage"
    
    # Pull required Docker images
    log_message "Pulling required Docker images..."
    docker-compose -f "$DOCKER_DIR/docker-compose.yml" pull
    
    log_success "Local development environment setup complete."
    return 0
}

setup_terraform_backend() {
    # Skip for dev environment
    if [[ "$ENV_NAME" == "dev" ]]; then
        return 0
    fi
    
    log_message "Setting up Terraform backend for $ENV_NAME environment..."
    
    # Default bucket and table names if not set via environment variables
    TERRAFORM_BACKEND_BUCKET=${TERRAFORM_BACKEND_BUCKET:-"admissions-platform-terraform-$ENV_NAME"}
    TERRAFORM_BACKEND_DYNAMODB=${TERRAFORM_BACKEND_DYNAMODB:-"admissions-platform-terraform-locks-$ENV_NAME"}
    
    # Check if S3 bucket exists, create if it doesn't
    if ! aws s3api head-bucket --bucket "$TERRAFORM_BACKEND_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
        log_message "Creating S3 bucket for Terraform state: $TERRAFORM_BACKEND_BUCKET"
        aws s3api create-bucket \
            --bucket "$TERRAFORM_BACKEND_BUCKET" \
            --region "$AWS_REGION" \
            $([ "$AWS_REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$AWS_REGION") \
            --profile "$AWS_PROFILE"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$TERRAFORM_BACKEND_BUCKET" \
            --versioning-configuration Status=Enabled \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE"
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket "$TERRAFORM_BACKEND_BUCKET" \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        },
                        "BucketKeyEnabled": true
                    }
                ]
            }' \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE"
        
        log_success "S3 bucket created and configured successfully."
    else
        log_message "S3 bucket for Terraform state already exists: $TERRAFORM_BACKEND_BUCKET"
    fi
    
    # Check if DynamoDB table exists, create if it doesn't
    if ! aws dynamodb describe-table --table-name "$TERRAFORM_BACKEND_DYNAMODB" --region "$AWS_REGION" --profile "$AWS_PROFILE" &>/dev/null; then
        log_message "Creating DynamoDB table for Terraform state locking: $TERRAFORM_BACKEND_DYNAMODB"
        aws dynamodb create-table \
            --table-name "$TERRAFORM_BACKEND_DYNAMODB" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE"
        
        log_success "DynamoDB table created successfully."
    else
        log_message "DynamoDB table for Terraform state locking already exists: $TERRAFORM_BACKEND_DYNAMODB"
    fi
    
    # Create backend configuration file
    mkdir -p "$TERRAFORM_DIR"
    cat > "$TERRAFORM_DIR/backend.tf" << EOL
terraform {
  backend "s3" {
    bucket         = "$TERRAFORM_BACKEND_BUCKET"
    key            = "$ENV_NAME/terraform.tfstate"
    region         = "$AWS_REGION"
    dynamodb_table = "$TERRAFORM_BACKEND_DYNAMODB"
    encrypt        = true
  }
}
EOL
    
    log_success "Terraform backend configured successfully."
    return 0
}

initialize_terraform() {
    # Skip for dev environment or if --skip-terraform flag is used
    if [[ "$ENV_NAME" == "dev" || "$SKIP_TERRAFORM" == true ]]; then
        if [[ "$ENV_NAME" != "dev" ]]; then
            log_warning "Skipping Terraform initialization as requested with --skip-terraform"
        fi
        return 0
    fi
    
    log_message "Initializing Terraform for $ENV_NAME environment..."
    
    # Ensure Terraform directory exists
    if [[ ! -d "$TERRAFORM_DIR" ]]; then
        log_error "Terraform directory does not exist: $TERRAFORM_DIR"
        return 1
    fi
    
    # Initialize Terraform
    cd "$TERRAFORM_DIR"
    terraform init -reconfigure
    
    # Validate Terraform configuration
    terraform validate
    
    # Generate plan if requested
    if [[ "$GENERATE_PLAN" == true ]]; then
        log_message "Generating Terraform plan..."
        terraform plan -out="${ENV_NAME}_plan.tfplan"
        log_success "Terraform plan generated: ${ENV_NAME}_plan.tfplan"
    fi
    
    log_success "Terraform initialized successfully."
    return 0
}

setup_kubernetes_config() {
    # Skip for dev environment
    if [[ "$ENV_NAME" == "dev" ]]; then
        return 0
    fi
    
    log_message "Setting up Kubernetes configuration for $ENV_NAME environment..."
    
    # Create Kubernetes config directory if it doesn't exist
    KUBE_DIR="$PROJECT_ROOT/infrastructure/kubernetes/$ENV_NAME"
    mkdir -p "$KUBE_DIR"
    
    # Create namespace yaml
    cat > "$KUBE_DIR/namespace.yaml" << EOL
apiVersion: v1
kind: Namespace
metadata:
  name: admissions-platform-$ENV_NAME
EOL
    
    # Create secrets template
    cat > "$KUBE_DIR/secrets-template.yaml" << EOL
apiVersion: v1
kind: Secret
metadata:
  name: admissions-platform-secrets
  namespace: admissions-platform-$ENV_NAME
type: Opaque
data:
  DB_PASSWORD: BASE64_DB_PASSWORD
  REDIS_PASSWORD: BASE64_REDIS_PASSWORD
  AWS_ACCESS_KEY_ID: BASE64_AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY: BASE64_AWS_SECRET_ACCESS_KEY
  APP_KEY: BASE64_APP_KEY
  JWT_SECRET: BASE64_JWT_SECRET
EOL
    
    # Create service account
    cat > "$KUBE_DIR/service-account.yaml" << EOL
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admissions-platform-sa
  namespace: admissions-platform-$ENV_NAME
EOL
    
    # Create RBAC role and binding
    cat > "$KUBE_DIR/rbac.yaml" << EOL
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: admissions-platform-role
  namespace: admissions-platform-$ENV_NAME
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: admissions-platform-rolebinding
  namespace: admissions-platform-$ENV_NAME
subjects:
- kind: ServiceAccount
  name: admissions-platform-sa
  namespace: admissions-platform-$ENV_NAME
roleRef:
  kind: Role
  name: admissions-platform-role
  apiGroup: rbac.authorization.k8s.io
EOL
    
    log_success "Kubernetes configuration set up successfully."
    return 0
}

initialize_database_config() {
    log_message "Initializing database configuration for $ENV_NAME environment..."
    
    # Set database configuration based on environment
    case "$ENV_NAME" in
        dev)
            # For dev, we use local Docker MySQL
            DB_HOST="mysql"
            DB_PORT="3306"
            DB_DATABASE="admissions_platform"
            DB_USERNAME="admissions_user"
            DB_PASSWORD="dev_password"
            ;;
        staging|production)
            # For staging/production, we need to get RDS endpoint from Terraform outputs
            # This is a placeholder and would normally use Terraform outputs
            DB_HOST="DB_HOST_PLACEHOLDER"
            DB_PORT="3306"
            DB_DATABASE="admissions_platform"
            DB_USERNAME="DB_USERNAME_PLACEHOLDER"
            DB_PASSWORD="DB_PASSWORD_PLACEHOLDER"
            ;;
    esac
    
    # Update .env file with database configuration
    sed -i.bak \
        -e "s|DB_HOST=.*|DB_HOST=$DB_HOST|g" \
        -e "s|DB_PORT=.*|DB_PORT=$DB_PORT|g" \
        -e "s|DB_DATABASE=.*|DB_DATABASE=$DB_DATABASE|g" \
        -e "s|DB_USERNAME=.*|DB_USERNAME=$DB_USERNAME|g" \
        -e "s|DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|g" \
        "$BACKEND_DIR/.env.$ENV_NAME"
    
    log_success "Database configuration initialized successfully."
    return 0
}

initialize_redis_config() {
    log_message "Initializing Redis configuration for $ENV_NAME environment..."
    
    # Set Redis configuration based on environment
    case "$ENV_NAME" in
        dev)
            # For dev, we use local Docker Redis
            REDIS_HOST="redis"
            REDIS_PORT="6379"
            REDIS_PASSWORD="null"
            ;;
        staging|production)
            # For staging/production, we need to get ElastiCache endpoint from Terraform outputs
            # This is a placeholder and would normally use Terraform outputs
            REDIS_HOST="REDIS_HOST_PLACEHOLDER"
            REDIS_PORT="6379"
            REDIS_PASSWORD="REDIS_PASSWORD_PLACEHOLDER"
            ;;
    esac
    
    # Update .env file with Redis configuration
    sed -i.bak \
        -e "s|REDIS_HOST=.*|REDIS_HOST=$REDIS_HOST|g" \
        -e "s|REDIS_PORT=.*|REDIS_PORT=$REDIS_PORT|g" \
        -e "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" \
        "$BACKEND_DIR/.env.$ENV_NAME"
    
    log_success "Redis configuration initialized successfully."
    return 0
}

initialize_storage_config() {
    log_message "Initializing storage configuration for $ENV_NAME environment..."
    
    # Set storage configuration based on environment
    case "$ENV_NAME" in
        dev)
            # For dev, we use local filesystem
            FILESYSTEM_DISK="local"
            ;;
        staging|production)
            # For staging/production, we use S3
            FILESYSTEM_DISK="s3"
            AWS_BUCKET="AWS_BUCKET_PLACEHOLDER"
            AWS_URL="https://s3.$AWS_REGION.amazonaws.com/$AWS_BUCKET"
            
            # Update .env file with S3 configuration
            sed -i.bak \
                -e "s|FILESYSTEM_DISK=.*|FILESYSTEM_DISK=$FILESYSTEM_DISK|g" \
                -e "s|AWS_BUCKET=.*|AWS_BUCKET=$AWS_BUCKET|g" \
                -e "s|AWS_URL=.*|AWS_URL=$AWS_URL|g" \
                "$BACKEND_DIR/.env.$ENV_NAME"
            ;;
    esac
    
    log_success "Storage configuration initialized successfully."
    return 0
}

# Parse command line arguments
parse_arguments() {
    # Parse the first argument as environment name if it doesn't start with --
    if [[ $# -gt 0 && "${1:0:2}" != "--" ]]; then
        ENV_NAME="$1"
        shift
    fi
    
    # Parse remaining arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-terraform)
                SKIP_TERRAFORM=true
                ;;
            --skip-aws)
                SKIP_AWS=true
                ;;
            --generate-plan)
                GENERATE_PLAN=true
                ;;
            --help)
                display_usage
                ;;
            *)
                log_error "Unknown option: $1"
                display_usage
                ;;
        esac
        shift
    done
}

# Main function
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Display header
    log_message "==============================================================="
    log_message "  Student Admissions Enrollment Platform - Environment Setup   "
    log_message "==============================================================="
    log_message "Environment: $ENV_NAME"
    log_message "Log file: $LOG_FILE"
    
    # Validate environment name
    if ! validate_environment; then
        return 1
    fi
    
    # Check dependencies
    if ! check_dependencies; then
        return 1
    fi
    
    # Setup directories
    if ! setup_directories; then
        return 1
    fi
    
    # Setup AWS credentials (for staging/production)
    if ! setup_aws_credentials; then
        return 1
    fi
    
    # Generate environment files
    if ! generate_env_files; then
        return 1
    fi
    
    # Setup environment-specific components
    if [[ "$ENV_NAME" == "dev" ]]; then
        # Setup local development environment
        if ! setup_local_dev_environment; then
            return 1
        fi
    else
        # Setup Terraform backend
        if ! setup_terraform_backend; then
            return 1
        fi
        
        # Initialize Terraform
        if ! initialize_terraform; then
            return 1
        fi
        
        # Setup Kubernetes configuration
        if ! setup_kubernetes_config; then
            return 1
        fi
    fi
    
    # Initialize database configuration
    if ! initialize_database_config; then
        return 1
    fi
    
    # Initialize Redis configuration
    if ! initialize_redis_config; then
        return 1
    fi
    
    # Initialize storage configuration
    if ! initialize_storage_config; then
        return 1
    fi
    
    log_success "==============================================================="
    log_success "  Environment initialization completed successfully!           "
    log_success "==============================================================="
    log_message "Next steps:"
    
    if [[ "$ENV_NAME" == "dev" ]]; then
        log_message "  1. Start the development environment:"
        log_message "     cd $DOCKER_DIR && docker-compose up -d"
        log_message "  2. Run database migrations:"
        log_message "     docker-compose exec php php artisan migrate"
        log_message "  3. Install frontend dependencies:"
        log_message "     cd $FRONTEND_DIR && npm install"
        log_message "  4. Start the frontend development server:"
        log_message "     npm start"
    else
        log_message "  1. Apply Terraform configuration:"
        log_message "     cd $TERRAFORM_DIR && terraform apply"
        log_message "  2. Update placeholder values in environment files with actual values"
        log_message "  3. Apply Kubernetes configuration:"
        log_message "     kubectl apply -f $PROJECT_ROOT/infrastructure/kubernetes/$ENV_NAME/"
    fi
    
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?