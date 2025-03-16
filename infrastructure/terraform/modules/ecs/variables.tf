# -----------------------------------------------------------------------------
# Project and Environment Variables
# -----------------------------------------------------------------------------
variable "project_name" {
  description = "Name of the project, used for resource naming and tagging"
  type        = string
  default     = "student-admissions"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "test", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, test, staging, production."
  }
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------
variable "vpc_id" {
  description = "ID of the VPC where ECS resources will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs where ECS tasks will run"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers"
  type        = list(string)
}

# -----------------------------------------------------------------------------
# ECS Cluster Configuration
# -----------------------------------------------------------------------------
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Service Names
# -----------------------------------------------------------------------------
variable "web_service_name" {
  description = "Name of the web service"
  type        = string
  default     = "web"
}

variable "worker_service_name" {
  description = "Name of the worker service"
  type        = string
  default     = "worker"
}

variable "scheduler_service_name" {
  description = "Name of the scheduler service"
  type        = string
  default     = "scheduler"
}

# -----------------------------------------------------------------------------
# Container Images
# -----------------------------------------------------------------------------
variable "web_container_image" {
  description = "Docker image for the web service"
  type        = string
}

variable "worker_container_image" {
  description = "Docker image for the worker service"
  type        = string
}

variable "scheduler_container_image" {
  description = "Docker image for the scheduler service"
  type        = string
}

# -----------------------------------------------------------------------------
# Container Configuration
# -----------------------------------------------------------------------------
variable "web_container_port" {
  description = "Port exposed by the web container"
  type        = number
  default     = 80
}

variable "web_cpu" {
  description = "CPU units for the web service (1 vCPU = 1024 units)"
  type        = number
  default     = 1024
}

variable "web_memory" {
  description = "Memory for the web service in MiB"
  type        = number
  default     = 2048
}

variable "worker_cpu" {
  description = "CPU units for the worker service (1 vCPU = 1024 units)"
  type        = number
  default     = 2048
}

variable "worker_memory" {
  description = "Memory for the worker service in MiB"
  type        = number
  default     = 4096
}

variable "scheduler_cpu" {
  description = "CPU units for the scheduler service (1 vCPU = 1024 units)"
  type        = number
  default     = 512
}

variable "scheduler_memory" {
  description = "Memory for the scheduler service in MiB"
  type        = number
  default     = 1024
}

# -----------------------------------------------------------------------------
# Service Scaling Configuration
# -----------------------------------------------------------------------------
variable "web_desired_count" {
  description = "Desired number of web service tasks"
  type        = number
  default     = 2
}

variable "worker_desired_count" {
  description = "Desired number of worker service tasks"
  type        = number
  default     = 2
}

variable "web_min_capacity" {
  description = "Minimum number of web service tasks for auto-scaling"
  type        = number
  default     = 2
}

variable "web_max_capacity" {
  description = "Maximum number of web service tasks for auto-scaling"
  type        = number
  default     = 10
}

variable "worker_min_capacity" {
  description = "Minimum number of worker service tasks for auto-scaling"
  type        = number
  default     = 2
}

variable "worker_max_capacity" {
  description = "Maximum number of worker service tasks for auto-scaling"
  type        = number
  default     = 8
}

# -----------------------------------------------------------------------------
# Auto-scaling Configuration
# -----------------------------------------------------------------------------
variable "web_scaling_cpu_threshold" {
  description = "CPU utilization threshold (percentage) for web service auto-scaling"
  type        = number
  default     = 70

  validation {
    condition     = var.web_scaling_cpu_threshold > 0 && var.web_scaling_cpu_threshold <= 100
    error_message = "CPU threshold must be between 1 and 100 percent."
  }
}

variable "web_scaling_memory_threshold" {
  description = "Memory utilization threshold (percentage) for web service auto-scaling"
  type        = number
  default     = 70

  validation {
    condition     = var.web_scaling_memory_threshold > 0 && var.web_scaling_memory_threshold <= 100
    error_message = "Memory threshold must be between 1 and 100 percent."
  }
}

variable "worker_scaling_queue_threshold" {
  description = "Queue depth threshold for worker service auto-scaling"
  type        = number
  default     = 500
}

# -----------------------------------------------------------------------------
# Health Check Configuration
# -----------------------------------------------------------------------------
variable "health_check_path" {
  description = "Path for health checks on the web service"
  type        = string
  default     = "/api/v1/health"
}

variable "health_check_interval" {
  description = "Interval between health checks in seconds"
  type        = number
  default     = 30
}

variable "health_check_timeout" {
  description = "Timeout for health checks in seconds"
  type        = number
  default     = 5
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks to consider target healthy"
  type        = number
  default     = 3
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks to consider target unhealthy"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# Deployment Configuration
# -----------------------------------------------------------------------------
variable "deployment_maximum_percent" {
  description = "Maximum percentage of tasks that can be running during a deployment"
  type        = number
  default     = 200
}

variable "deployment_minimum_healthy_percent" {
  description = "Minimum percentage of tasks that must remain healthy during a deployment"
  type        = number
  default     = 50
}

# -----------------------------------------------------------------------------
# IAM and Permissions
# -----------------------------------------------------------------------------
variable "enable_execution_role_cloudwatch_logs" {
  description = "Whether to enable CloudWatch Logs permissions for the ECS task execution role"
  type        = bool
  default     = true
}

variable "enable_task_role_ssm_access" {
  description = "Whether to enable SSM Parameter Store access for the ECS task role"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# Service Discovery Configuration
# -----------------------------------------------------------------------------
variable "enable_service_discovery" {
  description = "Whether to enable AWS Cloud Map service discovery"
  type        = bool
  default     = false
}

variable "service_discovery_namespace" {
  description = "Name of the AWS Cloud Map namespace for service discovery"
  type        = string
  default     = null
}

# -----------------------------------------------------------------------------
# Tagging
# -----------------------------------------------------------------------------
variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}