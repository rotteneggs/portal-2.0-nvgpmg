#!/bin/bash
#
# backup-database.sh - MySQL Database Backup Script for Student Admissions Enrollment Platform
#
# This script performs automated backups of the MySQL database, encrypts the backups,
# and uploads them to AWS S3 for secure storage. It supports configurable retention
# periods and sends notifications upon completion.
#
# Usage: ./backup-database.sh [--env=<environment>] [--retention=<days>] [--no-cleanup] [--help]
#
# Options:
#   --env=<environment>   Override environment setting (dev, staging, production)
#   --retention=<days>    Override retention period
#   --no-cleanup          Skip cleanup of old backups
#   --help                Display usage information
#
# Environment variables:
#   DB_HOST               Database hostname
#   DB_PORT               Database port
#   DB_DATABASE           Database name
#   DB_USERNAME           Database username
#   DB_PASSWORD           Database password
#   S3_BACKUP_BUCKET      S3 bucket for backups
#   AWS_PROFILE           AWS profile to use (optional)
#   AWS_REGION            AWS region (optional)
#   ENCRYPTION_KEY        Key for backup encryption
#   RETENTION_DAYS        Number of days to retain backups
#   SNS_TOPIC_ARN         ARN for notification topic (optional)
#
# Created: 2023-10-31
# Author: Platform Engineering Team
#
# Security notice:
# - This script requires access to database credentials
# - Encryption key should be securely managed
# - Appropriate AWS IAM permissions are required
#

# Exit on any error
set -e

# Global variables
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
BACKEND_DIR="$PROJECT_ROOT/src/backend"
BACKUP_DIR="$PROJECT_ROOT/backups/database"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DATE_YMD=$(date +"%Y%m%d")
LOG_FILE="$LOG_DIR/database-backup-$TIMESTAMP.log"

# Default values
ENVIRONMENT="development"
RETENTION_DAYS=30
SKIP_CLEANUP=false

# Function to log messages
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local message="$timestamp - $1"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# Function to check required dependencies
check_dependencies() {
    local missing_deps=false
    
    # Check for mysqldump
    if ! command -v mysqldump &> /dev/null; then
        log_message "ERROR: mysqldump is not installed"
        missing_deps=true
    fi
    
    # Check for aws CLI
    if ! command -v aws &> /dev/null; then
        log_message "ERROR: AWS CLI is not installed"
        missing_deps=true
    fi
    
    # Check for openssl
    if ! command -v openssl &> /dev/null; then
        log_message "ERROR: openssl is not installed"
        missing_deps=true
    fi
    
    # Check for gzip
    if ! command -v gzip &> /dev/null; then
        log_message "ERROR: gzip is not installed"
        missing_deps=true
    fi
    
    if [ "$missing_deps" = true ]; then
        return 1
    fi
    
    return 0
}

# Function to load environment variables
load_env_variables() {
    local env_file="$BACKEND_DIR/.env"
    
    if [ ! -f "$env_file" ]; then
        log_message "ERROR: .env file not found at $env_file"
        return 1
    fi
    
    log_message "Loading environment variables from $env_file"
    
    # Source the .env file
    set -a
    . "$env_file"
    set +a
    
    # Check required environment variables
    if [ -z "$DB_HOST" ] || [ -z "$DB_DATABASE" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
        log_message "ERROR: Missing required database environment variables"
        return 1
    fi
    
    # Set default port if not specified
    DB_PORT=${DB_PORT:-3306}
    
    # Check for encryption key
    if [ -z "$ENCRYPTION_KEY" ]; then
        log_message "ERROR: Missing ENCRYPTION_KEY environment variable"
        return 1
    fi
    
    # Check for S3 bucket
    if [ -z "$S3_BACKUP_BUCKET" ]; then
        log_message "WARNING: S3_BACKUP_BUCKET not set, using default bucket name"
        S3_BACKUP_BUCKET="student-admissions-backups-$ENVIRONMENT"
    fi
    
    return 0
}

# Function to create backup directory
create_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_message "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        
        # Secure the directory
        chmod 750 "$BACKUP_DIR"
    fi
    
    if [ ! -d "$LOG_DIR" ]; then
        log_message "Creating log directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
        
        # Secure the directory
        chmod 750 "$LOG_DIR"
    fi
    
    return 0
}

# Function to perform database backup
perform_database_backup() {
    local backup_filename="$DB_DATABASE-$ENVIRONMENT-$TIMESTAMP"
    local backup_file="$BACKUP_DIR/$backup_filename.sql"
    local compressed_file="$backup_file.gz"
    local encrypted_file="$compressed_file.enc"
    
    log_message "Starting database backup: $DB_DATABASE"
    
    # Create MySQL options file for secure authentication
    local mysql_opts_file=$(mktemp)
    echo "[client]" > "$mysql_opts_file"
    echo "host=$DB_HOST" >> "$mysql_opts_file"
    echo "port=$DB_PORT" >> "$mysql_opts_file"
    echo "user=$DB_USERNAME" >> "$mysql_opts_file"
    echo "password=$DB_PASSWORD" >> "$mysql_opts_file"
    chmod 600 "$mysql_opts_file"
    
    # Perform the database dump
    log_message "Running mysqldump..."
    mysqldump --defaults-file="$mysql_opts_file" \
        --single-transaction \
        --quick \
        --add-drop-table \
        --extended-insert \
        --routines \
        --triggers \
        --events \
        "$DB_DATABASE" > "$backup_file"
    
    # Remove the temp options file
    rm -f "$mysql_opts_file"
    
    # Check if backup was successful
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR: Database backup failed"
        return ""
    fi
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    log_message "Database backup completed: $backup_size"
    
    # Compress the backup
    log_message "Compressing backup file..."
    gzip -f "$backup_file"
    
    if [ ! -f "$compressed_file" ]; then
        log_message "ERROR: Compression failed"
        return ""
    fi
    
    local compressed_size=$(du -h "$compressed_file" | cut -f1)
    log_message "Compression completed: $compressed_size"
    
    # Encrypt the backup
    log_message "Encrypting backup file..."
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$compressed_file" \
        -out "$encrypted_file" \
        -pass pass:"$ENCRYPTION_KEY"
    
    if [ ! -f "$encrypted_file" ]; then
        log_message "ERROR: Encryption failed"
        return ""
    fi
    
    local encrypted_size=$(du -h "$encrypted_file" | cut -f1)
    log_message "Encryption completed: $encrypted_size"
    
    # Remove the unencrypted files
    rm -f "$backup_file" "$compressed_file"
    
    # Return the path to the encrypted file
    echo "$encrypted_file"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR: Backup file not found for verification"
        return 1
    fi
    
    local file_size=$(stat -c%s "$backup_file")
    
    # Check if the file size is reasonable (> 1KB)
    if [ "$file_size" -lt 1024 ]; then
        log_message "ERROR: Backup file appears to be too small: $file_size bytes"
        return 1
    fi
    
    log_message "Verifying backup encryption..."
    
    # Create a temporary file for testing decryption
    local temp_dir=$(mktemp -d)
    local test_file="$temp_dir/test_decryption"
    
    # Try to decrypt a small portion of the file (header only)
    if ! openssl enc -aes-256-cbc -d -salt -pbkdf2 \
         -in "$backup_file" \
         -out "$test_file" \
         -pass pass:"$ENCRYPTION_KEY" 2>/dev/null; then
        log_message "ERROR: Backup file decryption test failed"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    
    log_message "Backup verification passed"
    return 0
}

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_message "ERROR: Backup file not found for upload"
        return 1
    fi
    
    local filename=$(basename "$backup_file")
    local s3_path="s3://$S3_BACKUP_BUCKET/$ENVIRONMENT/$DATE_YMD/$filename"
    
    log_message "Uploading backup to $s3_path"
    
    # Set AWS profile if specified
    local aws_profile_cmd=""
    if [ -n "$AWS_PROFILE" ]; then
        aws_profile_cmd="--profile $AWS_PROFILE"
    fi
    
    # Set AWS region if specified
    local aws_region_cmd=""
    if [ -n "$AWS_REGION" ]; then
        aws_region_cmd="--region $AWS_REGION"
    fi
    
    # Upload to S3
    if ! aws $aws_profile_cmd $aws_region_cmd s3 cp "$backup_file" "$s3_path"; then
        log_message "ERROR: Failed to upload backup to S3"
        return 1
    fi
    
    log_message "Backup successfully uploaded to S3"
    return 0
}

# Function to clean up old backups
cleanup_old_backups() {
    if [ "$SKIP_CLEANUP" = true ]; then
        log_message "Skipping cleanup of old backups (--no-cleanup flag set)"
        return 0
    fi
    
    log_message "Cleaning up local backup files..."
    
    # Remove local backup files
    find "$BACKUP_DIR" -type f -name "*.enc" -mtime +1 -delete
    
    log_message "Cleaning up old backups in S3 (retention: $RETENTION_DAYS days)..."
    
    # Set AWS profile if specified
    local aws_profile_cmd=""
    if [ -n "$AWS_PROFILE" ]; then
        aws_profile_cmd="--profile $AWS_PROFILE"
    fi
    
    # Set AWS region if specified
    local aws_region_cmd=""
    if [ -n "$AWS_REGION" ]; then
        aws_region_cmd="--region $AWS_REGION"
    fi
    
    # Get a list of objects older than retention period
    local retention_date=$(date -d "$RETENTION_DAYS days ago" +"%Y-%m-%d")
    
    log_message "Removing backups older than $retention_date"
    
    # Use aws s3 ls and filter objects older than retention date
    aws $aws_profile_cmd $aws_region_cmd s3 ls "s3://$S3_BACKUP_BUCKET/$ENVIRONMENT/" --recursive | \
    while read -r line; do
        local object_date=$(echo "$line" | awk '{print $1}')
        local object_path=$(echo "$line" | awk '{$1=$2=$3=""; print $0}' | sed 's/^[ \t]*//')
        
        if [[ "$(date -d "$object_date" +%s)" -lt "$(date -d "$retention_date" +%s)" ]]; then
            log_message "Removing old backup: $object_path"
            aws $aws_profile_cmd $aws_region_cmd s3 rm "s3://$S3_BACKUP_BUCKET/$object_path"
        fi
    done
    
    log_message "Cleanup completed"
    return 0
}

# Function to send notification
send_notification() {
    local success=$1
    local message=$2
    
    if [ -z "$SNS_TOPIC_ARN" ]; then
        log_message "SNS_TOPIC_ARN not set, skipping notification"
        return 0
    fi
    
    local status="SUCCESS"
    if [ "$success" = false ]; then
        status="FAILURE"
    fi
    
    local subject="[$ENVIRONMENT] Database Backup $status"
    
    log_message "Sending $status notification..."
    
    # Set AWS profile if specified
    local aws_profile_cmd=""
    if [ -n "$AWS_PROFILE" ]; then
        aws_profile_cmd="--profile $AWS_PROFILE"
    fi
    
    # Set AWS region if specified
    local aws_region_cmd=""
    if [ -n "$AWS_REGION" ]; then
        aws_region_cmd="--region $AWS_REGION"
    fi
    
    # Send notification
    if ! aws $aws_profile_cmd $aws_region_cmd sns publish \
         --topic-arn "$SNS_TOPIC_ARN" \
         --subject "$subject" \
         --message "$message"; then
        log_message "Failed to send notification"
    else
        log_message "Notification sent successfully"
    fi
}

# Function to parse command line arguments
parse_arguments() {
    for arg in "$@"; do
        case $arg in
            --env=*)
                ENVIRONMENT="${arg#*=}"
                log_message "Environment set to: $ENVIRONMENT"
                ;;
            --retention=*)
                RETENTION_DAYS="${arg#*=}"
                log_message "Retention period set to: $RETENTION_DAYS days"
                ;;
            --no-cleanup)
                SKIP_CLEANUP=true
                log_message "Cleanup disabled"
                ;;
            --help)
                echo "Usage: $(basename "$0") [OPTIONS]"
                echo
                echo "Options:"
                echo "  --env=<environment>   Override environment setting (dev, staging, production)"
                echo "  --retention=<days>    Override retention period"
                echo "  --no-cleanup          Skip cleanup of old backups"
                echo "  --help                Display this help message"
                echo
                exit 0
                ;;
            *)
                echo "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    local start_time=$(date +%s)
    local exit_code=0
    local backup_file=""
    
    # Parse command line arguments
    parse_arguments "$@"
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    log_message "========== Database Backup Started =========="
    log_message "Environment: $ENVIRONMENT"
    log_message "Retention period: $RETENTION_DAYS days"
    
    # Check dependencies
    log_message "Checking dependencies..."
    if ! check_dependencies; then
        log_message "ERROR: Missing required dependencies"
        send_notification false "Database backup failed: Missing required dependencies"
        return 1
    fi
    
    # Load environment variables
    if ! load_env_variables; then
        log_message "ERROR: Failed to load environment variables"
        send_notification false "Database backup failed: Environment configuration error"
        return 1
    fi
    
    # Create backup directory
    if ! create_backup_directory; then
        log_message "ERROR: Failed to create backup directory"
        send_notification false "Database backup failed: Directory creation error"
        return 1
    fi
    
    # Perform database backup
    backup_file=$(perform_database_backup)
    if [ -z "$backup_file" ]; then
        log_message "ERROR: Database backup failed"
        send_notification false "Database backup failed: Backup creation error"
        return 1
    fi
    
    # Verify backup
    if ! verify_backup "$backup_file"; then
        log_message "ERROR: Backup verification failed"
        send_notification false "Database backup failed: Verification error"
        return 1
    fi
    
    # Upload to S3
    if ! upload_to_s3 "$backup_file"; then
        log_message "ERROR: Failed to upload backup to S3"
        send_notification false "Database backup failed: S3 upload error"
        return 1
    fi
    
    # Cleanup old backups
    if ! cleanup_old_backups; then
        log_message "WARNING: Failed to clean up old backups"
        # Don't exit with error for cleanup failures
    fi
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local duration_formatted=$(printf "%02d:%02d:%02d" $((duration/3600)) $((duration%3600/60)) $((duration%60)))
    
    # Success message
    local success_message="Database backup completed successfully.
Environment: $ENVIRONMENT
Database: $DB_DATABASE
Backup File: $(basename "$backup_file")
Duration: $duration_formatted
Timestamp: $(date)"
    
    log_message "Backup completed successfully in $duration_formatted"
    send_notification true "$success_message"
    
    log_message "========== Database Backup Completed =========="
    return 0
}

# Execute main function
main "$@"
exit $?