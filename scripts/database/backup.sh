#!/bin/bash
# backup.sh - MySQL Database Backup Script for Student Admissions Enrollment Platform
# 
# This script creates compressed and encrypted MySQL database backups and uploads them
# to AWS S3 with appropriate retention policies.
#
# Version: 1.0.0
# AWS CLI version: 2.0+
# MySQL version: 8.0+
# OpenSSL version: 1.1.1+

# Exit on any error
set -e

# Determine script and project directories
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
BACKUP_DIR="$PROJECT_ROOT/backups/database"

# Set timestamp and date variables
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DATE_YMD=$(date +"%Y%m%d")

# Set log directory and file
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/database-backup-$TIMESTAMP.log"

# Default values (can be overridden by environment variables or command line args)
ENVIRONMENT=${ENVIRONMENT:-"production"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
SKIP_CLEANUP=false

# Database connection variables (will be set from .env)
DB_HOST=""
DB_PORT=""
DB_DATABASE=""
DB_USERNAME=""
DB_PASSWORD=""
S3_BUCKET=""
ENCRYPTION_KEY=""
SNS_TOPIC_ARN=""

# Function to log messages to both stdout and log file
log_message() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    local message="[${timestamp}] $1"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# Function to check if required dependencies are installed
check_dependencies() {
    log_message "Checking dependencies..."
    
    # Check for mysqldump
    if ! command -v mysqldump &> /dev/null; then
        log_message "ERROR: mysqldump command not found"
        return 1
    fi
    
    # Check for aws CLI
    if ! command -v aws &> /dev/null; then
        log_message "ERROR: AWS CLI not found"
        return 1
    fi
    
    # Check for openssl
    if ! command -v openssl &> /dev/null; then
        log_message "ERROR: openssl not found"
        return 1
    fi
    
    log_message "All dependencies available"
    return 0
}

# Function to load environment variables from .env file
load_env_variables() {
    log_message "Loading environment variables..."
    
    local env_file="$BACKEND_DIR/.env"
    
    # Check if .env file exists
    if [[ -f "$env_file" ]]; then
        log_message "Loading variables from $env_file"
        
        # Source the .env file to get variables
        source <(grep -v '^#' "$env_file" | sed -E 's/(.*)=(.*)/export \1="\2"/')
        
        # Set database connection variables
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-3306}
        DB_DATABASE=${DB_DATABASE:-admissions}
        DB_USERNAME=${DB_USERNAME:-root}
        DB_PASSWORD=${DB_PASSWORD:-""}
        
        # Set S3 bucket from environment
        S3_BUCKET=${S3_BACKUP_BUCKET:-""}
        
        # Set encryption key
        ENCRYPTION_KEY=${ENCRYPTION_KEY:-""}
        
        # Set SNS topic ARN for notifications
        SNS_TOPIC_ARN=${SNS_TOPIC_ARN:-""}
        
        # Validate required variables
        if [[ -z "$DB_DATABASE" || -z "$DB_USERNAME" ]]; then
            log_message "ERROR: Required database variables not set in .env file"
            return 1
        fi
        
        if [[ -z "$S3_BUCKET" ]]; then
            log_message "ERROR: S3_BACKUP_BUCKET not set in .env file"
            return 1
        fi
        
        if [[ -z "$ENCRYPTION_KEY" ]]; then
            log_message "ERROR: ENCRYPTION_KEY not set in .env file"
            return 1
        fi
        
        log_message "Environment variables loaded successfully"
        return 0
    else
        log_message "ERROR: .env file not found at $env_file"
        return 1
    fi
}

# Function to create backup directory if it doesn't exist
create_backup_directory() {
    log_message "Checking backup directory..."
    
    # Create backup directory if it doesn't exist
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_message "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
    
    # Create log directory if it doesn't exist
    if [[ ! -d "$LOG_DIR" ]]; then
        log_message "Creating log directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
    fi
    
    # Set appropriate permissions
    chmod 750 "$BACKUP_DIR"
    chmod 750 "$LOG_DIR"
    
    log_message "Backup directory is ready"
    return 0
}

# Function to perform database backup
perform_database_backup() {
    log_message "Starting database backup..."
    
    # Generate backup filename with timestamp and environment
    local backup_file="$BACKUP_DIR/${ENVIRONMENT}-${DB_DATABASE}-${TIMESTAMP}"
    local sql_file="${backup_file}.sql"
    local gzip_file="${sql_file}.gz"
    local encrypted_file="${gzip_file}.enc"
    
    log_message "Backing up database: $DB_DATABASE from $DB_HOST:$DB_PORT"
    
    # Build mysqldump command
    local mysqldump_cmd="mysqldump"
    
    # Add connection parameters
    mysqldump_cmd+=" --host=${DB_HOST}"
    mysqldump_cmd+=" --port=${DB_PORT}"
    mysqldump_cmd+=" --user=${DB_USERNAME}"
    
    # Add password if provided
    if [[ -n "$DB_PASSWORD" ]]; then
        mysqldump_cmd+=" --password=${DB_PASSWORD}"
    fi
    
    # Add mysqldump options for a consistent backup
    mysqldump_cmd+=" --single-transaction"
    mysqldump_cmd+=" --routines"
    mysqldump_cmd+=" --triggers"
    mysqldump_cmd+=" --events"
    mysqldump_cmd+=" --set-gtid-purged=OFF"
    mysqldump_cmd+=" --skip-lock-tables"
    mysqldump_cmd+=" --add-drop-table"
    mysqldump_cmd+=" ${DB_DATABASE}"
    
    # Execute mysqldump and capture the output
    log_message "Running mysqldump command..."
    
    # Execute the command and redirect output to file
    eval "$mysqldump_cmd" > "$sql_file" 2>> "$LOG_FILE"
    
    # Check if the dump was successful
    if [[ $? -ne 0 || ! -s "$sql_file" ]]; then
        log_message "ERROR: Database backup failed"
        return 1
    fi
    
    log_message "Database dump completed: $(du -h "$sql_file" | cut -f1)"
    
    # Compress the SQL file
    log_message "Compressing backup file..."
    gzip -9 "$sql_file"
    
    if [[ $? -ne 0 || ! -s "$gzip_file" ]]; then
        log_message "ERROR: Failed to compress backup file"
        return 1
    fi
    
    log_message "Compression completed: $(du -h "$gzip_file" | cut -f1)"
    
    # Encrypt the compressed file
    log_message "Encrypting backup file..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -pass "pass:$ENCRYPTION_KEY" -in "$gzip_file" -out "$encrypted_file"
    
    if [[ $? -ne 0 || ! -s "$encrypted_file" ]]; then
        log_message "ERROR: Failed to encrypt backup file"
        return 1
    fi
    
    log_message "Encryption completed: $(du -h "$encrypted_file" | cut -f1)"
    
    # Remove the compressed file, keeping only the encrypted version
    rm -f "$gzip_file"
    
    # Return the path to the encrypted backup file
    echo "$encrypted_file"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_message "Verifying backup integrity: $(basename "$backup_file")"
    
    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        log_message "ERROR: Backup file does not exist: $backup_file"
        return 1
    fi
    
    # Check if file is not empty
    if [[ ! -s "$backup_file" ]]; then
        log_message "ERROR: Backup file is empty: $backup_file"
        return 1
    fi
    
    # Check if file size is reasonable (at least 1KB)
    local file_size=$(du -k "$backup_file" | cut -f1)
    if [[ $file_size -lt 1 ]]; then
        log_message "ERROR: Backup file is too small: $file_size KB"
        return 1
    fi
    
    # Try to decrypt a small portion to verify encryption key works
    log_message "Testing decryption..."
    if ! openssl enc -aes-256-cbc -d -salt -pbkdf2 -pass "pass:$ENCRYPTION_KEY" -in "$backup_file" -out /dev/null 2>/dev/null; then
        log_message "ERROR: Failed to decrypt backup file - encryption key may be incorrect"
        return 1
    fi
    
    log_message "Backup verification completed successfully"
    return 0
}

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    
    log_message "Uploading backup to S3..."
    
    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        log_message "ERROR: Backup file does not exist: $backup_file"
        return 1
    fi
    
    # Determine S3 path with environment and date prefix
    local filename=$(basename "$backup_file")
    local s3_path="s3://${S3_BUCKET}/${ENVIRONMENT}/daily/${DATE_YMD}/${filename}"
    
    log_message "Uploading to S3: $s3_path"
    
    # Upload file to S3
    if ! aws s3 cp "$backup_file" "$s3_path" --storage-class STANDARD_IA; then
        log_message "ERROR: Failed to upload backup to S3"
        return 1
    fi
    
    log_message "Upload to S3 completed successfully"
    return 0
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_message "Cleaning up old backups..."
    
    # Remove local backup file that was just uploaded
    local local_backup_files=($(find "$BACKUP_DIR" -name "${ENVIRONMENT}-${DB_DATABASE}-*" -type f))
    
    if [[ ${#local_backup_files[@]} -gt 0 ]]; then
        log_message "Removing ${#local_backup_files[@]} local backup files"
        rm -f "${local_backup_files[@]}"
    fi
    
    # Calculate cutoff date for S3 backups
    local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +"%Y-%m-%d")
    log_message "Removing S3 backups older than $cutoff_date"
    
    # List objects in S3 bucket older than retention period
    log_message "Listing old backups in S3..."
    local s3_prefix="${ENVIRONMENT}/daily/"
    
    # Delete old backups from S3 based on retention policy
    aws s3 ls "s3://${S3_BUCKET}/${s3_prefix}" --recursive | grep "${ENVIRONMENT}-${DB_DATABASE}" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_key=$(echo "$line" | awk '{$1=$2=$3=""; print $0}' | sed 's/^[ \t]*//')
            log_message "Deleting old backup: $file_key"
            aws s3 rm "s3://${S3_BUCKET}/${file_key}"
        fi
    done
    
    log_message "Cleanup completed successfully"
    return 0
}

# Function to send notification about backup status
send_notification() {
    local success="$1"
    local message="$2"
    
    # Check if SNS topic ARN is configured
    if [[ -z "$SNS_TOPIC_ARN" ]]; then
        log_message "Skipping notification: SNS_TOPIC_ARN not configured"
        return 0
    fi
    
    log_message "Sending notification to SNS..."
    
    local subject
    if [[ "$success" == true ]]; then
        subject="[${ENVIRONMENT}] Database Backup Successful"
    else
        subject="[${ENVIRONMENT}] Database Backup Failed"
    fi
    
    # Format full message
    local full_message="
    Database: $DB_DATABASE
    Environment: $ENVIRONMENT
    Timestamp: $(date)
    
    $message
    "
    
    # Send notification
    if ! aws sns publish --topic-arn "$SNS_TOPIC_ARN" --subject "$subject" --message "$full_message"; then
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
        case "$arg" in
            --env=*)
                ENVIRONMENT="${arg#*=}"
                ;;
            --retention=*)
                RETENTION_DAYS="${arg#*=}"
                ;;
            --no-cleanup)
                SKIP_CLEANUP=true
                ;;
            --help)
                echo "MySQL Database Backup Script for Student Admissions Enrollment Platform"
                echo ""
                echo "Usage: ./backup.sh [options]"
                echo ""
                echo "Options:"
                echo "  --env=<environment>    Set environment (dev, staging, production)"
                echo "  --retention=<days>     Override retention period (default: 30 days)"
                echo "  --no-cleanup           Skip cleanup of old backups"
                echo "  --help                 Display this help message"
                exit 0
                ;;
        esac
    done
    
    log_message "Environment: $ENVIRONMENT"
    log_message "Retention period: $RETENTION_DAYS days"
    if [[ "$SKIP_CLEANUP" == true ]]; then
        log_message "Cleanup: Disabled"
    else
        log_message "Cleanup: Enabled"
    fi
}

# Main function
main() {
    local exit_code=0
    local backup_file=""
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Initialize log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log_message "=== Database Backup Started ==="
    log_message "Script version: 1.0.0"
    log_message "Date: $(date)"
    
    # Check dependencies
    if ! check_dependencies; then
        log_message "ERROR: Missing required dependencies"
        exit_code=1
        send_notification false "Backup failed: Missing required dependencies"
        exit $exit_code
    fi
    
    # Load environment variables
    if ! load_env_variables; then
        log_message "ERROR: Failed to load environment variables"
        exit_code=1
        send_notification false "Backup failed: Could not load environment variables"
        exit $exit_code
    fi
    
    # Create backup directory
    if ! create_backup_directory; then
        log_message "ERROR: Failed to create backup directory"
        exit_code=1
        send_notification false "Backup failed: Could not create backup directory"
        exit $exit_code
    fi
    
    # Perform database backup
    backup_file=$(perform_database_backup)
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log_message "ERROR: Database backup failed"
        exit_code=1
        send_notification false "Backup failed: Could not create database dump"
        exit $exit_code
    fi
    
    # Verify backup integrity
    if ! verify_backup "$backup_file"; then
        log_message "ERROR: Backup verification failed"
        exit_code=1
        send_notification false "Backup failed: Verification failed, backup may be corrupted"
        exit $exit_code
    fi
    
    # Upload to S3
    if ! upload_to_s3 "$backup_file"; then
        log_message "ERROR: Failed to upload backup to S3"
        exit_code=1
        send_notification false "Backup failed: Could not upload to S3"
        exit $exit_code
    fi
    
    # Cleanup old backups if not disabled
    if [[ "$SKIP_CLEANUP" != true ]]; then
        if ! cleanup_old_backups; then
            log_message "WARNING: Failed to cleanup old backups"
            # Don't fail the entire script for cleanup issues
        fi
    else
        log_message "Skipping cleanup as requested"
    fi
    
    # Send success notification
    local backup_size=$(du -h "$backup_file" | cut -f1)
    send_notification true "Database backup completed successfully. Backup size: $backup_size"
    
    log_message "=== Database Backup Completed Successfully ==="
    return $exit_code
}

# Execute main function with all arguments
main "$@"
exit $?