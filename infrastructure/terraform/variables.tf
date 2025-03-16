# Environment Configuration
variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_id" {
  description = "ID of an existing VPC to use (leave blank to create a new VPC)"
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use for resources"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "elasticache_subnets" {
  description = "CIDR blocks for ElastiCache subnets"
  type        = list(string)
  default     = ["10.0.301.0/24", "10.0.302.0/24", "10.0.303.0/24"]
}

variable "enable_nat_gateway" {
  description = "Whether to enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Whether to use a single NAT Gateway for all private subnets"
  type        = bool
  default     = false
}

# Database Configuration
variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "admissions_platform"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Password for the database (if not provided, a random one will be generated)"
  type        = string
  default     = null
  sensitive   = true
}

variable "db_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for the RDS instance in GB"
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Whether to create a multi-AZ RDS instance for high availability"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

# Redis/ElastiCache Configuration
variable "redis_node_type" {
  description = "Node type for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the ElastiCache Redis cluster"
  type        = number
  default     = 1
}

variable "redis_parameter_group_name" {
  description = "Name of the parameter group for the ElastiCache Redis cluster"
  type        = string
  default     = "default.redis7.0"
}

# Container Configuration
variable "web_container_image" {
  description = "Docker image for the web service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:latest"
}

variable "worker_container_image" {
  description = "Docker image for the worker service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:latest"
}

variable "scheduler_container_image" {
  description = "Docker image for the scheduler service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:latest"
}

variable "web_container_cpu" {
  description = "CPU units for the web service container"
  type        = number
  default     = 256
}

variable "web_container_memory" {
  description = "Memory (in MiB) for the web service container"
  type        = number
  default     = 512
}

variable "worker_container_cpu" {
  description = "CPU units for the worker service container"
  type        = number
  default     = 512
}

variable "worker_container_memory" {
  description = "Memory (in MiB) for the worker service container"
  type        = number
  default     = 1024
}

variable "scheduler_container_cpu" {
  description = "CPU units for the scheduler service container"
  type        = number
  default     = 256
}

variable "scheduler_container_memory" {
  description = "Memory (in MiB) for the scheduler service container"
  type        = number
  default     = 512
}

# Auto-scaling Configuration
variable "web_min_capacity" {
  description = "Minimum number of web service tasks"
  type        = number
  default     = 2
}

variable "web_max_capacity" {
  description = "Maximum number of web service tasks"
  type        = number
  default     = 10
}

variable "worker_min_capacity" {
  description = "Minimum number of worker service tasks"
  type        = number
  default     = 2
}

variable "worker_max_capacity" {
  description = "Maximum number of worker service tasks"
  type        = number
  default     = 8
}

# DNS and Certificate Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "create_dns_record" {
  description = "Whether to create a DNS record for the application"
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "The Route53 hosted zone ID for the domain"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the domain"
  type        = string
  default     = ""
}

# CDN and Security Configuration
variable "enable_waf" {
  description = "Whether to enable AWS WAF for the CloudFront distribution"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Whether to create a CloudFront distribution for the application"
  type        = bool
  default     = true
}

# Storage Configuration
variable "document_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  type        = string
  default     = ""
}

variable "log_bucket_name" {
  description = "Name of the S3 bucket for logs"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 90
}

# Tagging
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}