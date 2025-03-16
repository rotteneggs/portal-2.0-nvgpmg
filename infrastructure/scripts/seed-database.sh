#!/bin/bash
# seed-database.sh
#
# This script automates the process of seeding the database with initial data
# for the Student Admissions Enrollment Platform. It runs database migrations
# and seeders to populate the database with roles, permissions, workflow templates,
# and other essential data.
#
# Usage: ./seed-database.sh [options]
#   options:
#     --fresh: Run migrations with fresh option (drops all tables first)
#     --class=SeedClass: Run a specific seeder class
#     --env=environment: Specify the environment (dev, staging, production)
#     --help: Display usage information

# Exit on any error
set -e

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../../" && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
ENV_NAME=${ENV_NAME:-"dev"}
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/seed-database-$(date +%Y%m%d-%H%M%S).log"
FRESH_MIGRATION=false
SEED_CLASS=""

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
Usage: ./seed-database.sh [options]

Seed the database with initial data for the Student Admissions Enrollment Platform.
This script runs migrations and seeders to populate the database with essential data.

Options:
  --fresh                Run migrations with fresh option (drops all tables first)
  --class=SeedClass     Run a specific seeder class
  --env=environment     Specify the environment (dev, staging, production)
  --help                Display this help message

Examples:
  ./seed-database.sh
  ./seed-database.sh --fresh
  ./seed-database.sh --class=RolesAndPermissionsSeeder
  ./seed-database.sh --env=staging

Environment Variables:
  ENV_NAME              Target environment (defaults to "dev")
  DB_HOST               Database host (optional, read from .env)
  DB_PORT               Database port (optional, read from .env)
  DB_DATABASE           Database name (optional, read from .env)
  DB_USERNAME           Database username (optional, read from .env)
  DB_PASSWORD           Database password (optional, read from .env)

EOF
    exit 0
}

check_environment() {
    log_message "Checking environment setup..."
    
    # Check if backend directory exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        return 1
    fi
    
    # Check if .env file exists for the environment
    if [[ ! -f "$BACKEND_DIR/.env.$ENV_NAME" ]] && [[ ! -f "$BACKEND_DIR/.env" ]]; then
        log_error "Environment file not found: neither .env.$ENV_NAME nor .env exists in $BACKEND_DIR"
        log_error "Run initialize-environment.sh first to set up the environment"
        return 1
    fi
    
    # If .env.$ENV_NAME exists, copy it to .env for Laravel to use
    if [[ -f "$BACKEND_DIR/.env.$ENV_NAME" ]]; then
        if [[ ! -f "$BACKEND_DIR/.env" ]] || [[ "$BACKEND_DIR/.env.$ENV_NAME" -nt "$BACKEND_DIR/.env" ]]; then
            log_message "Copying .env.$ENV_NAME to .env for Laravel usage"
            cp "$BACKEND_DIR/.env.$ENV_NAME" "$BACKEND_DIR/.env"
        fi
    fi
    
    # Check if Laravel application is properly installed
    if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
        log_error "Laravel artisan file not found in $BACKEND_DIR"
        return 1
    fi
    
    # Try to check database connection
    cd "$BACKEND_DIR"
    
    if ! php artisan env > /dev/null 2>&1; then
        log_error "Cannot execute artisan commands. Please check your Laravel installation."
        return 1
    fi
    
    log_message "Checking database connection..."
    if ! php artisan db:show --quiet > /dev/null 2>&1; then
        log_error "Cannot connect to the database. Please check your database configuration."
        log_error "Make sure the database exists and is accessible with the provided credentials."
        return 1
    fi
    
    log_success "Environment check passed. Ready to seed the database."
    return 0
}

run_migrations() {
    log_message "Running database migrations..."
    
    cd "$BACKEND_DIR"
    
    local migration_command="php artisan migrate"
    
    # If FRESH_MIGRATION is true, add --fresh option
    if [[ "$FRESH_MIGRATION" == true ]]; then
        log_warning "Using --fresh option. This will drop all tables and recreate them."
        if [[ "$ENV_NAME" == "production" ]]; then
            log_warning "CAUTION: You are about to run fresh migrations in PRODUCTION environment."
            log_warning "This will permanently delete all data in the database."
            read -p "Are you sure you want to continue? (y/N): " confirm
            if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
                log_message "Fresh migration cancelled by user."
                return 1
            fi
            log_warning "Proceeding with fresh migrations in PRODUCTION as confirmed by user."
        elif [[ "$ENV_NAME" == "staging" ]]; then
            log_warning "CAUTION: You are about to run fresh migrations in STAGING environment."
            read -p "Are you sure you want to continue? (y/N): " confirm
            if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
                log_message "Fresh migration cancelled by user."
                return 1
            fi
            log_warning "Proceeding with fresh migrations in STAGING as confirmed by user."
        fi
        migration_command="$migration_command --fresh"
    fi
    
    # Add --force for non-dev environments to bypass confirmation prompts
    if [[ "$ENV_NAME" != "dev" ]]; then
        migration_command="$migration_command --force"
    fi
    
    # Run the migration command
    log_message "Executing: $migration_command"
    if ! eval "$migration_command"; then
        log_error "Migration failed. See error details above."
        return 1
    fi
    
    log_success "Migrations completed successfully."
    return 0
}

run_seeders() {
    log_message "Running database seeders..."
    
    cd "$BACKEND_DIR"
    
    local seeder_command="php artisan db:seed"
    
    # If SEED_CLASS is specified, add --class option
    if [[ -n "$SEED_CLASS" ]]; then
        log_message "Running specific seeder class: $SEED_CLASS"
        seeder_command="$seeder_command --class=$SEED_CLASS"
    else
        # Environment-specific seeder behavior if no specific class is provided
        case "$ENV_NAME" in
            production)
                log_message "Running core seeders for production environment"
                # In production, we only want essential data like roles, permissions, and workflow templates
                seeder_command="$seeder_command --class=CoreProductionSeeder"
                ;;
            staging)
                log_message "Running core seeders for staging environment"
                # In staging, we include core data plus some test data
                seeder_command="$seeder_command --class=CoreStagingSeeder"
                ;;
            dev|*)
                log_message "Running all seeders for development environment"
                # Development environment runs all seeders including test data
                ;;
        esac
    fi
    
    # Add --force for non-dev environments to bypass confirmation prompts
    if [[ "$ENV_NAME" != "dev" ]]; then
        seeder_command="$seeder_command --force"
    fi
    
    # Run the seeder command
    log_message "Executing: $seeder_command"
    if ! eval "$seeder_command"; then
        log_error "Seeding failed. See error details above."
        return 1
    fi
    
    # Run environment-specific post-seeding operations
    case "$ENV_NAME" in
        production)
            log_message "Running production post-seeding operations..."
            # Any production-specific operations after seeding
            # For example, synchronizing specific data with external systems
            ;;
        staging)
            log_message "Running staging post-seeding operations..."
            # Any staging-specific operations after seeding
            ;;
        dev|*)
            log_message "Running development post-seeding operations..."
            # Any development-specific operations after seeding
            # For example, generating additional test data
            ;;
    esac
    
    log_success "Database seeding completed successfully."
    return 0
}

# Parse command-line arguments
parse_arguments() {
    # Process all arguments
    for arg in "$@"; do
        case "$arg" in
            --fresh)
                FRESH_MIGRATION=true
                ;;
            --help)
                display_usage
                ;;
            --class=*)
                SEED_CLASS="${arg#*=}"
                ;;
            --env=*)
                ENV_NAME="${arg#*=}"
                ;;
            *)
                log_error "Unknown option: $arg"
                display_usage
                ;;
        esac
    done
}

# Main function
main() {
    # Parse command-line arguments
    parse_arguments "$@"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Display header
    log_message "==============================================================="
    log_message "  Student Admissions Enrollment Platform - Database Seeding    "
    log_message "==============================================================="
    log_message "Environment: $ENV_NAME"
    log_message "Log file: $LOG_FILE"
    
    # Check environment
    if ! check_environment; then
        log_error "Environment check failed. Cannot proceed with database seeding."
        return 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        log_error "Migration failed. Cannot proceed with database seeding."
        return 1
    fi
    
    # Run seeders
    if ! run_seeders; then
        log_error "Database seeding failed."
        return 1
    fi
    
    log_success "==============================================================="
    log_success "  Database seeding completed successfully!                     "
    log_success "==============================================================="
    
    log_message "Next steps:"
    case "$ENV_NAME" in
        production)
            log_message "  - Verify the seeded data in the production environment"
            log_message "  - Run necessary post-deployment checks"
            ;;
        staging)
            log_message "  - Verify the seeded data in the staging environment"
            log_message "  - Proceed with testing and validation"
            ;;
        dev|*)
            log_message "  - Verify the seeded data in the development environment"
            log_message "  - Continue with local development"
            ;;
    esac
    
    return 0
}

# Execute main function with all arguments
main "$@"
exit $?