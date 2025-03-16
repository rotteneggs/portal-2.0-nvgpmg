#!/bin/bash

# Description: Shell script for setting up the development environment for the Student Admissions Enrollment Platform.
# This script automates the installation of dependencies, configuration of environment files, database initialization, and Docker container setup for local development.

# Requirements Addressed:
# - Development Environment: Provides automated setup of the development environment with appropriate configuration
# - Containerization: Sets up Docker containers for local development with appropriate configurations
# - Database Initialization: Initializes the database with schema and seed data for development
# - Environment Configuration: Configures environment variables for local development

# Globals:
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../" && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
FRONTEND_DIR="$PROJECT_ROOT/src/web"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker/docker-compose.dev.yml"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/setup-dev-environment-$(date +"%Y%m%d-%H%M%S").log"
ENVIRONMENT=""  # Environment name (dev, staging, test) from command line or default
DATA_VOLUME=""  # Amount of test data to generate (small, medium, large)
DOCKER_CONTAINER="" # Name of the backend Docker container if using Docker
SKIP_DEPENDENCIES=false # Flag to skip dependency checks
SKIP_DOCKER=false # Flag to skip Docker container setup
SKIP_MIGRATIONS=false # Flag to skip database migrations
SKIP_SEEDING=false # Flag to skip database seeding
WITH_TEST_DATA=false # Flag to generate additional test data
TEST_DATA_VOLUME="" # Amount of test data to generate (small, medium, large)
FORCE=false # Flag to skip all confirmations

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

    # Check if docker is installed
    if ! command -v docker &> /dev/null
    then
        log_message "Error: docker is not installed. Please install docker before running this script."
        return 1
    fi

    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null
    then
        log_message "Error: docker-compose is not installed. Please install docker-compose before running this script."
        return 1
    fi

    # Check if git is installed
    if ! command -v git &> /dev/null
    then
        log_message "Error: git is not installed. Please install git before running this script."
        return 1
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

# Function: setup_backend_env
# Description: Sets up the backend .env file from the template
# Returns:
#   True if setup was successful, false otherwise
setup_backend_env() {
    log_message "Setting up backend .env file..."

    # Check if .env file already exists
    if [ -f "$BACKEND_DIR/.env" ]; then
        log_message ".env file already exists in backend directory."
    else
        # Copy .env.example to .env
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        if [ $? -ne 0 ]; then
            log_message "Error: Failed to copy .env.example to .env"
            return 1
        fi
        log_message ".env file created successfully."
    fi

    # Generate Laravel application key
    if ! grep -q "APP_KEY=" "$BACKEND_DIR/.env"; then
        log_message "Generating Laravel application key..."
        php "$BACKEND_DIR/artisan" key:generate
        if [ $? -ne 0 ]; then
            log_message "Error: Failed to generate Laravel application key."
            return 1
        fi
        log_message "Laravel application key generated successfully."
    fi

    # Update database connection settings for Docker
    sed -i "s/DB_HOST=127.0.0.1/DB_HOST=mysql/g" "$BACKEND_DIR/.env"
    sed -i "s/DB_PORT=3306/DB_PORT=3306/g" "$BACKEND_DIR/.env"
    sed -i "s/DB_DATABASE=laravel/DB_DATABASE=admissions_platform/g" "$BACKEND_DIR/.env"
    sed -i "s/DB_USERNAME=root/DB_USERNAME=admissions_user/g" "$BACKEND_DIR/.env"
    sed -i "s/DB_PASSWORD=/DB_PASSWORD=admissions_password/g" "$BACKEND_DIR/.env"

    # Update Redis connection settings for Docker
    sed -i "s/REDIS_HOST=127.0.0.1/REDIS_HOST=redis/g" "$BACKEND_DIR/.env"
    sed -i "s/REDIS_PORT=6379/REDIS_PORT=6379/g" "$BACKEND_DIR/.env"
    sed -i "s/REDIS_PASSWORD=null/REDIS_PASSWORD=/g" "$BACKEND_DIR/.env"

    # Update other environment-specific settings
    sed -i "s/APP_DEBUG=false/APP_DEBUG=true/g" "$BACKEND_DIR/.env"
    sed -i "s/APP_URL=http:\/\/localhost/APP_URL=http:\/\/localhost:8000/g" "$BACKEND_DIR/.env"

    log_message "Backend .env file setup successfully."
    return 0
}

# Function: setup_frontend_env
# Description: Sets up the frontend .env file from the template
# Returns:
#   True if setup was successful, false otherwise
setup_frontend_env() {
    log_message "Setting up frontend .env file..."

    # Check if .env file already exists
    if [ -f "$FRONTEND_DIR/.env.local" ]; then
        log_message ".env.local file already exists in frontend directory."
    else
        # Copy .env.development to .env.local
        cp "$FRONTEND_DIR/.env.development" "$FRONTEND_DIR/.env.local"
        if [ $? -ne 0 ]; then
            log_message "Error: Failed to copy .env.development to .env.local"
            return 1
        fi
        log_message ".env.local file created successfully."
    fi

    # Update API base URL to point to Docker backend service
    sed -i "s#REACT_APP_API_BASE_URL=.*#REACT_APP_API_BASE_URL=http://localhost:8000/api#" "$FRONTEND_DIR/.env.local"

    # Update WebSocket URL to point to Docker backend service
    sed -i "s#REACT_APP_WEBSOCKET_URL=.*#REACT_APP_WEBSOCKET_URL=ws://localhost:8000#" "$FRONTEND_DIR/.env.local"

    log_message "Frontend .env file setup successfully."
    return 0
}

# Function: start_docker_containers
# Description: Starts the Docker containers for development
# Returns:
#   True if containers started successfully, false otherwise
start_docker_containers() {
    log_message "Starting Docker containers..."

    # Navigate to the project root directory
    cd "$PROJECT_ROOT" || exit 1

    # Run docker-compose with the development configuration file
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to start Docker containers."
        return 1
    fi

    # Wait for containers to be healthy
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f

    log_message "Docker containers started successfully."
    return 0
}

# Function: install_backend_dependencies
# Description: Installs PHP dependencies for the backend
# Returns:
#   True if installation was successful, false otherwise
install_backend_dependencies() {
    log_message "Installing backend dependencies..."

    # Execute composer install in the backend container
    docker exec -i "$DOCKER_CONTAINER" bash -c "cd /var/www/html && composer install"
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to install backend dependencies."
        return 1
    fi

    log_message "Backend dependencies installed successfully."
    return 0
}

# Function: install_frontend_dependencies
# Description: Installs Node.js dependencies for the frontend
# Returns:
#   True if installation was successful, false otherwise
install_frontend_dependencies() {
    log_message "Installing frontend dependencies..."

    # Execute npm install in the frontend container
    docker exec -i "$DOCKER_CONTAINER" bash -c "cd /app && npm install"
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to install frontend dependencies."
        return 1
    fi

    log_message "Frontend dependencies installed successfully."
    return 0
}

# Function: run_database_migrations
# Description: Runs database migrations to set up the schema
# Returns:
#   True if migrations were successful, false otherwise
run_database_migrations() {
    log_message "Running database migrations..."

    # Execute Laravel migration command in the backend container
    docker exec -i "$DOCKER_CONTAINER" bash -c "cd /var/www/html && php artisan migrate"
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to run database migrations."
        return 1
    fi

    log_message "Database migrations ran successfully."
    return 0
}

# Function: seed_database
# Description: Seeds the database with initial data
# Returns:
#   True if seeding was successful, false otherwise
seed_database() {
    log_message "Seeding database with initial data..."

    # Execute Laravel database seeding command in the backend container
    docker exec -i "$DOCKER_CONTAINER" bash -c "cd /var/www/html && php artisan db:seed"
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to seed database."
        return 1
    fi

    log_message "Database seeded successfully."
    return 0
}

# Function: generate_test_data
# Description: Generates additional test data for development
# Parameters:
#   $1 - volume: The amount of test data to generate (small, medium, large)
# Returns:
#   True if data generation was successful, false otherwise
generate_test_data() {
    local volume="$1"
    log_message "Generating test data (volume: $volume)..."

    # Execute the seed-test-data.sh script with appropriate parameters
    bash "$SCRIPT_DIR/database/seed-test-data.sh" --env="$ENVIRONMENT" --volume="$volume" --docker="$DOCKER_CONTAINER"
    if [ $? -ne 0 ]; then
        log_message "Error: Failed to generate test data."
        return 1
    fi

    log_message "Test data generated successfully."
    return 0
}

# Function: display_success_message
# Description: Displays a success message with instructions for accessing the application
display_success_message() {
    log_message "*******************************************************************"
    log_message "*                                                                 *"
    log_message "*      Student Admissions Enrollment Platform - Setup Complete     *"
    log_message "*                                                                 *"
    log_message "*******************************************************************"
    log_message ""
    log_message "Access the application using the following URLs:"
    log_message "  - Frontend: http://localhost:3000"
    log_message "  - Backend API: http://localhost:8000/api"
    log_message "  - phpMyAdmin: http://localhost:8080"
    log_message ""
    log_message "Default Login Credentials:"
    log_message "  - Username: admin@example.com"
    log_message "  - Password: password"
    log_message ""
    log_message "Common Development Tasks:"
    log_message "  - Run backend tests: docker exec -it $DOCKER_CONTAINER bash -c 'cd /var/www/html && php artisan test'"
    log_message "  - Run frontend tests: docker exec -it $DOCKER_CONTAINER bash -c 'cd /app && npm test'"
    log_message "  - Access Laravel Tinker: docker exec -it $DOCKER_CONTAINER bash -c 'cd /var/www/html && php artisan tinker'"
    log_message ""
    log_message "To stop the environment, run: docker-compose -f $DOCKER_COMPOSE_FILE down"
    log_message ""
    log_message "Happy developing!"
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
            --skip-dependencies)
                SKIP_DEPENDENCIES=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --skip-seeding)
                SKIP_SEEDING=true
                shift
                ;;
            --with-test-data)
                WITH_TEST_DATA=true
                shift
                ;;
            --test-data-volume=*)
                TEST_DATA_VOLUME="${key#*=}"
                shift
                ;;
            --force)
                FORCE=true
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
    [ "$SKIP_DEPENDENCIES" = true ] && log_message "Skipping dependency checks"
    [ "$SKIP_DOCKER" = true ] && log_message "Skipping Docker container setup"
    [ "$SKIP_MIGRATIONS" = true ] && log_message "Skipping database migrations"
    [ "$SKIP_SEEDING" = true ] && log_message "Skipping database seeding"
    [ "$WITH_TEST_DATA" = true ] && log_message "Generating additional test data"
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
    echo "  --skip-dependencies      Skip dependency checks"
    echo "  --skip-docker            Skip Docker container setup (use existing containers)"
    echo "  --skip-migrations        Skip database migrations"
    echo "  --skip-seeding           Skip database seeding"
    echo "  --with-test-data         Generate additional test data"
    echo "  --test-data-volume=<size> Amount of test data to generate (small, medium, large)"
    echo "  --force                  Skip all confirmations"
    echo "  --help                   Display this usage information"
    echo ""
    echo "Examples:"
    echo "  $0 --env=dev --volume=small"
    echo "  $0 --env=test --volume=medium --docker=admissions-backend"
    echo "  $0 --env=dev --only=users,applications"
}

# Function: main
# Description: Main function that orchestrates the setup process
# Returns:
#   Exit code (0 for success, non-zero for failure)
main() {
    # Parse command line arguments
    parse_arguments "$@"

    # Initialize script and log start time
    log_message "Starting setup process..."
    start_time=$(date +%s)

    # Check dependencies
    if [ "$SKIP_DEPENDENCIES" = false ]; then
        if ! check_dependencies; then
            exit 1
        fi
    fi

    # Create log directory
    if ! create_log_directory; then
        exit 1
    fi

    # Setup backend environment file
    if ! setup_backend_env; then
        exit 1
    fi

    # Setup frontend environment file
    if ! setup_frontend_env; then
        exit 1
    fi

    # Start Docker containers
    if [ "$SKIP_DOCKER" = false ]; then
        if ! start_docker_containers; then
            exit 1
        fi
    fi

    # Install backend dependencies
    if [ "$SKIP_DOCKER" = false ]; then
        if ! install_backend_dependencies; then
            exit 1
        fi
    fi

    # Install frontend dependencies
    if [ "$SKIP_DOCKER" = false ]; then
        if ! install_frontend_dependencies; then
            exit 1
        fi
    fi

    # Run database migrations
    if [ "$SKIP_MIGRATIONS" = false ]; then
        if ! run_database_migrations; then
            exit 1
        fi
    fi

    # Seed database with initial data
    if [ "$SKIP_SEEDING" = false ]; then
        if ! seed_database; then
            exit 1
        fi
    fi

    # Generate test data if requested
    if [ "$WITH_TEST_DATA" = true ]; then
        if ! generate_test_data "$TEST_DATA_VOLUME"; then
            exit 1
        fi
    fi

    # Display success message and instructions
    display_success_message

    # Log completion and exit with appropriate status code
    end_time=$(date +%s)
    elapsed_time=$((end_time - start_time))
    log_message "Setup process completed in $elapsed_time seconds."

    exit 0
}

# Execute main function
main "$@"