#!/usr/bin/env bash
#
# Database Restoration Script for Student Admissions Enrollment Platform
# 
# This script retrieves encrypted database backups from AWS S3, decrypts them,
# and restores them to the target database with appropriate validation and safety checks.
#
# Usage:
#   ./restore.sh [options]
#
# Options:
#   --env=<environment>     Specify environment (dev, staging, production)
#   --backup-file=<file>    Specify backup file to restore
#   --latest                Use the latest available backup
#   --no-backup             Skip backing up current database
#   --no-migrations         Skip running migrations after restore
#   --force                 Skip confirmation prompts
#   --help                  Display this help message
#

# Exit on error
set -e

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
RESTORE_DIR="$PROJECT_ROOT/restore/database"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/database-restore-$TIMESTAMP.log"

# Default values
ENVIRONMENT=""
BACKUP_FILE=""
USE_LATEST=false
SKIP_BACKUP=false
SKIP_MIGRATIONS=false
FORCE=false
SHOW_HELP=false

# Function to log messages to both stdout and log file
log_message() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local message="[$timestamp] $1"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# Function to check if required dependencies are installed
check_dependencies() {
    log_message "Checking dependencies..."
    
    # Check for mysql client
    if ! command -v mysql &> /dev/null; then
        log_message "ERROR: mysql client is not installed"
        return 1
    fi
    
    # Check for aws CLI
    if ! command -v aws &> /dev/null; then
        log_message "ERROR: aws CLI is not installed"
        return 1
    fi
    
    # Check for openssl
    if ! command -v openssl &> /dev/null; then
        log_message "ERROR: openssl is not installed"
        return 1
    fi
    
    # Check for required environment variables
    if [[ -z "$ENVIRONMENT" ]]; then
        log_message "ERROR: ENVIRONMENT is not set"
        return 1
    fi
    
    log_message "All dependencies are available"
    return 0
}

# Function to load environment variables from .env file
load_env_variables() {
    local env_file="$BACKEND_DIR/.env"
    
    if [[ -f "$env_file" ]]; then
        log_message "Loading environment variables from $env_file"
        # Source the .env file to load variables
        source <(grep -v '^#' "$env_file" | sed 's/^export //')
    else
        log_message "WARNING: .env file not found at $env_file"
    fi
    
    # Set database connection details from environment variables
    DB_HOST=${DB_HOST:-"localhost"}
    DB_PORT=${DB_PORT:-"3306"}
    DB_DATABASE=${DB_DATABASE:-""}
    DB_USERNAME=${DB_USERNAME:-""}
    DB_PASSWORD=${DB_PASSWORD:-""}
    S3_BUCKET=${S3_BACKUP_BUCKET:-""}
    ENCRYPTION_KEY=${ENCRYPTION_KEY:-""}
    
    # Validate required environment variables
    if [[ -z "$DB_DATABASE" || -z "$DB_USERNAME" || -z "$DB_PASSWORD" ]]; then
        log_message "ERROR: Database connection details are not properly set"
        return 1
    fi
    
    if [[ -z "$S3_BUCKET" ]]; then
        log_message "ERROR: S3_BACKUP_BUCKET is not set"
        return 1
    fi
    
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        log_message "ERROR: ENCRYPTION_KEY is not set"
        return 1
    fi
    
    log_message "Environment variables loaded successfully"
    log_message "Database: $DB_DATABASE on $DB_HOST:$DB_PORT"
    log_message "Environment: $ENVIRONMENT"
    
    return 0
}

# Function to create restore directory if it doesn't exist
create_restore_directory() {
    if [[ ! -d "$RESTORE_DIR" ]]; then
        log_message "Creating restore directory: $RESTORE_DIR"
        mkdir -p "$RESTORE_DIR"
    fi
    
    if [[ ! -d "$LOG_DIR" ]]; then
        log_message "Creating log directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
    fi
    
    # Set appropriate permissions
    chmod 700 "$RESTORE_DIR"
    chmod 700 "$LOG_DIR"
    
    log_message "Restore directory ready: $RESTORE_DIR"
    return 0
}

# Function to list available backups in S3
list_available_backups() {
    log_message "Listing available backups for environment: $ENVIRONMENT"
    
    local s3_prefix="$ENVIRONMENT"
    local backup_list=$(aws s3 ls "s3://$S3_BUCKET/$s3_prefix/" | grep -E '\.sql\.gz\.enc$' | sort)
    
    if [[ -z "$backup_list" ]]; then
        log_message "No backups found for environment: $ENVIRONMENT"
        return 1
    fi
    
    log_message "Available backups:"
    local count=1
    local backups=()
    
    while IFS= read -r line; do
        local date=$(echo "$line" | awk '{print $1}')
        local time=$(echo "$line" | awk '{print $2}')
        local file=$(echo "$line" | awk '{print $4}')
        
        echo "  $count) $file ($date $time)"
        backups+=("$file")
        ((count++))
    done <<< "$backup_list"
    
    # If latest flag is set, use the last backup
    if [[ "$USE_LATEST" = true ]]; then
        BACKUP_FILE="${backups[-1]}"
        log_message "Using latest backup: $BACKUP_FILE"
        return 0
    fi
    
    # If not in force mode, prompt user to select a backup
    if [[ "$FORCE" = false ]]; then
        local selection
        echo
        echo "Please select a backup to restore (1-$((count-1))) or 'q' to quit:"
        read -r selection
        
        if [[ "$selection" = "q" ]]; then
            log_message "Restoration canceled by user"
            exit 0
        fi
        
        if ! [[ "$selection" =~ ^[0-9]+$ ]] || (( selection < 1 || selection >= count )); then
            log_message "ERROR: Invalid selection"
            return 1
        fi
        
        BACKUP_FILE="${backups[$((selection-1))]}"
    elif [[ -z "$BACKUP_FILE" ]]; then
        # In force mode with no backup file specified, use the latest
        BACKUP_FILE="${backups[-1]}"
    fi
    
    log_message "Selected backup: $BACKUP_FILE"
    return 0
}

# Function to download backup from S3
download_backup_from_s3() {
    local backup_file="$1"
    local s3_path="s3://$S3_BUCKET/$ENVIRONMENT/$backup_file"
    local local_path="$RESTORE_DIR/$backup_file"
    
    log_message "Downloading backup from S3: $s3_path"
    
    if ! aws s3 cp "$s3_path" "$local_path"; then
        log_message "ERROR: Failed to download backup from S3"
        return 1
    fi
    
    if [[ ! -f "$local_path" ]]; then
        log_message "ERROR: Downloaded file not found at $local_path"
        return 1
    fi
    
    log_message "Backup downloaded successfully to $local_path"
    echo "$local_path"
    return 0
}

# Function to decrypt backup
decrypt_backup() {
    local encrypted_file="$1"
    
    if [[ ! -f "$encrypted_file" ]]; then
        log_message "ERROR: Encrypted file not found: $encrypted_file"
        return 1
    fi
    
    local decrypted_file="${encrypted_file%.enc}"
    
    log_message "Decrypting backup file: $encrypted_file"
    
    if ! openssl aes-256-cbc -d -salt -in "$encrypted_file" -out "$decrypted_file" -pass "pass:$ENCRYPTION_KEY"; then
        log_message "ERROR: Failed to decrypt backup file"
        return 1
    fi
    
    if [[ ! -f "$decrypted_file" ]]; then
        log_message "ERROR: Decrypted file not found at $decrypted_file"
        return 1
    fi
    
    log_message "Backup decrypted successfully to $decrypted_file"
    echo "$decrypted_file"
    return 0
}

# Function to decompress backup
decompress_backup() {
    local compressed_file="$1"
    
    if [[ ! -f "$compressed_file" ]]; then
        log_message "ERROR: Compressed file not found: $compressed_file"
        return 1
    fi
    
    local decompressed_file="${compressed_file%.gz}"
    
    log_message "Decompressing backup file: $compressed_file"
    
    if ! gunzip -c "$compressed_file" > "$decompressed_file"; then
        log_message "ERROR: Failed to decompress backup file"
        return 1
    fi
    
    if [[ ! -f "$decompressed_file" ]]; then
        log_message "ERROR: Decompressed file not found at $decompressed_file"
        return 1
    fi
    
    log_message "Backup decompressed successfully to $decompressed_file"
    echo "$decompressed_file"
    return 0
}

# Function to verify backup integrity
verify_backup_integrity() {
    local sql_file="$1"
    
    if [[ ! -f "$sql_file" ]]; then
        log_message "ERROR: SQL file not found: $sql_file"
        return 1
    fi
    
    log_message "Verifying backup integrity: $sql_file"
    
    # Check if file is empty
    if [[ ! -s "$sql_file" ]]; then
        log_message "ERROR: SQL file is empty"
        return 1
    fi
    
    # Check if file contains MySQL dump signature
    if ! grep -q "MySQL dump" "$sql_file"; then
        log_message "ERROR: File does not appear to be a valid MySQL dump"
        return 1
    fi
    
    # Check for critical table definitions
    local critical_tables=("users" "applications" "documents" "workflow_stages" "workflow_transitions")
    local missing_tables=()
    
    for table in "${critical_tables[@]}"; do
        if ! grep -q "Table structure for table \`$table\`" "$sql_file"; then
            missing_tables+=("$table")
        fi
    done
    
    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        log_message "WARNING: The following critical tables may be missing from the backup:"
        for table in "${missing_tables[@]}"; do
            log_message "  - $table"
        done
        
        if [[ "$FORCE" = false ]]; then
            echo
            echo "The backup may be incomplete. Continue anyway? (y/n)"
            local response
            read -r response
            
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                log_message "Restoration canceled by user due to backup integrity concerns"
                return 1
            fi
        fi
    fi
    
    log_message "Backup integrity verification passed"
    return 0
}

# Function to backup current database
backup_current_database() {
    if [[ "$SKIP_BACKUP" = true ]]; then
        log_message "Skipping backup of current database (--no-backup flag used)"
        return 0
    fi
    
    local backup_file="$RESTORE_DIR/pre_restore_${DB_DATABASE}_${TIMESTAMP}.sql"
    
    log_message "Creating backup of current database before restoration"
    log_message "Backup target: $backup_file"
    
    if ! mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > "$backup_file" 2>/dev/null; then
        log_message "ERROR: Failed to create backup of current database"
        return 1
    fi
    
    if [[ ! -f "$backup_file" || ! -s "$backup_file" ]]; then
        log_message "ERROR: Database backup file is empty or not created"
        return 1
    fi
    
    # Compress the backup
    log_message "Compressing current database backup"
    if ! gzip "$backup_file"; then
        log_message "WARNING: Failed to compress current database backup"
    else
        backup_file="${backup_file}.gz"
    fi
    
    log_message "Current database backed up successfully to $backup_file"
    echo "$backup_file"
    return 0
}

# Function to restore database
restore_database() {
    local sql_file="$1"
    
    if [[ ! -f "$sql_file" ]]; then
        log_message "ERROR: SQL file not found: $sql_file"
        return 1
    fi
    
    log_message "Preparing to restore database $DB_DATABASE from $sql_file"
    
    # Confirm restoration if not in force mode
    if [[ "$FORCE" = false ]]; then
        echo
        echo "WARNING: This will overwrite the current database ($DB_DATABASE)."
        echo "Are you sure you want to proceed with the restoration? (y/n)"
        local response
        read -r response
        
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_message "Restoration canceled by user"
            return 1
        fi
    fi
    
    log_message "Restoring database $DB_DATABASE"
    
    # Execute restoration
    if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" < "$sql_file"; then
        log_message "ERROR: Failed to restore database"
        return 1
    fi
    
    log_message "Database restored successfully"
    return 0
}

# Function to run migrations
run_migrations() {
    if [[ "$SKIP_MIGRATIONS" = true ]]; then
        log_message "Skipping database migrations (--no-migrations flag used)"
        return 0
    fi
    
    log_message "Running database migrations"
    
    # Change to backend directory
    cd "$BACKEND_DIR"
    
    # Run Laravel migrations
    if ! php artisan migrate --force; then
        log_message "ERROR: Failed to run database migrations"
        return 1
    fi
    
    log_message "Database migrations completed successfully"
    return 0
}

# Function to cleanup temp files
cleanup_temp_files() {
    log_message "Cleaning up temporary files"
    
    # Find all files in the restore directory older than 3 days
    local old_files=$(find "$RESTORE_DIR" -type f -mtime +3)
    
    if [[ -n "$old_files" ]]; then
        log_message "Removing the following old files:"
        while IFS= read -r file; do
            log_message "  - $file"
            rm -f "$file"
        done <<< "$old_files"
    fi
    
    log_message "Temporary files cleaned up successfully"
    return 0
}

# Function to send notification
send_notification() {
    local success="$1"
    local message="$2"
    
    if [[ -z "$SNS_TOPIC_ARN" ]]; then
        log_message "Skipping notification (SNS_TOPIC_ARN not set)"
        return 0
    fi
    
    local subject
    if [[ "$success" = true ]]; then
        subject="✅ Database restoration successful - $ENVIRONMENT"
    else
        subject="❌ Database restoration failed - $ENVIRONMENT"
    fi
    
    log_message "Sending notification: $subject"
    
    if ! aws sns publish --topic-arn "$SNS_TOPIC_ARN" --subject "$subject" --message "$message"; then
        log_message "ERROR: Failed to send notification"
        return 1
    fi
    
    log_message "Notification sent successfully"
    return 0
}

# Function to parse command line arguments
parse_arguments() {
    local args=("$@")
    
    for arg in "${args[@]}"; do
        case $arg in
            --env=*)
                ENVIRONMENT="${arg#*=}"
                ;;
            --backup-file=*)
                BACKUP_FILE="${arg#*=}"
                ;;
            --latest)
                USE_LATEST=true
                ;;
            --no-backup)
                SKIP_BACKUP=true
                ;;
            --no-migrations)
                SKIP_MIGRATIONS=true
                ;;
            --force)
                FORCE=true
                ;;
            --help)
                SHOW_HELP=true
                ;;
            *)
                log_message "WARNING: Unknown argument: $arg"
                ;;
        esac
    done
}

# Function to display help
show_help() {
    cat << EOF
Database Restoration Script for Student Admissions Enrollment Platform

Usage:
  ./restore.sh [options]

Options:
  --env=<environment>     Specify environment (dev, staging, production)
  --backup-file=<file>    Specify backup file to restore
  --latest                Use the latest available backup
  --no-backup             Skip backing up current database
  --no-migrations         Skip running migrations after restore
  --force                 Skip confirmation prompts
  --help                  Display this help message

Examples:
  ./restore.sh --env=staging --latest
  ./restore.sh --env=production --backup-file=production-20230315-120000.sql.gz.enc
  ./restore.sh --env=dev --latest --no-migrations

Required environment variables (can be in .env file):
  DB_HOST                 Database hostname
  DB_PORT                 Database port
  DB_DATABASE             Database name
  DB_USERNAME             Database username
  DB_PASSWORD             Database password
  S3_BACKUP_BUCKET        S3 bucket for backups
  ENCRYPTION_KEY          Key for backup decryption

Optional environment variables:
  AWS_PROFILE             AWS profile to use
  AWS_REGION              AWS region
  SNS_TOPIC_ARN           ARN for notification topic
EOF
}

# Main function
main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Show help if requested
    if [[ "$SHOW_HELP" = true ]]; then
        show_help
        exit 0
    fi
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Initialize log file
    echo "Database Restoration Log - Started at $(date)" > "$LOG_FILE"
    
    log_message "===== Database Restoration Started ====="
    log_message "Script version: 1.0.0"
    log_message "Timestamp: $TIMESTAMP"
    
    # Check dependencies
    if ! check_dependencies; then
        log_message "ERROR: Dependency check failed"
        send_notification false "Database restoration failed during dependency check for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Load environment variables
    if ! load_env_variables; then
        log_message "ERROR: Failed to load environment variables"
        send_notification false "Database restoration failed while loading environment variables for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Create restore directory
    if ! create_restore_directory; then
        log_message "ERROR: Failed to create restore directory"
        send_notification false "Database restoration failed while creating restore directory for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Get backup file
    if [[ -z "$BACKUP_FILE" || "$USE_LATEST" = true ]]; then
        if ! list_available_backups; then
            log_message "ERROR: Failed to list available backups"
            send_notification false "Database restoration failed while listing available backups for environment $ENVIRONMENT at $(date)"
            exit 1
        fi
    fi
    
    # Download backup from S3
    local local_encrypted_file
    if ! local_encrypted_file=$(download_backup_from_s3 "$BACKUP_FILE"); then
        log_message "ERROR: Failed to download backup from S3"
        send_notification false "Database restoration failed while downloading backup for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Decrypt backup
    local decrypted_file
    if ! decrypted_file=$(decrypt_backup "$local_encrypted_file"); then
        log_message "ERROR: Failed to decrypt backup"
        send_notification false "Database restoration failed while decrypting backup for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Decompress backup
    local sql_file
    if ! sql_file=$(decompress_backup "$decrypted_file"); then
        log_message "ERROR: Failed to decompress backup"
        send_notification false "Database restoration failed while decompressing backup for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Verify backup integrity
    if ! verify_backup_integrity "$sql_file"; then
        log_message "ERROR: Backup integrity verification failed"
        send_notification false "Database restoration failed during integrity verification for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Backup current database
    local current_backup
    if ! current_backup=$(backup_current_database); then
        if [[ "$FORCE" = false ]]; then
            log_message "ERROR: Failed to backup current database"
            send_notification false "Database restoration failed while backing up current database for environment $ENVIRONMENT at $(date)"
            exit 1
        else
            log_message "WARNING: Failed to backup current database, continuing anyway (force mode)"
        fi
    fi
    
    # Restore database
    if ! restore_database "$sql_file"; then
        log_message "ERROR: Failed to restore database"
        send_notification false "Database restoration failed during database restore for environment $ENVIRONMENT at $(date)"
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        log_message "ERROR: Failed to run migrations"
        send_notification false "Database restoration was successful but migrations failed for environment $ENVIRONMENT at $(date)"
        # Don't exit with error, as the restoration itself was successful
    fi
    
    # Cleanup temporary files
    if ! cleanup_temp_files; then
        log_message "WARNING: Failed to cleanup temporary files"
        # Non-critical error, continue
    fi
    
    # Send success notification
    send_notification true "Database restoration completed successfully for environment $ENVIRONMENT at $(date). Backup file: $BACKUP_FILE"
    
    log_message "===== Database Restoration Completed Successfully ====="
    return 0
}

# Call main function with all script arguments
main "$@"
exit $?