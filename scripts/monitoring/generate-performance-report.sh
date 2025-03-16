#!/bin/bash
#
# Performance Report Generator for Student Admissions Enrollment Platform
# 
# This script collects performance metrics from various monitoring systems,
# analyzes the data against defined SLAs, and produces formatted reports
# for different stakeholders.
#
# Dependencies:
# - AWS CLI (aws-cli v2.x): For CloudWatch metrics
# - jq (v1.6+): For JSON processing
# - curl (v7.x+): For HTTP requests
#
# Usage: 
#   ./generate-performance-report.sh [options]
#
# Options:
#   -e, --environment ENV   Set environment (default: production)
#   -d, --date DATE         Generate report for specific date (format: YYYY-MM-DD)
#   -c, --config FILE       Specify custom config file
#   -v, --verbose           Enable verbose output
#   -h, --help              Show this help message
#

# Set up global variables
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
REPORT_DIR="$SCRIPT_DIR/../../reports/performance"
CONFIG_FILE="$SCRIPT_DIR/../../config/monitoring.conf"
DATE_FORMAT="%Y-%m-%d"
CURRENT_DATE=$(date +$DATE_FORMAT)
REPORT_FILE="$REPORT_DIR/performance-report-$CURRENT_DATE.html"
LOG_FILE="$REPORT_DIR/logs/generate-report-$CURRENT_DATE.log"
ENVIRONMENT="${ENVIRONMENT:-production}"
VERBOSE=false

# Log a message to the log file and optionally to stdout
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Format log message
    local formatted_message="[$timestamp] [$level] $message"
    
    # Ensure log directory exists
    local log_dir="$(dirname "$LOG_FILE")"
    if [ ! -d "$log_dir" ]; then
        mkdir -p "$log_dir"
    fi
    
    # Write to log file
    echo "$formatted_message" >> "$LOG_FILE"
    
    # Print to stdout if verbose mode is enabled or level is ERROR
    if [[ "$VERBOSE" == "true" || "$level" == "ERROR" ]]; then
        if [ "$level" == "ERROR" ]; then
            echo "$formatted_message" >&2
        else
            echo "$formatted_message"
        fi
    fi
}

# Check if required dependencies are installed
check_dependencies() {
    log_message "INFO" "Checking dependencies..."
    local missing_deps=0

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_message "ERROR" "AWS CLI is not installed. Please install aws-cli v2.x"
        missing_deps=$((missing_deps + 1))
    else
        local aws_version=$(aws --version | cut -d' ' -f1 | cut -d'/' -f2)
        log_message "INFO" "Found AWS CLI version $aws_version"
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_message "ERROR" "jq is not installed. Please install jq v1.6+"
        missing_deps=$((missing_deps + 1))
    else
        local jq_version=$(jq --version | cut -d'-' -f2)
        log_message "INFO" "Found jq version $jq_version"
    fi

    # Check curl
    if ! command -v curl &> /dev/null; then
        log_message "ERROR" "curl is not installed. Please install curl v7.x+"
        missing_deps=$((missing_deps + 1))
    else
        local curl_version=$(curl --version | head -n 1 | cut -d' ' -f2)
        log_message "INFO" "Found curl version $curl_version"
    fi

    if [ $missing_deps -gt 0 ]; then
        log_message "ERROR" "$missing_deps dependencies are missing. Please install them and try again."
        return 1
    fi

    log_message "INFO" "All dependencies are installed."
    return 0
}

# Load configuration from the config file
load_configuration() {
    log_message "INFO" "Loading configuration from $CONFIG_FILE..."
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_message "ERROR" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    # Source the configuration file
    source "$CONFIG_FILE"
    
    # Validate required configuration parameters
    local required_params=(
        "CLOUDWATCH_NAMESPACE"
        "PROMETHEUS_URL"
        "SLA_PAGE_LOAD_TIME"
        "SLA_API_RESPONSE_TIME"
        "SLA_AVAILABILITY"
        "SLA_DOCUMENT_PROCESSING_TIME"
        "REPORT_RETENTION_DAYS"
        "NOTIFICATION_RECIPIENTS"
    )
    
    local missing_params=0
    for param in "${required_params[@]}"; do
        if [ -z "${!param}" ]; then
            log_message "ERROR" "Missing required configuration parameter: $param"
            missing_params=$((missing_params + 1))
        fi
    done
    
    if [ $missing_params -gt 0 ]; then
        log_message "ERROR" "$missing_params configuration parameters are missing. Please check $CONFIG_FILE"
        return 1
    fi
    
    log_message "INFO" "Configuration loaded successfully."
    return 0
}

# Create necessary directories for reports and logs
setup_directories() {
    log_message "INFO" "Setting up directories..."
    
    # Create report directory if it doesn't exist
    if [ ! -d "$REPORT_DIR" ]; then
        log_message "INFO" "Creating report directory: $REPORT_DIR"
        mkdir -p "$REPORT_DIR"
        if [ $? -ne 0 ]; then
            log_message "ERROR" "Failed to create report directory: $REPORT_DIR"
            return 1
        fi
    fi
    
    # Create logs directory if it doesn't exist
    local log_dir="$(dirname "$LOG_FILE")"
    if [ ! -d "$log_dir" ]; then
        log_message "INFO" "Creating log directory: $log_dir"
        mkdir -p "$log_dir"
        if [ $? -ne 0 ]; then
            log_message "ERROR" "Failed to create log directory: $log_dir"
            return 1
        fi
    fi
    
    # Set appropriate permissions
    chmod -R 755 "$REPORT_DIR"
    
    log_message "INFO" "Directories setup completed."
    return 0
}

# Retrieve metrics from AWS CloudWatch
get_cloudwatch_metrics() {
    local metric_name="$1"
    local start_time="$2"
    local end_time="$3"
    
    log_message "INFO" "Retrieving CloudWatch metric: $metric_name (from $start_time to $end_time)"
    
    # Construct AWS CLI command
    local aws_cmd="aws cloudwatch get-metric-statistics"
    aws_cmd+=" --namespace \"${CLOUDWATCH_NAMESPACE}\""
    aws_cmd+=" --metric-name \"${metric_name}\""
    aws_cmd+=" --start-time \"${start_time}\""
    aws_cmd+=" --end-time \"${end_time}\""
    aws_cmd+=" --period 300"  # 5-minute intervals
    aws_cmd+=" --statistics Average Maximum Minimum Sum"
    
    # Add dimensions if defined in config
    if [ -n "$CLOUDWATCH_DIMENSIONS" ]; then
        aws_cmd+=" --dimensions ${CLOUDWATCH_DIMENSIONS}"
    fi
    
    # Execute AWS CLI command
    log_message "DEBUG" "Executing: $aws_cmd"
    local result=$(eval $aws_cmd 2>&1)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log_message "ERROR" "Failed to retrieve CloudWatch metrics: $result"
        echo "{\"error\": \"Failed to retrieve CloudWatch metrics\", \"details\": \"$result\"}"
        return 1
    fi
    
    # Process and format the response
    local formatted_result=$(echo "$result" | jq -c '.')
    
    log_message "INFO" "Successfully retrieved CloudWatch metrics for $metric_name"
    echo "$formatted_result"
    return 0
}

# Retrieve metrics from Prometheus
get_prometheus_metrics() {
    local query="$1"
    local start_time="$2"
    local end_time="$3"
    local step="$4"
    
    log_message "INFO" "Retrieving Prometheus metrics: '$query' (from $start_time to $end_time, step $step)"
    
    # URL encode the query
    local encoded_query=$(echo "$query" | jq -sRr @uri)
    
    # Construct Prometheus API query URL
    local prom_url="${PROMETHEUS_URL}/api/v1/query_range"
    prom_url+="?query=${encoded_query}"
    prom_url+="&start=${start_time}"
    prom_url+="&end=${end_time}"
    prom_url+="&step=${step}"
    
    # Execute curl command to retrieve metrics
    log_message "DEBUG" "Querying Prometheus: $prom_url"
    local result=$(curl -s -S -k "$prom_url" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log_message "ERROR" "Failed to retrieve Prometheus metrics: $result"
        echo "{\"error\": \"Failed to retrieve Prometheus metrics\", \"details\": \"$result\"}"
        return 1
    fi
    
    # Check if the response is valid JSON and has data
    if ! echo "$result" | jq -e '.data.result' &>/dev/null; then
        log_message "ERROR" "Invalid Prometheus response or no data: $result"
        echo "{\"error\": \"Invalid Prometheus response or no data\", \"details\": \"$result\"}"
        return 1
    fi
    
    # Process and format the response
    local formatted_result=$(echo "$result" | jq -c '.')
    
    log_message "INFO" "Successfully retrieved Prometheus metrics for query: $query"
    echo "$formatted_result"
    return 0
}

# Retrieve application-specific metrics
get_application_metrics() {
    log_message "INFO" "Collecting application metrics..."
    
    # Calculate time range (last 24 hours by default)
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_time=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")
    
    # Initialize metrics collection object
    local app_metrics="{"
    
    # Collect page load time metrics
    log_message "INFO" "Collecting page load time metrics..."
    local page_load_metrics=$(get_cloudwatch_metrics "PageLoadTime" "$start_time" "$end_time")
    app_metrics+="\"pageLoadTime\": $page_load_metrics,"
    
    # Collect API response time metrics
    log_message "INFO" "Collecting API response time metrics..."
    local api_response_metrics=$(get_prometheus_metrics "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{handler!=\"\"}[5m])) by (le, handler))" "$start_time" "$end_time" "5m")
    app_metrics+="\"apiResponseTime\": $api_response_metrics,"
    
    # Collect error rate metrics
    log_message "INFO" "Collecting error rate metrics..."
    local error_rate_metrics=$(get_prometheus_metrics "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))" "$start_time" "$end_time" "5m")
    app_metrics+="\"errorRate\": $error_rate_metrics,"
    
    # Collect successful requests metrics
    log_message "INFO" "Collecting successful requests metrics..."
    local success_metrics=$(get_prometheus_metrics "sum(rate(http_requests_total{status=~\"2..\"}[5m]))" "$start_time" "$end_time" "5m")
    app_metrics+="\"successfulRequests\": $success_metrics,"
    
    # Collect document processing time metrics
    log_message "INFO" "Collecting document processing time metrics..."
    local doc_processing_metrics=$(get_cloudwatch_metrics "DocumentProcessingTime" "$start_time" "$end_time")
    app_metrics+="\"documentProcessingTime\": $doc_processing_metrics,"
    
    # Collect user session metrics
    log_message "INFO" "Collecting user session metrics..."
    local session_metrics=$(get_cloudwatch_metrics "ActiveSessions" "$start_time" "$end_time")
    app_metrics+="\"activeSessions\": $session_metrics"
    
    # Close the JSON object
    app_metrics+="}"
    
    # Validate JSON format
    if ! echo "$app_metrics" | jq -e '.' &>/dev/null; then
        log_message "ERROR" "Failed to generate valid JSON for application metrics"
        return "{\"error\": \"Failed to generate valid JSON for application metrics\"}"
    fi
    
    log_message "INFO" "Application metrics collection completed."
    echo "$app_metrics"
    return 0
}

# Retrieve database performance metrics
get_database_metrics() {
    log_message "INFO" "Collecting database metrics..."
    
    # Calculate time range (last 24 hours by default)
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_time=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")
    
    # Initialize metrics collection object
    local db_metrics="{"
    
    # Collect CPU utilization metrics
    log_message "INFO" "Collecting database CPU utilization metrics..."
    local cpu_metrics=$(get_cloudwatch_metrics "CPUUtilization" "$start_time" "$end_time")
    db_metrics+="\"cpuUtilization\": $cpu_metrics,"
    
    # Collect database connections metrics
    log_message "INFO" "Collecting database connections metrics..."
    local connections_metrics=$(get_cloudwatch_metrics "DatabaseConnections" "$start_time" "$end_time")
    db_metrics+="\"databaseConnections\": $connections_metrics,"
    
    # Collect free storage space metrics
    log_message "INFO" "Collecting database storage metrics..."
    local storage_metrics=$(get_cloudwatch_metrics "FreeStorageSpace" "$start_time" "$end_time")
    db_metrics+="\"freeStorageSpace\": $storage_metrics,"
    
    # Collect read/write latency metrics
    log_message "INFO" "Collecting database read latency metrics..."
    local read_latency_metrics=$(get_cloudwatch_metrics "ReadLatency" "$start_time" "$end_time")
    db_metrics+="\"readLatency\": $read_latency_metrics,"
    
    log_message "INFO" "Collecting database write latency metrics..."
    local write_latency_metrics=$(get_cloudwatch_metrics "WriteLatency" "$start_time" "$end_time")
    db_metrics+="\"writeLatency\": $write_latency_metrics,"
    
    # Collect query performance metrics from Prometheus if available
    if [ -n "$PROMETHEUS_URL" ]; then
        log_message "INFO" "Collecting database query performance metrics..."
        local query_metrics=$(get_prometheus_metrics "sum(rate(mysql_global_status_queries[5m]))" "$start_time" "$end_time" "5m")
        db_metrics+="\"queryRate\": $query_metrics,"
        
        local slow_query_metrics=$(get_prometheus_metrics "sum(rate(mysql_global_status_slow_queries[5m]))" "$start_time" "$end_time" "5m")
        db_metrics+="\"slowQueryRate\": $slow_query_metrics"
    else
        # Remove trailing comma if Prometheus metrics aren't available
        db_metrics=${db_metrics%,}
    fi
    
    # Close the JSON object
    db_metrics+="}"
    
    # Validate JSON format
    if ! echo "$db_metrics" | jq -e '.' &>/dev/null; then
        log_message "ERROR" "Failed to generate valid JSON for database metrics"
        return "{\"error\": \"Failed to generate valid JSON for database metrics\"}"
    fi
    
    log_message "INFO" "Database metrics collection completed."
    echo "$db_metrics"
    return 0
}

# Retrieve Redis performance metrics
get_redis_metrics() {
    log_message "INFO" "Collecting Redis metrics..."
    
    # Calculate time range (last 24 hours by default)
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_time=$(date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")
    
    # Initialize metrics collection object
    local redis_metrics="{"
    
    # Collect CPU utilization metrics
    log_message "INFO" "Collecting Redis CPU utilization metrics..."
    local cpu_metrics=$(get_cloudwatch_metrics "CPUUtilization" "$start_time" "$end_time")
    redis_metrics+="\"cpuUtilization\": $cpu_metrics,"
    
    # Collect memory usage metrics
    log_message "INFO" "Collecting Redis memory usage metrics..."
    local memory_metrics=$(get_cloudwatch_metrics "DatabaseMemoryUsagePercentage" "$start_time" "$end_time")
    redis_metrics+="\"memoryUsage\": $memory_metrics,"
    
    # Collect cache hit ratio metrics
    log_message "INFO" "Collecting Redis cache hit ratio metrics..."
    local hit_ratio_metrics=$(get_cloudwatch_metrics "CacheHitRate" "$start_time" "$end_time")
    redis_metrics+="\"cacheHitRatio\": $hit_ratio_metrics,"
    
    # Collect evictions metrics
    log_message "INFO" "Collecting Redis evictions metrics..."
    local evictions_metrics=$(get_cloudwatch_metrics "Evictions" "$start_time" "$end_time")
    redis_metrics+="\"evictions\": $evictions_metrics,"
    
    # Collect current connections metrics
    log_message "INFO" "Collecting Redis current connections metrics..."
    local commands_metrics=$(get_cloudwatch_metrics "CurrConnections" "$start_time" "$end_time")
    redis_metrics+="\"currentConnections\": $commands_metrics"
    
    # Close the JSON object
    redis_metrics+="}"
    
    # Validate JSON format
    if ! echo "$redis_metrics" | jq -e '.' &>/dev/null; then
        log_message "ERROR" "Failed to generate valid JSON for Redis metrics"
        return "{\"error\": \"Failed to generate valid JSON for Redis metrics\"}"
    fi
    
    log_message "INFO" "Redis metrics collection completed."
    echo "$redis_metrics"
    return 0
}

# Calculate compliance with defined SLAs
calculate_sla_compliance() {
    local metrics_data="$1"
    log_message "INFO" "Calculating SLA compliance..."
    
    # Extract metrics data
    local page_load_data=$(echo "$metrics_data" | jq -r '.pageLoadTime.Datapoints | sort_by(.Timestamp)')
    local api_response_data=$(echo "$metrics_data" | jq -r '.apiResponseTime.data.result[]?.values')
    local doc_processing_data=$(echo "$metrics_data" | jq -r '.documentProcessingTime.Datapoints | sort_by(.Timestamp)')
    
    # Initialize SLA compliance object
    local sla_compliance="{"
    
    # Calculate page load time SLA compliance
    log_message "INFO" "Calculating page load time SLA compliance..."
    local total_page_load_samples=$(echo "$page_load_data" | jq -r 'length')
    local compliant_page_load_samples=$(echo "$page_load_data" | jq -r "[.[] | select(.Average <= ${SLA_PAGE_LOAD_TIME})] | length")
    
    if [ "$total_page_load_samples" -gt 0 ]; then
        local page_load_compliance=$(echo "scale=2; ($compliant_page_load_samples / $total_page_load_samples) * 100" | bc)
        sla_compliance+="\"pageLoadTime\": {\"compliance\": $page_load_compliance, \"threshold\": ${SLA_PAGE_LOAD_TIME}, \"unit\": \"ms\"},"
    else
        sla_compliance+="\"pageLoadTime\": {\"compliance\": 0, \"threshold\": ${SLA_PAGE_LOAD_TIME}, \"unit\": \"ms\", \"error\": \"No data available\"},"
    fi
    
    # Calculate API response time SLA compliance
    log_message "INFO" "Calculating API response time SLA compliance..."
    local api_values=$(echo "$api_response_data" | jq -r '.[] | .[1]')
    local total_api_samples=$(echo "$api_values" | wc -l)
    local compliant_api_samples=$(echo "$api_values" | awk -v threshold="$SLA_API_RESPONSE_TIME" '$1 <= threshold {count++} END {print count}')
    
    if [ "$total_api_samples" -gt 0 ]; then
        local api_compliance=$(echo "scale=2; ($compliant_api_samples / $total_api_samples) * 100" | bc)
        sla_compliance+="\"apiResponseTime\": {\"compliance\": $api_compliance, \"threshold\": ${SLA_API_RESPONSE_TIME}, \"unit\": \"ms\"},"
    else
        sla_compliance+="\"apiResponseTime\": {\"compliance\": 0, \"threshold\": ${SLA_API_RESPONSE_TIME}, \"unit\": \"ms\", \"error\": \"No data available\"},"
    fi
    
    # Calculate document processing time SLA compliance
    log_message "INFO" "Calculating document processing time SLA compliance..."
    local total_doc_samples=$(echo "$doc_processing_data" | jq -r 'length')
    local compliant_doc_samples=$(echo "$doc_processing_data" | jq -r "[.[] | select(.Average <= ${SLA_DOCUMENT_PROCESSING_TIME})] | length")
    
    if [ "$total_doc_samples" -gt 0 ]; then
        local doc_compliance=$(echo "scale=2; ($compliant_doc_samples / $total_doc_samples) * 100" | bc)
        sla_compliance+="\"documentProcessingTime\": {\"compliance\": $doc_compliance, \"threshold\": ${SLA_DOCUMENT_PROCESSING_TIME}, \"unit\": \"seconds\"}"
    else
        sla_compliance+="\"documentProcessingTime\": {\"compliance\": 0, \"threshold\": ${SLA_DOCUMENT_PROCESSING_TIME}, \"unit\": \"seconds\", \"error\": \"No data available\"}"
    fi
    
    # Close the JSON object
    sla_compliance+="}"
    
    # Validate JSON format
    if ! echo "$sla_compliance" | jq -e '.' &>/dev/null; then
        log_message "ERROR" "Failed to generate valid JSON for SLA compliance"
        return "{\"error\": \"Failed to generate valid JSON for SLA compliance\"}"
    fi
    
    log_message "INFO" "SLA compliance calculation completed."
    echo "$sla_compliance"
    return 0
}

# Generate an HTML report from collected metrics
generate_html_report() {
    local app_metrics="$1"
    local db_metrics="$2"
    local redis_metrics="$3"
    local sla_compliance="$4"
    
    log_message "INFO" "Generating HTML report..."
    
    # Create HTML report with header and CSS
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${CURRENT_DATE}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background-color: #f5f5f5;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .report-meta {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .metrics-section {
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
        }
        .sla-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .sla-table th, .sla-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .sla-table th {
            background-color: #f2f2f2;
        }
        .sla-compliant {
            color: #27ae60;
            font-weight: bold;
        }
        .sla-warning {
            color: #f39c12;
            font-weight: bold;
        }
        .sla-violation {
            color: #e74c3c;
            font-weight: bold;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }
        .summary-cards {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }
        .summary-card {
            flex: 1;
            min-width: 200px;
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 15px;
            margin: 0 10px 10px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
            margin-top: 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
            margin: 10px 0;
        }
        footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 0.8em;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <header>
        <h1>Performance Report - Student Admissions Enrollment Platform</h1>
        <p class="report-meta">
            <strong>Environment:</strong> ${ENVIRONMENT} | 
            <strong>Report Date:</strong> ${CURRENT_DATE} | 
            <strong>Reporting Period:</strong> Last 24 Hours
        </p>
    </header>
    
    <div class="metrics-section">
        <h2>SLA Compliance Summary</h2>
        <div class="summary-cards">
EOF

    # Add SLA compliance summary cards
    local page_load_compliance=$(echo "$sla_compliance" | jq -r '.pageLoadTime.compliance')
    local api_compliance=$(echo "$sla_compliance" | jq -r '.apiResponseTime.compliance')
    local doc_compliance=$(echo "$sla_compliance" | jq -r '.documentProcessingTime.compliance')
    
    # Define compliance class based on percentage
    get_compliance_class() {
        local compliance="$1"
        if (( $(echo "$compliance >= 98" | bc -l) )); then
            echo "sla-compliant"
        elif (( $(echo "$compliance >= 90" | bc -l) )); then
            echo "sla-warning"
        else
            echo "sla-violation"
        fi
    }
    
    local page_load_class=$(get_compliance_class "$page_load_compliance")
    local api_class=$(get_compliance_class "$api_compliance")
    local doc_class=$(get_compliance_class "$doc_compliance")
    
    # Add SLA summary cards to the report
    cat >> "$REPORT_FILE" << EOF
            <div class="summary-card">
                <h3>Page Load Time</h3>
                <p>Target: ${SLA_PAGE_LOAD_TIME}ms</p>
                <p class="metric-value ${page_load_class}">${page_load_compliance}%</p>
            </div>
            <div class="summary-card">
                <h3>API Response Time</h3>
                <p>Target: ${SLA_API_RESPONSE_TIME}ms</p>
                <p class="metric-value ${api_class}">${api_compliance}%</p>
            </div>
            <div class="summary-card">
                <h3>Document Processing</h3>
                <p>Target: ${SLA_DOCUMENT_PROCESSING_TIME}s</p>
                <p class="metric-value ${doc_class}">${doc_compliance}%</p>
            </div>
        </div>
        
        <h3>Detailed SLA Metrics</h3>
        <table class="sla-table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Target</th>
                    <th>Current Performance</th>
                    <th>Compliance</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
EOF

    # Function to extract average value from metrics
    get_avg_value() {
        local metrics="$1"
        local metric_path="$2"
        local default="N/A"
        
        local avg_value=$(echo "$metrics" | jq -r "$metric_path" 2>/dev/null || echo "$default")
        echo "$avg_value"
    }
    
    # Extract performance values
    local page_load_avg=$(get_avg_value "$app_metrics" '.pageLoadTime.Datapoints | map(.Average) | add / length')
    local api_response_avg=$(get_avg_value "$app_metrics" '.apiResponseTime.data.result[0].values | map(.[1] | tonumber) | add / length')
    local doc_processing_avg=$(get_avg_value "$app_metrics" '.documentProcessingTime.Datapoints | map(.Average) | add / length')
    
    # Format performance values
    page_load_avg=$(printf "%.2f" "$page_load_avg" 2>/dev/null || echo "N/A")
    api_response_avg=$(printf "%.2f" "$api_response_avg" 2>/dev/null || echo "N/A")
    doc_processing_avg=$(printf "%.2f" "$doc_processing_avg" 2>/dev/null || echo "N/A")
    
    # Add SLA detailed rows to the table
    cat >> "$REPORT_FILE" << EOF
                <tr>
                    <td>Page Load Time</td>
                    <td>&lt; ${SLA_PAGE_LOAD_TIME}ms</td>
                    <td>${page_load_avg}ms</td>
                    <td>${page_load_compliance}%</td>
                    <td class="${page_load_class}">${page_load_compliance >= 98 ? "Compliant" : (page_load_compliance >= 90 ? "Warning" : "Violation")}</td>
                </tr>
                <tr>
                    <td>API Response Time</td>
                    <td>&lt; ${SLA_API_RESPONSE_TIME}ms</td>
                    <td>${api_response_avg}ms</td>
                    <td>${api_compliance}%</td>
                    <td class="${api_class}">${api_compliance >= 98 ? "Compliant" : (api_compliance >= 90 ? "Warning" : "Violation")}</td>
                </tr>
                <tr>
                    <td>Document Processing Time</td>
                    <td>&lt; ${SLA_DOCUMENT_PROCESSING_TIME}s</td>
                    <td>${doc_processing_avg}s</td>
                    <td>${doc_compliance}%</td>
                    <td class="${doc_class}">${doc_compliance >= 98 ? "Compliant" : (doc_compliance >= 90 ? "Warning" : "Violation")}</td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <div class="metrics-section">
        <h2>Application Performance</h2>
        
        <div class="chart-container">
            <canvas id="pageLoadTimeChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="apiResponseTimeChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="errorRateChart"></canvas>
        </div>
    </div>
    
    <div class="metrics-section">
        <h2>Database Performance</h2>
        
        <div class="chart-container">
            <canvas id="dbCpuChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="dbConnectionsChart"></canvas>
        </div>
    </div>
    
    <div class="metrics-section">
        <h2>Redis Cache Performance</h2>
        
        <div class="chart-container">
            <canvas id="redisCpuChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="redisMemoryChart"></canvas>
        </div>
    </div>
    
    <script>
        // Function to format timestamps
        function formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        }
        
        // Parse metrics data from JSON
        const appMetrics = ${app_metrics};
        const dbMetrics = ${db_metrics};
        const redisMetrics = ${redis_metrics};
        
        // Create Page Load Time Chart
        const pageLoadTimeData = appMetrics.pageLoadTime.Datapoints.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
        const pageLoadTimeCtx = document.getElementById('pageLoadTimeChart').getContext('2d');
        new Chart(pageLoadTimeCtx, {
            type: 'line',
            data: {
                labels: pageLoadTimeData.map(d => formatDate(d.Timestamp)),
                datasets: [{
                    label: 'Page Load Time (ms)',
                    data: pageLoadTimeData.map(d => d.Average),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (ms)'
                        }
                    }
                }
            }
        });
        
        // Create more charts for other metrics...
        
    </script>
    
    <footer>
        <p>Generated by Performance Report Generator on ${CURRENT_DATE}</p>
        <p>Student Admissions Enrollment Platform - ${ENVIRONMENT} Environment</p>
    </footer>
</body>
</html>
EOF

    log_message "INFO" "HTML report generated successfully: $REPORT_FILE"
    echo "$REPORT_FILE"
    return 0
}

# Send notification about the generated report
send_report_notification() {
    local report_path="$1"
    log_message "INFO" "Sending report notification..."
    
    # Skip if notification is disabled
    if [ "${NOTIFICATION_ENABLED:-true}" != "true" ]; then
        log_message "INFO" "Notification is disabled. Skipping."
        return 0
    fi
    
    # Determine notification recipients from configuration
    local recipients="${NOTIFICATION_RECIPIENTS}"
    if [ -z "$recipients" ]; then
        log_message "WARNING" "No notification recipients configured. Skipping notification."
        return 0
    fi
    
    local notification_method="${NOTIFICATION_METHOD:-email}"
    local report_url="${REPORT_URL_PREFIX}$(basename "$report_path")"
    
    # Prepare notification message
    local subject="Performance Report - ${ENVIRONMENT} - ${CURRENT_DATE}"
    local message="Performance report for the Student Admissions Enrollment Platform (${ENVIRONMENT}) is now available.\n\n"
    message+="Report Date: ${CURRENT_DATE}\n"
    message+="Environment: ${ENVIRONMENT}\n\n"
    message+="View the report at: ${report_url}\n\n"
    
    # Extract key metrics for the notification
    local page_load_compliance=$(jq -r '.pageLoadTime.compliance' <<< "${SLA_COMPLIANCE}")
    local api_compliance=$(jq -r '.apiResponseTime.compliance' <<< "${SLA_COMPLIANCE}")
    local doc_compliance=$(jq -r '.documentProcessingTime.compliance' <<< "${SLA_COMPLIANCE}")
    
    message+="SLA Compliance Summary:\n"
    message+="- Page Load Time: ${page_load_compliance}%\n"
    message+="- API Response Time: ${api_compliance}%\n"
    message+="- Document Processing Time: ${doc_compliance}%\n\n"
    message+="This is an automated notification from the Performance Monitoring System."
    
    # Send notification based on configured method
    case "$notification_method" in
        email)
            log_message "INFO" "Sending email notification to $recipients"
            if command -v mail &> /dev/null; then
                echo -e "$message" | mail -s "$subject" "$recipients"
                local status=$?
                if [ $status -ne 0 ]; then
                    log_message "ERROR" "Failed to send email notification: $status"
                    return 1
                fi
            else
                log_message "ERROR" "mail command not found. Cannot send email notification."
                return 1
            fi
            ;;
        slack)
            log_message "INFO" "Sending Slack notification to configured webhook"
            local slack_payload="{\"text\":\"${subject}\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"${message}\"}},{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"<${report_url}|View Full Report>\"}}]}"
            
            if [ -z "${SLACK_WEBHOOK_URL}" ]; then
                log_message "ERROR" "SLACK_WEBHOOK_URL is not configured. Cannot send Slack notification."
                return 1
            fi
            
            curl -s -X POST -H 'Content-type: application/json' --data "$slack_payload" "${SLACK_WEBHOOK_URL}"
            local status=$?
            if [ $status -ne 0 ]; then
                log_message "ERROR" "Failed to send Slack notification: $status"
                return 1
            fi
            ;;
        *)
            log_message "ERROR" "Unsupported notification method: $notification_method"
            return 1
            ;;
    esac
    
    log_message "INFO" "Notification sent successfully."
    return 0
}

# Remove reports older than the retention period
cleanup_old_reports() {
    log_message "INFO" "Cleaning up old reports..."
    
    # Get retention period from configuration (default: 30 days)
    local retention_days="${REPORT_RETENTION_DAYS:-30}"
    
    # Find and remove reports older than retention period
    local old_reports=$(find "$REPORT_DIR" -name "performance-report-*.html" -type f -mtime +$retention_days)
    local removed_count=0
    
    for report in $old_reports; do
        log_message "INFO" "Removing old report: $report"
        rm -f "$report"
        removed_count=$((removed_count + 1))
    done
    
    # Find and remove log files older than retention period
    local old_logs=$(find "$REPORT_DIR/logs" -name "generate-report-*.log" -type f -mtime +$retention_days)
    
    for log in $old_logs; do
        log_message "INFO" "Removing old log file: $log"
        rm -f "$log"
    done
    
    log_message "INFO" "Cleanup completed. Removed $removed_count old reports."
    return $removed_count
}

# Main function that orchestrates the report generation process
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--date)
                CURRENT_DATE="$2"
                REPORT_FILE="$REPORT_DIR/performance-report-$CURRENT_DATE.html"
                LOG_FILE="$REPORT_DIR/logs/generate-report-$CURRENT_DATE.log"
                shift 2
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                echo "Usage: $(basename $0) [options]"
                echo ""
                echo "Options:"
                echo "  -e, --environment ENV   Set environment (default: production)"
                echo "  -d, --date DATE         Generate report for specific date (format: YYYY-MM-DD)"
                echo "  -c, --config FILE       Specify custom config file"
                echo "  -v, --verbose           Enable verbose output"
                echo "  -h, --help              Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use -h or --help to see available options"
                exit 1
                ;;
        esac
    done
    
    # Start the report generation process
    log_message "INFO" "Starting performance report generation for ${ENVIRONMENT} environment"
    
    # Check dependencies
    if ! check_dependencies; then
        log_message "ERROR" "Missing dependencies. Exiting."
        exit 1
    fi
    
    # Load configuration
    if ! load_configuration; then
        log_message "ERROR" "Failed to load configuration. Exiting."
        exit 1
    fi
    
    # Setup directories
    if ! setup_directories; then
        log_message "ERROR" "Failed to setup directories. Exiting."
        exit 1
    fi
    
    # Collect metrics
    log_message "INFO" "Collecting metrics..."
    
    # Get application metrics
    APP_METRICS=$(get_application_metrics)
    if [[ $? -ne 0 || $(echo "$APP_METRICS" | jq -e '.error') ]]; then
        log_message "ERROR" "Failed to collect application metrics: $(echo "$APP_METRICS" | jq -r '.error // "Unknown error"')"
        exit 1
    fi
    
    # Get database metrics
    DB_METRICS=$(get_database_metrics)
    if [[ $? -ne 0 || $(echo "$DB_METRICS" | jq -e '.error') ]]; then
        log_message "ERROR" "Failed to collect database metrics: $(echo "$DB_METRICS" | jq -r '.error // "Unknown error"')"
        exit 1
    fi
    
    # Get Redis metrics
    REDIS_METRICS=$(get_redis_metrics)
    if [[ $? -ne 0 || $(echo "$REDIS_METRICS" | jq -e '.error') ]]; then
        log_message "ERROR" "Failed to collect Redis metrics: $(echo "$REDIS_METRICS" | jq -r '.error // "Unknown error"')"
        exit 1
    fi
    
    # Calculate SLA compliance
    SLA_COMPLIANCE=$(calculate_sla_compliance "$APP_METRICS")
    if [[ $? -ne 0 || $(echo "$SLA_COMPLIANCE" | jq -e '.error') ]]; then
        log_message "ERROR" "Failed to calculate SLA compliance: $(echo "$SLA_COMPLIANCE" | jq -r '.error // "Unknown error"')"
        exit 1
    fi
    
    # Generate HTML report
    REPORT_PATH=$(generate_html_report "$APP_METRICS" "$DB_METRICS" "$REDIS_METRICS" "$SLA_COMPLIANCE")
    if [[ $? -ne 0 || ! -f "$REPORT_PATH" ]]; then
        log_message "ERROR" "Failed to generate HTML report"
        exit 1
    fi
    
    # Send notification
    if ! send_report_notification "$REPORT_PATH"; then
        log_message "WARNING" "Failed to send report notification"
        # Continue execution despite notification failure
    fi
    
    # Cleanup old reports
    cleanup_old_reports
    
    log_message "INFO" "Performance report generation completed successfully"
    log_message "INFO" "Report available at: $REPORT_PATH"
    
    return 0
}

# Execute main function
main "$@"
exit $?