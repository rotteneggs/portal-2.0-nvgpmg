#!/bin/bash
#
# check-system-health.sh
#
# Comprehensive health check script for the Student Admissions Enrollment Platform
# Checks all system components including web servers, database, Redis, queues, and integrations
# Can be run manually or as a scheduled job to proactively identify issues
#
# Dependencies:
# - curl (latest)
# - jq (latest) 
# - mysql-client (latest)
# - redis-tools (latest)
#
# Usage: ./check-system-health.sh [options]
#

set -eo pipefail

# ===============================================================
# Global Variables
# ===============================================================

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONFIG_FILE=${SCRIPT_DIR}/../../config/monitoring/health-check.conf
LOG_FILE=/var/log/admissions-platform/health-check.log
PROMETHEUS_URL=http://localhost:9090
ALERT_EMAIL=monitoring@admissions.example.com
SLACK_WEBHOOK_URL=""
ENVIRONMENT="production"
VERBOSE=false
EXIT_ON_ERROR=false
HEALTH_CHECK_TIMEOUT=5

# Status tracking
OVERALL_STATUS=0
COMPONENT_STATUSES=()

# ===============================================================
# Helper Functions
# ===============================================================

print_usage() {
  echo "Usage: $(basename "$0") [options]"
  echo
  echo "Comprehensive health check script for the Student Admissions Enrollment Platform"
  echo
  echo "Options:"
  echo "  -c, --config FILE     Path to config file (default: $CONFIG_FILE)"
  echo "  -l, --log-file FILE   Path to log file (default: $LOG_FILE)"
  echo "  -e, --environment ENV Environment to check (default: production)"
  echo "  -v, --verbose         Enable verbose output"
  echo "  -x, --exit-on-error   Exit immediately if any check fails"
  echo "  -t, --timeout SECS    Timeout for health checks in seconds (default: 5)"
  echo "  -h, --help            Display this help message and exit"
  echo
  echo "Example:"
  echo "  $(basename "$0") --environment staging --verbose"
  echo "  $(basename "$0") --config /custom/path/health-check.conf"
}

parse_arguments() {
  local OPTIONS=c:l:e:vxt:h
  local LONGOPTIONS=config:,log-file:,environment:,verbose,exit-on-error,timeout:,help
  
  local PARSED
  PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTIONS --name "$0" -- "$@")
  if [[ $? -ne 0 ]]; then
    echo "Failed to parse arguments" >&2
    print_usage
    exit 1
  fi
  
  eval set -- "$PARSED"
  
  while true; do
    case "$1" in
      -c|--config)
        CONFIG_FILE="$2"
        shift 2
        ;;
      -l|--log-file)
        LOG_FILE="$2"
        shift 2
        ;;
      -e|--environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
      -v|--verbose)
        VERBOSE=true
        shift
        ;;
      -x|--exit-on-error)
        EXIT_ON_ERROR=true
        shift
        ;;
      -t|--timeout)
        HEALTH_CHECK_TIMEOUT="$2"
        shift 2
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      --)
        shift
        break
        ;;
      *)
        echo "Invalid option: $1" >&2
        print_usage
        exit 1
        ;;
    esac
  done
  
  # Validate required files and parameters
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: Config file not found: $CONFIG_FILE" >&2
    exit 1
  fi
  
  # Create log directory if it doesn't exist
  local LOG_DIR=$(dirname "$LOG_FILE")
  if [[ ! -d "$LOG_DIR" ]]; then
    mkdir -p "$LOG_DIR" || {
      echo "Error: Failed to create log directory: $LOG_DIR" >&2
      exit 1
    }
  fi
  
  return 0
}

log_message() {
  local level="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local formatted_message="[$timestamp] [$ENVIRONMENT] [$level] $message"
  
  # Print to stdout if verbose mode is enabled or if it's an error/critical message
  if [[ "$VERBOSE" == "true" ]] || [[ "$level" == "ERROR" ]] || [[ "$level" == "CRITICAL" ]]; then
    echo "$formatted_message"
  fi
  
  # Append to log file
  echo "$formatted_message" >> "$LOG_FILE"
}

send_alert() {
  local subject="$1"
  local message="$2"
  local severity="$3"
  local result=0
  
  # Format the full alert message
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local formatted_message="[$timestamp] [$ENVIRONMENT] [$severity] $subject\n\n$message"
  
  log_message "INFO" "Sending $severity alert: $subject"
  
  # Send email alert if email is configured
  if [[ -n "$ALERT_EMAIL" ]]; then
    echo -e "$formatted_message" | mail -s "[${severity^^}] $ENVIRONMENT: $subject" "$ALERT_EMAIL" || {
      log_message "ERROR" "Failed to send alert email"
      result=1
    }
  fi
  
  # Send Slack alert if webhook is configured
  if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    local color="good"
    if [[ "$severity" == "warning" ]]; then
      color="warning"
    elif [[ "$severity" == "critical" ]]; then
      color="danger"
    fi
    
    local payload=$(cat <<EOF
{
  "attachments": [
    {
      "fallback": "[$ENVIRONMENT] [$severity] $subject",
      "color": "$color",
      "title": "[$ENVIRONMENT] $subject",
      "text": "$message",
      "fields": [
        {
          "title": "Severity",
          "value": "${severity^^}",
          "short": true
        },
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        }
      ],
      "footer": "Admissions Platform Health Check",
      "ts": $(date +%s)
    }
  ]
}
EOF
    )
    
    curl -s -X POST -H "Content-type: application/json" --data "$payload" "$SLACK_WEBHOOK_URL" > /dev/null || {
      log_message "ERROR" "Failed to send alert to Slack"
      result=1
    }
  fi
  
  return $result
}

# ===============================================================
# Component Check Functions
# ===============================================================

check_web_server() {
  local endpoint="$1"
  local timeout="$HEALTH_CHECK_TIMEOUT"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking web server health at $endpoint"
  
  # Make HTTP request to health endpoint
  local http_code
  local response
  local curl_exit_code
  
  response=$(curl -s -o /dev/null -w "%{http_code}" -m "$timeout" "$endpoint" 2>/dev/null)
  curl_exit_code=$?
  
  # Check if curl command succeeded
  if [[ $curl_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to web server at $endpoint (curl error: $curl_exit_code)"
    return 1
  fi
  
  # Check for successful response (HTTP 200)
  if [[ "$response" != "200" ]]; then
    log_message "ERROR" "Web server at $endpoint returned HTTP $response"
    return 1
  fi
  
  # Measure response time
  local response_content
  local response_time_start=$(date +%s.%N)
  response_content=$(curl -s -m "$timeout" "$endpoint" 2>/dev/null)
  local response_time_end=$(date +%s.%N)
  local response_time=$(echo "$response_time_end - $response_time_start" | bc)
  
  # Check response time threshold (500ms)
  if (( $(echo "$response_time > 0.5" | bc -l) )); then
    log_message "WARNING" "Web server response time ($response_time seconds) exceeds threshold (0.5 seconds)"
    status=1
  fi
  
  # Verify response content indicates healthy status (if it's JSON)
  if [[ "$response_content" == *"status"* && "$response_content" != *"ok"* ]]; then
    log_message "ERROR" "Web server reports unhealthy status: $response_content"
    status=1
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "Web server health check passed in $total_time seconds (response time: $response_time seconds)"
  else
    log_message "ERROR" "Web server health check failed in $total_time seconds"
  fi
  
  return $status
}

check_api_server() {
  local endpoint="$1"
  local timeout="$HEALTH_CHECK_TIMEOUT"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking API server health at $endpoint"
  
  # Make HTTP request to API health endpoint
  local response
  local http_code
  local curl_exit_code
  
  response=$(curl -s -w "%{http_code}" -m "$timeout" "$endpoint" 2>/dev/null)
  curl_exit_code=$?
  
  # Extract HTTP code from response
  http_code=${response: -3}
  response=${response:0:${#response}-3}
  
  # Check if curl command succeeded
  if [[ $curl_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to API server at $endpoint (curl error: $curl_exit_code)"
    return 1
  fi
  
  # Check for successful response (HTTP 200)
  if [[ "$http_code" != "200" ]]; then
    log_message "ERROR" "API server at $endpoint returned HTTP $http_code"
    return 1
  fi
  
  # Measure response time
  local response_time_start=$(date +%s.%N)
  local detailed_response
  detailed_response=$(curl -s -m "$timeout" "$endpoint" 2>/dev/null)
  local response_time_end=$(date +%s.%N)
  local response_time=$(echo "$response_time_end - $response_time_start" | bc)
  
  # Check response time threshold (300ms)
  if (( $(echo "$response_time > 0.3" | bc -l) )); then
    log_message "WARNING" "API server response time ($response_time seconds) exceeds threshold (0.3 seconds)"
    status=1
  fi
  
  # Parse JSON response and verify health indicators
  if ! echo "$detailed_response" | jq -e . >/dev/null 2>&1; then
    log_message "ERROR" "API server response is not valid JSON: $detailed_response"
    status=1
  else
    # Check if status is ok
    if [[ "$(echo "$detailed_response" | jq -r '.status // "unknown"')" != "ok" ]]; then
      log_message "ERROR" "API server reports unhealthy status: $(echo "$detailed_response" | jq -r '.status // "unknown"')"
      status=1
    fi
    
    # Check all subsystems if they exist in the response
    local subsystems
    if subsystems=$(echo "$detailed_response" | jq -r '.subsystems // empty' 2>/dev/null); then
      for subsystem in $(echo "$subsystems" | jq -r 'keys[]' 2>/dev/null); do
        local subsystem_status
        subsystem_status=$(echo "$subsystems" | jq -r ".$subsystem.status // \"unknown\"" 2>/dev/null)
        
        if [[ "$subsystem_status" != "ok" ]]; then
          log_message "ERROR" "API subsystem '$subsystem' reports unhealthy status: $subsystem_status"
          status=1
        fi
      done
    fi
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "API server health check passed in $total_time seconds (response time: $response_time seconds)"
  else
    log_message "ERROR" "API server health check failed in $total_time seconds"
  fi
  
  return $status
}

check_database() {
  local host="$1"
  local port="$2"
  local user="$3"
  local password="$4"
  local database="$5"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking database health ($host:$port/$database)"
  
  # Create MySQL defaults file for secure connection
  local mysql_defaults_file
  mysql_defaults_file=$(mktemp)
  chmod 600 "$mysql_defaults_file" || {
    log_message "ERROR" "Failed to set permissions on MySQL defaults file"
    rm -f "$mysql_defaults_file"
    return 1
  }
  
  cat > "$mysql_defaults_file" << EOF
[client]
host=$host
port=$port
user=$user
password=$password
database=$database
EOF
  
  # Attempt to connect to database and execute simple query
  local query_result
  local query_time_start=$(date +%s.%N)
  query_result=$(mysql --defaults-file="$mysql_defaults_file" -e "SELECT 1 AS health_check;" 2>&1)
  local mysql_exit_code=$?
  local query_time_end=$(date +%s.%N)
  local query_time=$(echo "$query_time_end - $query_time_start" | bc)
  
  # Remove the temporary defaults file
  rm -f "$mysql_defaults_file"
  
  # Check if connection succeeded
  if [[ $mysql_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to database: $query_result"
    return 1
  fi
  
  # Check query response time (100ms threshold)
  if (( $(echo "$query_time > 0.1" | bc -l) )); then
    log_message "WARNING" "Database query response time ($query_time seconds) exceeds threshold (0.1 seconds)"
    status=1
  fi
  
  # Check replication status if applicable
  if [[ "$ENVIRONMENT" == "production" ]]; then
    local replication_status
    replication_status=$(mysql --defaults-file="$mysql_defaults_file" -e "SHOW SLAVE STATUS\G" 2>/dev/null)
    
    if [[ -n "$replication_status" ]]; then
      # Extract Slave_IO_Running and Slave_SQL_Running values
      local io_running
      io_running=$(echo "$replication_status" | grep "Slave_IO_Running:" | awk '{print $2}')
      local sql_running
      sql_running=$(echo "$replication_status" | grep "Slave_SQL_Running:" | awk '{print $2}')
      local seconds_behind
      seconds_behind=$(echo "$replication_status" | grep "Seconds_Behind_Master:" | awk '{print $2}')
      
      if [[ "$io_running" != "Yes" || "$sql_running" != "Yes" ]]; then
        log_message "ERROR" "Database replication is not running properly (IO: $io_running, SQL: $sql_running)"
        status=1
      fi
      
      # Check replication lag (10s threshold)
      if [[ "$seconds_behind" != "NULL" && "$seconds_behind" -gt 10 ]]; then
        log_message "WARNING" "Database replication lag ($seconds_behind seconds) exceeds threshold (10 seconds)"
        status=1
      fi
      
      log_message "INFO" "Database replication status: IO=$io_running, SQL=$sql_running, Lag=$seconds_behind seconds"
    fi
  fi
  
  # Check connection pool utilization
  local max_connections
  max_connections=$(mysql --defaults-file="$mysql_defaults_file" -e "SHOW VARIABLES LIKE 'max_connections';" | grep max_connections | awk '{print $2}')
  local current_connections
  current_connections=$(mysql --defaults-file="$mysql_defaults_file" -e "SHOW STATUS LIKE 'Threads_connected';" | grep Threads_connected | awk '{print $2}')
  
  if [[ -n "$max_connections" && -n "$current_connections" ]]; then
    local connection_percentage
    connection_percentage=$(echo "scale=2; $current_connections * 100 / $max_connections" | bc)
    
    if (( $(echo "$connection_percentage > 80" | bc -l) )); then
      log_message "WARNING" "Database connection utilization ($connection_percentage%) exceeds threshold (80%)"
      status=1
    fi
    
    log_message "INFO" "Database connections: $current_connections/$max_connections ($connection_percentage%)"
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "Database health check passed in $total_time seconds (query time: $query_time seconds)"
  else
    log_message "ERROR" "Database health check failed in $total_time seconds"
  fi
  
  return $status
}

check_redis() {
  local host="$1"
  local port="$2"
  local password="$3"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking Redis health ($host:$port)"
  
  # Build Redis CLI command with password if provided
  local redis_cmd="redis-cli -h $host -p $port"
  if [[ -n "$password" ]]; then
    redis_cmd="$redis_cmd -a $password"
  fi
  
  # Execute PING command to verify functionality
  local ping_result
  local ping_time_start=$(date +%s.%N)
  ping_result=$($redis_cmd ping 2>&1)
  local redis_exit_code=$?
  local ping_time_end=$(date +%s.%N)
  local ping_time=$(echo "$ping_time_end - $ping_time_start" | bc)
  
  # Check if connection succeeded
  if [[ $redis_exit_code -ne 0 || "$ping_result" != "PONG" ]]; then
    log_message "ERROR" "Failed to connect to Redis: $ping_result"
    return 1
  fi
  
  # Check command response time (10ms threshold)
  if (( $(echo "$ping_time > 0.01" | bc -l) )); then
    log_message "WARNING" "Redis command response time ($ping_time seconds) exceeds threshold (0.01 seconds)"
    status=1
  fi
  
  # Check memory usage
  local maxmemory
  maxmemory=$($redis_cmd config get maxmemory | grep -v maxmemory)
  local used_memory
  used_memory=$($redis_cmd info memory | grep used_memory: | cut -d ':' -f 2)
  
  if [[ -n "$maxmemory" && -n "$used_memory" && "$maxmemory" != "0" ]]; then
    local memory_percentage
    memory_percentage=$(echo "scale=2; $used_memory * 100 / $maxmemory" | bc)
    
    if (( $(echo "$memory_percentage > 80" | bc -l) )); then
      log_message "WARNING" "Redis memory usage ($memory_percentage%) exceeds threshold (80%)"
      status=1
    fi
    
    log_message "INFO" "Redis memory usage: $used_memory/$maxmemory ($memory_percentage%)"
  else
    log_message "INFO" "Redis memory usage: $used_memory (no maxmemory limit set)"
  fi
  
  # Check key eviction rate
  local evicted_keys
  evicted_keys=$($redis_cmd info stats | grep evicted_keys: | cut -d ':' -f 2)
  
  if [[ -n "$evicted_keys" && "$evicted_keys" -gt 0 ]]; then
    log_message "WARNING" "Redis has evicted keys: $evicted_keys"
    status=1
  }
  
  # Check keyspace info if available
  log_message "INFO" "Redis keyspace information:"
  $redis_cmd info keyspace | grep -v "^#" | while read -r line; do
    if [[ -n "$line" ]]; then
      log_message "INFO" "  $line"
    fi
  done
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "Redis health check passed in $total_time seconds (ping time: $ping_time seconds)"
  else
    log_message "ERROR" "Redis health check failed in $total_time seconds"
  fi
  
  return $status
}

check_queue_workers() {
  local queue_endpoint="$1"
  local timeout="$HEALTH_CHECK_TIMEOUT"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking queue worker health at $queue_endpoint"
  
  # Query queue status endpoint
  local response
  response=$(curl -s -m "$timeout" "$queue_endpoint" 2>/dev/null)
  local curl_exit_code=$?
  
  # Check if curl command succeeded
  if [[ $curl_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to queue status endpoint at $queue_endpoint (curl error: $curl_exit_code)"
    return 1
  fi
  
  # Parse JSON response
  if ! echo "$response" | jq -e . >/dev/null 2>&1; then
    log_message "ERROR" "Queue status response is not valid JSON: $response"
    return 1
  fi
  
  # Check for active worker processes
  local active_workers
  active_workers=$(echo "$response" | jq -r '.workers.active // 0')
  
  if [[ "$active_workers" -lt 1 ]]; then
    log_message "ERROR" "No active queue workers found"
    status=1
  else
    log_message "INFO" "Active queue workers: $active_workers"
  fi
  
  # Check queue depths
  local queues
  if queues=$(echo "$response" | jq -r '.queues // empty' 2>/dev/null); then
    for queue in $(echo "$queues" | jq -r 'keys[]' 2>/dev/null); do
      local queue_size
      queue_size=$(echo "$queues" | jq -r ".$queue.size // 0" 2>/dev/null)
      
      # Verify queue depth is within acceptable limits (1000 per queue)
      if [[ "$queue_size" -gt 1000 ]]; then
        log_message "WARNING" "Queue '$queue' depth ($queue_size) exceeds threshold (1000)"
        status=1
      fi
      
      log_message "INFO" "Queue '$queue' size: $queue_size"
    done
  fi
  
  # Check for failed jobs
  local failed_jobs
  failed_jobs=$(echo "$response" | jq -r '.stats.failed // 0')
  local processed_jobs
  processed_jobs=$(echo "$response" | jq -r '.stats.processed // 0')
  
  if [[ "$processed_jobs" -gt 0 ]]; then
    local failure_percentage
    failure_percentage=$(echo "scale=2; $failed_jobs * 100 / $processed_jobs" | bc)
    
    # Check failure rate (5% threshold)
    if (( $(echo "$failure_percentage > 5" | bc -l) )); then
      log_message "WARNING" "Queue job failure rate ($failure_percentage%) exceeds threshold (5%)"
      status=1
    fi
    
    log_message "INFO" "Queue job statistics: $failed_jobs failed out of $processed_jobs processed ($failure_percentage%)"
  fi
  
  # Check job processing time if available
  local avg_processing_time
  avg_processing_time=$(echo "$response" | jq -r '.stats.avg_processing_time // 0')
  
  if [[ "$avg_processing_time" -gt 30000 ]]; then  # 30 seconds in milliseconds
    log_message "WARNING" "Average job processing time ($(echo "scale=2; $avg_processing_time/1000" | bc)s) exceeds threshold (30s)"
    status=1
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "Queue worker health check passed in $total_time seconds"
  else
    log_message "ERROR" "Queue worker health check failed in $total_time seconds"
  fi
  
  return $status
}

check_storage() {
  local storage_path="$1"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking storage health at $storage_path"
  
  # Check if path exists
  if [[ ! -d "$storage_path" ]]; then
    log_message "ERROR" "Storage path does not exist: $storage_path"
    return 1
  fi
  
  # Check disk space usage
  local disk_usage
  disk_usage=$(df -h "$storage_path" | awk 'NR==2 {print $5}' | sed 's/%//')
  
  if [[ "$disk_usage" -gt 85 ]]; then
    log_message "WARNING" "Storage disk usage ($disk_usage%) exceeds threshold (85%)"
    status=1
  else
    log_message "INFO" "Storage disk usage: $disk_usage%"
  fi
  
  # Verify write permissions by creating test file
  local test_file="$storage_path/.health_check_${RANDOM}.tmp"
  if ! touch "$test_file" 2>/dev/null; then
    log_message "ERROR" "Cannot write to storage path: $storage_path"
    status=1
  else
    # Measure disk I/O performance
    local io_start_time=$(date +%s.%N)
    dd if=/dev/zero of="$test_file" bs=1M count=1 conv=fsync >/dev/null 2>&1
    local io_end_time=$(date +%s.%N)
    local io_time=$(echo "$io_end_time - $io_start_time" | bc)
    
    # Clean up test file
    rm -f "$test_file"
    
    # Check I/O performance (100ms threshold)
    if (( $(echo "$io_time > 0.1" | bc -l) )); then
      log_message "WARNING" "Storage I/O time ($io_time seconds) exceeds threshold (0.1 seconds)"
      status=1
    else
      log_message "INFO" "Storage I/O performance: $io_time seconds for 1MB write"
    fi
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "Storage health check passed in $total_time seconds"
  else
    log_message "ERROR" "Storage health check failed in $total_time seconds"
  fi
  
  return $status
}

check_external_integration() {
  local integration_name="$1"
  local endpoint="$2"
  local timeout="$HEALTH_CHECK_TIMEOUT"
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking $integration_name integration health at $endpoint"
  
  # Make HTTP request to integration health endpoint
  local response_time_start=$(date +%s.%N)
  local response
  response=$(curl -s -m "$timeout" "$endpoint" 2>/dev/null)
  local curl_exit_code=$?
  local response_time_end=$(date +%s.%N)
  local response_time=$(echo "$response_time_end - $response_time_start" | bc)
  
  # Check if curl command succeeded
  if [[ $curl_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to $integration_name integration at $endpoint (curl error: $curl_exit_code)"
    return 1
  fi
  
  # Check response time (1000ms threshold for external integrations)
  if (( $(echo "$response_time > 1.0" | bc -l) )); then
    log_message "WARNING" "$integration_name integration response time ($response_time seconds) exceeds threshold (1.0 seconds)"
    status=1
  }
  
  # Parse JSON response if applicable
  if echo "$response" | jq -e . >/dev/null 2>&1; then
    # It's valid JSON, check for status field
    local integration_status
    integration_status=$(echo "$response" | jq -r '.status // "unknown"')
    
    if [[ "$integration_status" != "ok" && "$integration_status" != "healthy" && "$integration_status" != "up" ]]; then
      log_message "ERROR" "$integration_name integration reports unhealthy status: $integration_status"
      status=1
    }
  else
    # Not JSON, check for simple "OK" or similar in the response
    if [[ "$response" != *"ok"* && "$response" != *"OK"* && "$response" != *"UP"* && "$response" != *"HEALTHY"* ]]; then
      log_message "WARNING" "$integration_name integration response does not clearly indicate healthy status"
      status=1
    fi
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "$integration_name integration health check passed in $total_time seconds (response time: $response_time seconds)"
  else
    log_message "ERROR" "$integration_name integration health check failed in $total_time seconds"
  fi
  
  return $status
}

check_prometheus_alerts() {
  local prometheus_url="$1"
  local start_time=$(date +%s.%N)
  
  log_message "INFO" "Checking active Prometheus alerts at $prometheus_url"
  
  # Query Prometheus API for active alerts
  local response
  response=$(curl -s "${prometheus_url}/api/v1/alerts" 2>/dev/null)
  local curl_exit_code=$?
  
  # Check if curl command succeeded
  if [[ $curl_exit_code -ne 0 ]]; then
    log_message "ERROR" "Failed to connect to Prometheus at $prometheus_url (curl error: $curl_exit_code)"
    return 0  # Return 0 since we don't want to fail the overall check just because we can't check Prometheus
  fi
  
  # Parse JSON response
  if ! echo "$response" | jq -e . >/dev/null 2>&1; then
    log_message "ERROR" "Prometheus response is not valid JSON: $response"
    return 0
  fi
  
  # Count number of active (firing) alerts
  local active_alerts
  active_alerts=$(echo "$response" | jq -r '.data.alerts[] | select(.state=="firing") | .labels.alertname' 2>/dev/null)
  local alert_count
  alert_count=$(echo "$active_alerts" | grep -v '^$' | wc -l)
  
  # Log alert details
  if [[ "$alert_count" -gt 0 ]]; then
    log_message "WARNING" "Found $alert_count active Prometheus alerts"
    echo "$active_alerts" | while read -r alert; do
      if [[ -n "$alert" ]]; then
        log_message "WARNING" "  Active alert: $alert"
      fi
    done
  else
    log_message "INFO" "No active Prometheus alerts found"
  fi
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  log_message "INFO" "Prometheus alerts check completed in $total_time seconds"
  
  return $alert_count
}

check_system_resources() {
  local start_time=$(date +%s.%N)
  local status=0
  
  log_message "INFO" "Checking system resource utilization"
  
  # Check CPU utilization
  local cpu_usage
  if command -v mpstat >/dev/null 2>&1; then
    # Using mpstat if available
    cpu_usage=$(mpstat 1 1 | awk '/^Average:/ {print 100 - $NF}')
  else
    # Fallback to top
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
  fi
  
  if [[ -n "$cpu_usage" ]]; then
    if (( $(echo "$cpu_usage > 85" | bc -l) )); then
      log_message "WARNING" "CPU utilization ($cpu_usage%) exceeds threshold (85%)"
      status=1
    }
    
    log_message "INFO" "CPU utilization: $cpu_usage%"
  else
    log_message "WARNING" "Could not determine CPU utilization"
  fi
  
  # Check memory usage
  local mem_total
  local mem_free
  local mem_buffers
  local mem_cached
  
  if [[ -f /proc/meminfo ]]; then
    mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    mem_free=$(grep MemFree /proc/meminfo | awk '{print $2}')
    mem_buffers=$(grep Buffers /proc/meminfo | awk '{print $2}')
    mem_cached=$(grep "^Cached" /proc/meminfo | awk '{print $2}')
    
    if [[ -n "$mem_total" && -n "$mem_free" && -n "$mem_buffers" && -n "$mem_cached" ]]; then
      local mem_used=$(($mem_total - $mem_free - $mem_buffers - $mem_cached))
      local mem_usage_percent=$(echo "scale=2; $mem_used * 100 / $mem_total" | bc)
      
      if (( $(echo "$mem_usage_percent > 85" | bc -l) )); then
        log_message "WARNING" "Memory usage ($mem_usage_percent%) exceeds threshold (85%)"
        status=1
      }
      
      log_message "INFO" "Memory usage: $mem_usage_percent% ($(($mem_used / 1024)) MB / $(($mem_total / 1024)) MB)"
    else
      log_message "WARNING" "Could not determine memory usage"
    fi
  else
    log_message "WARNING" "Could not access memory information (/proc/meminfo)"
  fi
  
  # Check disk space on all mounted volumes
  log_message "INFO" "Checking disk space on mounted volumes:"
  df -h | grep -v "^Filesystem" | while read -r line; do
    local disk_usage_percent
    disk_usage_percent=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    local mount_point
    mount_point=$(echo "$line" | awk '{print $6}')
    
    if [[ "$disk_usage_percent" -gt 85 ]]; then
      log_message "WARNING" "Disk usage for $mount_point ($disk_usage_percent%) exceeds threshold (85%)"
      status=1
    } else {
      log_message "INFO" "  $mount_point: $disk_usage_percent%"
    }
  done
  
  # Check network interface statistics
  if [[ -d /sys/class/net ]]; then
    log_message "INFO" "Checking network interfaces:"
    
    for iface in /sys/class/net/*; do
      local if_name
      if_name=$(basename "$iface")
      
      # Skip loopback interface
      if [[ "$if_name" == "lo" ]]; then
        continue
      fi
      
      # Check if interface is up
      local if_status
      if_status=$(cat "$iface/operstate" 2>/dev/null)
      
      if [[ "$if_status" != "up" ]]; then
        log_message "WARNING" "Network interface $if_name is not up (state: $if_status)"
        continue
      }
      
      # Check error counters if available
      if [[ -f "$iface/statistics/rx_errors" && -f "$iface/statistics/tx_errors" ]]; then
        local rx_errors
        rx_errors=$(cat "$iface/statistics/rx_errors" 2>/dev/null)
        local tx_errors
        tx_errors=$(cat "$iface/statistics/tx_errors" 2>/dev/null)
        local rx_packets
        rx_packets=$(cat "$iface/statistics/rx_packets" 2>/dev/null)
        local tx_packets
        tx_packets=$(cat "$iface/statistics/tx_packets" 2>/dev/null)
        
        if [[ -n "$rx_errors" && -n "$tx_errors" && -n "$rx_packets" && -n "$tx_packets" ]]; then
          local total_packets=$(($rx_packets + $tx_packets))
          local total_errors=$(($rx_errors + $tx_errors))
          
          if [[ "$total_packets" -gt 0 ]]; then
            local error_rate
            error_rate=$(echo "scale=4; $total_errors * 100 / $total_packets" | bc)
            
            if (( $(echo "$error_rate > 0.1" | bc -l) )); then
              log_message "WARNING" "Network interface $if_name error rate ($error_rate%) exceeds threshold (0.1%)"
              status=1
            } else {
              log_message "INFO" "  $if_name: error rate $error_rate% (errors: $total_errors, packets: $total_packets)"
            }
          else {
            log_message "INFO" "  $if_name: no packets transmitted"
          }
        else {
          log_message "INFO" "  $if_name: could not read error statistics"
        }
      else {
        log_message "INFO" "  $if_name: up (no detailed statistics available)"
      }
    done
  else {
    log_message "WARNING" "Could not access network interface statistics"
  }
  
  local end_time=$(date +%s.%N)
  local total_time=$(echo "$end_time - $start_time" | bc)
  
  if [[ $status -eq 0 ]]; then
    log_message "INFO" "System resource check passed in $total_time seconds"
  else
    log_message "ERROR" "System resource check found issues in $total_time seconds"
  fi
  
  return $status
}

generate_health_report() {
  local check_results="$1"
  local report=""
  local overall_health="✅ HEALTHY"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Determine overall health status
  if echo "$check_results" | grep -q "ERROR"; then
    overall_health="❌ CRITICAL"
  elif echo "$check_results" | grep -q "WARNING"; then
    overall_health="⚠️ WARNING"
  fi
  
  # Format report header
  report+="===================================================\n"
  report+="Student Admissions Enrollment Platform - Health Check Report\n"
  report+="===================================================\n"
  report+="Time: $timestamp\n"
  report+="Environment: $ENVIRONMENT\n"
  report+="Overall Status: $overall_health\n"
  report+="===================================================\n\n"
  
  # Format sections for each component type
  report+="SUMMARY BY COMPONENT:\n"
  report+="---------------------------------------------------\n"
  
  # Web/API Servers
  local web_status="✅ HEALTHY"
  if echo "$check_results" | grep "Web server" | grep -q "ERROR\|WARNING"; then
    web_status="❌ ISSUES DETECTED"
  fi
  report+="Web/API Servers: $web_status\n"
  
  # Database
  local db_status="✅ HEALTHY"
  if echo "$check_results" | grep "Database" | grep -q "ERROR\|WARNING"; then
    db_status="❌ ISSUES DETECTED"
  fi
  report+="Database: $db_status\n"
  
  # Redis Cache
  local redis_status="✅ HEALTHY"
  if echo "$check_results" | grep "Redis" | grep -q "ERROR\|WARNING"; then
    redis_status="❌ ISSUES DETECTED"
  fi
  report+="Redis Cache: $redis_status\n"
  
  # Queue Workers
  local queue_status="✅ HEALTHY"
  if echo "$check_results" | grep "Queue" | grep -q "ERROR\|WARNING"; then
    queue_status="❌ ISSUES DETECTED"
  fi
  report+="Queue Workers: $queue_status\n"
  
  # Storage
  local storage_status="✅ HEALTHY"
  if echo "$check_results" | grep "Storage" | grep -q "ERROR\|WARNING"; then
    storage_status="❌ ISSUES DETECTED"
  fi
  report+="Storage: $storage_status\n"
  
  # External Integrations
  local integration_status="✅ HEALTHY"
  if echo "$check_results" | grep "integration" | grep -q "ERROR\|WARNING"; then
    integration_status="❌ ISSUES DETECTED"
  fi
  report+="External Integrations: $integration_status\n"
  
  # System Resources
  local resource_status="✅ HEALTHY"
  if echo "$check_results" | grep "resource" | grep -q "ERROR\|WARNING"; then
    resource_status="❌ ISSUES DETECTED"
  fi
  report+="System Resources: $resource_status\n\n"
  
  # Include details for issues
  if [[ "$overall_health" != "✅ HEALTHY" ]]; then
    report+="DETECTED ISSUES:\n"
    report+="---------------------------------------------------\n"
    
    # Extract all warnings and errors
    echo "$check_results" | grep -E "WARNING|ERROR" | while read -r line; do
      report+="$line\n"
    done
    report+="\n"
  fi
  
  # Include Prometheus alerts if any
  local alert_count
  alert_count=$(echo "$check_results" | grep "active Prometheus alerts" | grep -oE '[0-9]+')
  if [[ -n "$alert_count" && "$alert_count" -gt 0 ]]; then
    report+="ACTIVE ALERTS:\n"
    report+="---------------------------------------------------\n"
    echo "$check_results" | grep "Active alert:" | while read -r line; do
      report+="$line\n"
    done
    report+="\n"
  fi
  
  # Add performance metrics summary
  report+="PERFORMANCE METRICS:\n"
  report+="---------------------------------------------------\n"
  
  # Extract response times
  local web_response_time
  web_response_time=$(echo "$check_results" | grep "Web server.*response time" | grep -oE '[0-9]+\.[0-9]+ seconds')
  if [[ -n "$web_response_time" ]]; then
    report+="Web Response Time: $web_response_time\n"
  fi
  
  local api_response_time
  api_response_time=$(echo "$check_results" | grep "API server.*response time" | grep -oE '[0-9]+\.[0-9]+ seconds')
  if [[ -n "$api_response_time" ]]; then
    report+="API Response Time: $api_response_time\n"
  fi
  
  local db_query_time
  db_query_time=$(echo "$check_results" | grep "Database.*query time" | grep -oE '[0-9]+\.[0-9]+ seconds')
  if [[ -n "$db_query_time" ]]; then
    report+="Database Query Time: $db_query_time\n"
  fi
  
  local redis_ping_time
  redis_ping_time=$(echo "$check_results" | grep "Redis.*ping time" | grep -oE '[0-9]+\.[0-9]+ seconds')
  if [[ -n "$redis_ping_time" ]]; then
    report+="Redis Command Time: $redis_ping_time\n"
  fi
  
  # Add resource utilization
  local cpu_usage
  cpu_usage=$(echo "$check_results" | grep "CPU utilization" | grep -oE '[0-9]+(\.[0-9]+)?%')
  if [[ -n "$cpu_usage" ]]; then
    report+="CPU Utilization: $cpu_usage\n"
  fi
  
  local mem_usage
  mem_usage=$(echo "$check_results" | grep "Memory usage" | grep -oE '[0-9]+(\.[0-9]+)?%')
  if [[ -n "$mem_usage" ]]; then
    report+="Memory Usage: $mem_usage\n"
  fi
  
  report+="===================================================\n"
  report+="End of Health Check Report\n"
  report+="===================================================\n"
  
  echo -e "$report"
}

# ===============================================================
# Main Function
# ===============================================================

main() {
  local check_results=""
  local total_status=0
  
  # Parse command line arguments
  parse_arguments "$@"
  
  # Load configuration from config file
  if [[ -f "$CONFIG_FILE" ]]; then
    log_message "INFO" "Loading configuration from $CONFIG_FILE"
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
  fi
  
  # Log script start
  log_message "INFO" "Starting health check in $ENVIRONMENT environment"
  
  # Create a temporary file to collect check results
  local results_file
  results_file=$(mktemp)
  
  # Check web server health
  log_message "INFO" "Performing web server health checks" | tee -a "$results_file"
  check_web_server "https://admissions.example.com/health" >> "$results_file" 2>&1
  web_status=$?
  total_status=$((total_status + web_status))
  COMPONENT_STATUSES+=("Web Server:$web_status")
  
  # Check API server health
  log_message "INFO" "Performing API server health checks" | tee -a "$results_file"
  check_api_server "https://api.admissions.example.com/v1/health" >> "$results_file" 2>&1
  api_status=$?
  total_status=$((total_status + api_status))
  COMPONENT_STATUSES+=("API Server:$api_status")
  
  # Check database health (using values from config or environment variables)
  log_message "INFO" "Performing database health checks" | tee -a "$results_file"
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-3306}
  DB_USERNAME=${DB_USERNAME:-root}
  DB_PASSWORD=${DB_PASSWORD:-}
  DB_DATABASE=${DB_DATABASE:-admissions}
  
  check_database "$DB_HOST" "$DB_PORT" "$DB_USERNAME" "$DB_PASSWORD" "$DB_DATABASE" >> "$results_file" 2>&1
  db_status=$?
  total_status=$((total_status + db_status))
  COMPONENT_STATUSES+=("Database:$db_status")
  
  # Check Redis health
  log_message "INFO" "Performing Redis health checks" | tee -a "$results_file"
  REDIS_HOST=${REDIS_HOST:-localhost}
  REDIS_PORT=${REDIS_PORT:-6379}
  REDIS_PASSWORD=${REDIS_PASSWORD:-}
  
  check_redis "$REDIS_HOST" "$REDIS_PORT" "$REDIS_PASSWORD" >> "$results_file" 2>&1
  redis_status=$?
  total_status=$((total_status + redis_status))
  COMPONENT_STATUSES+=("Redis:$redis_status")
  
  # Check queue worker health
  log_message "INFO" "Performing queue worker health checks" | tee -a "$results_file"
  check_queue_workers "https://api.admissions.example.com/v1/queues/status" >> "$results_file" 2>&1
  queue_status=$?
  total_status=$((total_status + queue_status))
  COMPONENT_STATUSES+=("Queue Workers:$queue_status")
  
  # Check storage health
  log_message "INFO" "Performing storage health checks" | tee -a "$results_file"
  check_storage "/var/www/html/storage" >> "$results_file" 2>&1
  storage_status=$?
  total_status=$((total_status + storage_status))
  COMPONENT_STATUSES+=("Storage:$storage_status")
  
  # Check external integrations health
  log_message "INFO" "Performing external integration health checks" | tee -a "$results_file"
  
  # SIS integration
  check_external_integration "SIS" "https://sis.example.com/api/health" >> "$results_file" 2>&1
  sis_status=$?
  total_status=$((total_status + sis_status))
  COMPONENT_STATUSES+=("SIS Integration:$sis_status")
  
  # LMS integration
  check_external_integration "LMS" "https://lms.example.com/api/health" >> "$results_file" 2>&1
  lms_status=$?
  total_status=$((total_status + lms_status))
  COMPONENT_STATUSES+=("LMS Integration:$lms_status")
  
  # Payment Gateway integration
  check_external_integration "Payment Gateway" "https://payments.example.com/api/status" >> "$results_file" 2>&1
  payment_status=$?
  total_status=$((total_status + payment_status))
  COMPONENT_STATUSES+=("Payment Gateway:$payment_status")
  
  # Check system resources
  log_message "INFO" "Performing system resource checks" | tee -a "$results_file"
  check_system_resources >> "$results_file" 2>&1
  resources_status=$?
  total_status=$((total_status + resources_status))
  COMPONENT_STATUSES+=("System Resources:$resources_status")
  
  # Check Prometheus alerts
  log_message "INFO" "Checking Prometheus alerts" | tee -a "$results_file"
  check_prometheus_alerts "$PROMETHEUS_URL" >> "$results_file" 2>&1
  alerts_count=$?
  COMPONENT_STATUSES+=("Prometheus Alerts:$alerts_count")
  
  # Read results and generate health report
  check_results=$(cat "$results_file")
  health_report=$(generate_health_report "$check_results")
  
  # Output health report
  echo
  echo -e "$health_report"
  
  # Clean up temporary file
  rm -f "$results_file"
  
  # Send alerts if any components unhealthy
  if [[ $total_status -gt 0 ]]; then
    local severity="warning"
    if [[ $total_status -gt 3 ]]; then
      severity="critical"
    fi
    
    local alert_subject="Health Check Alert: Issues detected in $ENVIRONMENT environment"
    send_alert "$alert_subject" "$health_report" "$severity"
    
    log_message "WARNING" "Health check completed with issues ($total_status components unhealthy)"
  else
    log_message "INFO" "Health check completed successfully (all components healthy)"
  fi
  
  # Return overall status
  return $total_status
}

# Execute main function if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
  exit $?
fi