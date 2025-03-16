#!/bin/bash

# Description: Shell script for generating and seeding test data into the Student Admissions Enrollment Platform database.
# This script creates realistic test data using Laravel's model factories to populate the database with users, applications, documents, and related records for development and testing purposes.

# Requirements Addressed:
# - Testing Strategy: Implements the factory-based test data generation approach for creating realistic test data in development and test environments
# - Development Environment: Provides tools for initializing development environments with appropriate test data
# - Database Initialization: Supports the initialization of databases with test data for various environments
# - Quality Metrics: Facilitates testing with realistic data to ensure high-quality test coverage

# Globals:
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/seed-test-data-$(date +"%Y%m%d-%H%M%S").log"
ENVIRONMENT=""  # Environment name (dev, staging, test) from command line or default
DATA_VOLUME=""  # Amount of test data to generate (small, medium, large)
DOCKER_CONTAINER="" # Name of the backend Docker container if using Docker
SKIP_BASE_DATA=false # Flag to skip base data seeding
ONLY_GENERATE="" # Comma-separated list of data types to generate

# Function: log_message
# Description: Logs a message to both stdout and the log file
# Parameters:
#   $1 - message: The message to log
log_message() {
    local message="$1"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local log_message="[$timestamp] $message"
    echo "$log_message"
    echo "$log_message" >> "$LOG_FILE"
}

# Function: check_dependencies
# Description: Checks if required dependencies are installed
# Returns:
#   True if all dependencies are available, false otherwise
check_dependencies() {
    log_message "Checking dependencies..."

    # Check if PHP is installed (if not using Docker)
    if [ -z "$DOCKER_CONTAINER" ]; then
        if ! command -v php &> /dev/null
        then
            log_message "Error: PHP is not installed. Please install PHP before running this script."
            return 1
        fi
    fi

    # Check if Laravel Artisan is available
    if [ ! -f "$BACKEND_DIR/artisan" ]; then
        log_message "Error: Laravel Artisan is not found in $BACKEND_DIR. Please ensure you are running this script from the project root."
        return 1
    fi

    # Check if Docker is installed (if using Docker mode)
    if [ ! -z "$DOCKER_CONTAINER" ]; then
        if ! command -v docker &> /dev/null
        then
            log_message "Error: Docker is not installed. Please install Docker before using Docker mode."
            return 1
        fi
    fi

    log_message "All dependencies are available."
    return 0
}

# Function: create_log_directory
# Description: Creates the log directory if it doesn't exist
# Returns:
#   True if directory exists or was created successfully, false otherwise
create_log_directory() {
    log_message "Creating log directory if it doesn't exist..."

    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        if [ $? -ne 0 ]; then
            log_message "Error: Failed to create log directory $LOG_DIR"
            return 1
        fi
        chmod 777 "$LOG_DIR" # Setting permissions to allow writing
        log_message "Log directory $LOG_DIR created successfully."
    else
        log_message "Log directory $LOG_DIR already exists."
    fi

    return 0
}

# Function: run_artisan_command
# Description: Runs an Artisan command either directly or through Docker
# Parameters:
#   $1 - command: The Artisan command to run
# Returns:
#   True if command executed successfully, false otherwise
run_artisan_command() {
    local command="$1"
    log_message "Running Artisan command: $command"

    if [ ! -z "$DOCKER_CONTAINER" ]; then
        # Execute command in the backend container
        docker exec -i "$DOCKER_CONTAINER" bash -c "cd /var/www/html && php artisan $command" >> "$LOG_FILE" 2>&1
        local exit_code=$?
    else
        # Execute command directly in the backend directory
        cd "$BACKEND_DIR" || exit 1
        php artisan "$command" >> "$LOG_FILE" 2>&1
        local exit_code=$?
    fi

    if [ "$exit_code" -ne 0 ]; then
        log_message "Error: Artisan command '$command' failed with exit code $exit_code."
        return 1
    else
        log_message "Artisan command '$command' executed successfully."
        return 0
    fi
}

# Function: seed_base_data
# Description: Seeds the database with base data using Laravel's database seeders
# Returns:
#   True if seeding was successful, false otherwise
seed_base_data() {
    log_message "Seeding base data..."
    if run_artisan_command "db:seed"; then
        log_message "Base data seeded successfully."
        return 0
    else
        log_message "Error: Failed to seed base data."
        return 1
    fi
}

# Function: generate_test_users
# Description: Generates test user accounts with different roles
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
# Returns:
#   An array of generated user IDs by role
generate_test_users() {
    local volume="$1"
    local admin_count=0
    local staff_count=0
    local reviewer_count=0
    local student_count=0
    local applicant_count=0

    log_message "Generating test users (volume: $volume)..."

    case "$volume" in
        small)
            admin_count=10
            staff_count=10
            reviewer_count=10
            student_count=10
            applicant_count=10
            ;;
        medium)
            admin_count=50
            staff_count=50
            reviewer_count=50
            student_count=50
            applicant_count=50
            ;;
        large)
            admin_count=200
            staff_count=200
            reviewer_count=200
            student_count=200
            applicant_count=200
            ;;
        *)
            log_message "Error: Invalid data volume '$volume'. Using default (small)."
            admin_count=10
            staff_count=10
            reviewer_count=10
            student_count=10
            applicant_count=10
            ;;
    esac

    local user_ids=()

    log_message "Creating $admin_count admin users..."
    run_artisan_command "db:seed --class=CreateAdminUserSeeder --count=$admin_count"
    user_ids+=("admin=$(run_artisan_command "model:ids App\\Models\\User --role=Administrator")")

    log_message "Creating $staff_count staff users..."
    run_artisan_command "db:seed --class=CreateStaffUserSeeder --count=$staff_count"
    user_ids+=("staff=$(run_artisan_command "model:ids App\\Models\\User --role=Staff")")

    log_message "Creating $reviewer_count reviewer users..."
    run_artisan_command "db:seed --class=CreateReviewerUserSeeder --count=$reviewer_count"
    user_ids+=("reviewer=$(run_artisan_command "model:ids App\\Models\\User --role=Reviewer")")

    log_message "Creating $student_count student users..."
    run_artisan_command "db:seed --class=CreateStudentUserSeeder --count=$student_count"
    user_ids+=("student=$(run_artisan_command "model:ids App\\Models\\User --role=Student")")

    log_message "Creating $applicant_count applicant users..."
    run_artisan_command "db:seed --class=CreateApplicantUserSeeder --count=$applicant_count"
    user_ids+=("applicant=$(run_artisan_command "model:ids App\\Models\\User --role=Applicant")")

    echo "${user_ids[@]}"
}

# Function: generate_test_applications
# Description: Generates test applications with various statuses
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
#   $2 - userIds: An array of user IDs grouped by role
# Returns:
#   An array of generated application IDs by type and status
generate_test_applications() {
    local volume="$1"
    local user_ids=("$2")
    local undergraduate_count=0
    local graduate_count=0
    local transfer_count=0

    log_message "Generating test applications (volume: $volume)..."

    case "$volume" in
        small)
            undergraduate_count=20
            graduate_count=20
            transfer_count=20
            ;;
        medium)
            undergraduate_count=100
            graduate_count=100
            transfer_count=100
            ;;
        large)
            undergraduate_count=500
            graduate_count=500
            transfer_count=500
            ;;
        *)
            log_message "Error: Invalid data volume '$volume'. Using default (small)."
            undergraduate_count=20
            graduate_count=20
            transfer_count=20
            ;;
    esac

    local application_ids=()

    log_message "Creating $undergraduate_count undergraduate applications..."
    run_artisan_command "db:seed --class=CreateUndergraduateApplicationSeeder --count=$undergraduate_count"
    application_ids+=("undergraduate=$(run_artisan_command "model:ids App\\Models\\Application --type=undergraduate")")

    log_message "Creating $graduate_count graduate applications..."
    run_artisan_command "db:seed --class=CreateGraduateApplicationSeeder --count=$graduate_count"
    application_ids+=("graduate=$(run_artisan_command "model:ids App\\Models\\Application --type=graduate")")

    log_message "Creating $transfer_count transfer applications..."
    run_artisan_command "db:seed --class=CreateTransferApplicationSeeder --count=$transfer_count"
    application_ids+=("transfer=$(run_artisan_command "model:ids App\\Models\\Application --type=transfer")")

    echo "${application_ids[@]}"
}

# Function: generate_test_documents
# Description: Generates test documents for applications
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
#   $2 - applicationIds: An array of application IDs
# Returns:
#   An array of generated document IDs by type
generate_test_documents() {
    local volume="$1"
    local application_ids=("$2")
    local transcript_count=0
    local identification_count=0
    local recommendation_count=0
    local personal_statement_count=0
    local other_count=0

    log_message "Generating test documents (volume: $volume)..."

    case "$volume" in
        small)
            transcript_count=2
            identification_count=2
            recommendation_count=2
            personal_statement_count=2
            other_count=1
            ;;
        medium)
            transcript_count=3
            identification_count=3
            recommendation_count=3
            personal_statement_count=3
            other_count=2
            ;;
        large)
            transcript_count=5
            identification_count=5
            recommendation_count=5
            personal_statement_count=5
            other_count=3
            ;;
        *)
            log_message "Error: Invalid data volume '$volume'. Using default (small)."
            transcript_count=2
            identification_count=2
            recommendation_count=2
            personal_statement_count=2
            other_count=1
            ;;
    esac

    local document_ids=()

    log_message "Creating $transcript_count transcript documents..."
    run_artisan_command "db:seed --class=CreateTranscriptDocumentSeeder --count=$transcript_count"
    document_ids+=("transcript=$(run_artisan_command "model:ids App\\Models\\Document --type=transcript")")

    log_message "Creating $identification_count identification documents..."
    run_artisan_command "db:seed --class=CreateIdentificationDocumentSeeder --count=$identification_count"
    document_ids+=("identification=$(run_artisan_command "model:ids App\\Models\\Document --type=identification")")

    log_message "Creating $recommendation_count recommendation documents..."
    run_artisan_command "db:seed --class=CreateRecommendationDocumentSeeder --count=$recommendation_count"
    document_ids+=("recommendation=$(run_artisan_command "model:ids App\\Models\\Document --type=recommendation")")

    log_message "Creating $personal_statement_count personal statement documents..."
    run_artisan_command "db:seed --class=CreatePersonalStatementDocumentSeeder --count=$personal_statement_count"
    document_ids+=("personal_statement=$(run_artisan_command "model:ids App\\Models\\Document --type=personal_statement")")

    log_message "Creating $other_count other documents..."
    run_artisan_command "db:seed --class=CreateOtherDocumentSeeder --count=$other_count"
    document_ids+=("other=$(run_artisan_command "model:ids App\\Models\\Document --type=other")")

    echo "${document_ids[@]}"
}

# Function: generate_test_messages
# Description: Generates test messages between users
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
#   $2 - userIds: An array of user IDs
# Returns:
#   True if message generation was successful, false otherwise
generate_test_messages() {
    local volume="$1"
    local user_ids=("$2")
    local message_count=0

    log_message "Generating test messages (volume: $volume)..."

    case "$volume" in
        small)
            message_count=50
            ;;
        medium)
            message_count=200
            ;;
        large)
            message_count=1000
            ;;
        *)
            log_message "Error: Invalid data volume '$volume'. Using default (small)."
            message_count=50
            ;;
    esac

    log_message "Creating $message_count messages..."
    run_artisan_command "db:seed --class=CreateMessageSeeder --count=$message_count"

    log_message "Test messages generated successfully."
    return 0
}

# Function: generate_test_payments
# Description: Generates test payment records for applications
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
#   $2 - applicationIds: An array of application IDs
# Returns:
#   True if payment generation was successful, false otherwise
generate_test_payments() {
    local volume="$1"
    local application_ids=("$2")
    local payment_count=0

    log_message "Generating test payments (volume: $volume)..."

    case "$volume" in
        small)
            payment_count=1
            ;;
        medium)
            payment_count=2
            ;;
        large)
            payment_count=3
            ;;
        *)
            log_message "Error: Invalid data volume '$volume'. Using default (small)."
            payment_count=1
            ;;
    esac

    log_message "Creating $payment_count payments..."
    run_artisan_command "db:seed --class=CreatePaymentSeeder --count=$payment_count"

    log_message "Test payments generated successfully."
    return 0
}

# Function: parse_arguments
# Description: Parses command line arguments
# Parameters:
#   $1 - args: The command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        key="$1"
        case $key in
            --env=*)
                ENVIRONMENT="${key#*=}"
                shift
                ;;
            --volume=*)
                DATA_VOLUME="${key#*=}"
                shift
                ;;
            --docker=*)
                DOCKER_CONTAINER="${key#*=}"
                shift
                ;;
            --skip-base-data)
                SKIP_BASE_DATA=true
                shift
                ;;
            --only=*)
                ONLY_GENERATE="${key#*=}"
                shift
                ;;
            --help)
                display_usage
                exit 0
                ;;
            *)
                log_message "Error: Unknown parameter: $key"
                display_usage
                exit 1
                ;;
        esac
    done

    # Set default values if not provided
    [ -z "$ENVIRONMENT" ] && ENVIRONMENT="dev"
    [ -z "$DATA_VOLUME" ] && DATA_VOLUME="small"

    log_message "Environment: $ENVIRONMENT"
    log_message "Data Volume: $DATA_VOLUME"
    [ ! -z "$DOCKER_CONTAINER" ] && log_message "Docker Container: $DOCKER_CONTAINER"
    [ "$SKIP_BASE_DATA" = true ] && log_message "Skipping base data seeding"
    [ ! -z "$ONLY_GENERATE" ] && log_message "Only generating data types: $ONLY_GENERATE"
}

# Function: display_usage
# Description: Displays script usage information
display_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Description: This script generates and seeds test data into the Student Admissions Enrollment Platform database."
    echo ""
    echo "Options:"
    echo "  --env=<environment>     Target environment (dev, staging, test). Default: dev"
    echo "  --volume=<size>          Amount of test data to generate (small, medium, large). Default: small"
    echo "  --docker=<container>     Docker container name for backend (if using Docker)"
    echo "  --skip-base-data         Skip seeding of base data (roles, permissions, workflows)"
    echo "  --only=<types>           Only generate specific data types (users,applications,documents,messages,payments)"
    echo "  --help                   Display this usage information"
    echo ""
    echo "Examples:"
    echo "  $0 --env=dev --volume=small"
    echo "  $0 --env=test --volume=medium --docker=admissions-backend"
    echo "  $0 --env=dev --only=users,applications"
}

# Function: main
# Description: Main function that orchestrates the test data generation process
# Returns:
#   Exit code (0 for success, non-zero for failure)
main() {
    # Parse command line arguments
    parse_arguments "$@"

    # Initialize script and log start time
    log_message "Starting test data generation..."
    start_time=$(date +%s)

    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi

    # Create log directory
    if ! create_log_directory; then
        exit 1
    fi

    # Seed base data if not skipped
    if [ "$SKIP_BASE_DATA" = false ]; then
        if ! seed_base_data; then
            exit 1
        fi
    fi

    # Generate test data based on volume
    local user_ids=()
    local application_ids=()
    local document_ids=()

    if [[ -z "$ONLY_GENERATE" || "$ONLY_GENERATE" == *"users"* ]]; then
        user_ids=($(generate_test_users "$DATA_VOLUME"))
    fi

    if [[ -z "$ONLY_GENERATE" || "$ONLY_GENERATE" == *"applications"* ]]; then
        application_ids=($(generate_test_applications "$DATA_VOLUME" "${user_ids[@]}"))
    fi

    if [[ -z "$ONLY_GENERATE" || "$ONLY_GENERATE" == *"documents"* ]]; then
        document_ids=($(generate_test_documents "$DATA_VOLUME" "${application_ids[@]}"))
    fi

    if [[ -z "$ONLY_GENERATE" || "$ONLY_GENERATE" == *"messages"* ]]; then
        if ! generate_test_messages "$DATA_VOLUME" "${user_ids[@]}"; then
            exit 1
        fi
    fi

    if [[ -z "$ONLY_GENERATE" || "$ONLY_GENERATE" == *"payments"* ]]; then
        if ! generate_test_payments "$DATA_VOLUME" "${application_ids[@]}"; then
            exit 1
        fi
    fi

    # Log completion summary with counts of generated records
    end_time=$(date +%s)
    elapsed_time=$((end_time - start_time))
    log_message "Test data generation completed in $elapsed_time seconds."

    exit 0
}

# Execute main function
main "$@"