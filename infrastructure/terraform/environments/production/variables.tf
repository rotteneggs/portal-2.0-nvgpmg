# AWS Region Configuration
variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.2.0.0/16"  # Production-specific CIDR range
}

variable "availability_zones" {
  description = "List of availability zones to use for resources"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]  # Using 3 AZs for high availability
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.2.201.0/24", "10.2.202.0/24", "10.2.203.0/24"]
}

variable "elasticache_subnets" {
  description = "CIDR blocks for ElastiCache subnets"
  type        = list(string)
  default     = ["10.2.301.0/24", "10.2.302.0/24", "10.2.303.0/24"]
}

# Database Configuration
variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}

variable "rds_identifier" {
  description = "Identifier for the RDS instance"
  type        = string
  default     = "production-admissions-platform-db"
}

variable "rds_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.r5.large"  # Production-grade instance type
}

variable "rds_allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 100  # Higher storage for production workloads
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for the RDS instance in GB"
  type        = number
  default     = 500  # Allow for significant growth
}

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

variable "db_multi_az" {
  description = "Whether to create a multi-AZ RDS instance for high availability"
  type        = bool
  default     = true  # Enable multi-AZ for production
}

variable "db_backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30  # Longer retention for production
}

# Redis/ElastiCache Configuration
variable "redis_cluster_id" {
  description = "Identifier for the Redis cluster"
  type        = string
  default     = "production-admissions-platform-redis"
}

variable "redis_node_type" {
  description = "Node type for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.r5.large"  # Production-grade instance type
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the ElastiCache Redis cluster"
  type        = number
  default     = 3  # Multiple nodes for high availability
}

# Storage Configuration
variable "document_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  type        = string
  default     = "production-admissions-platform-documents"
}

variable "log_bucket_name" {
  description = "Name of the S3 bucket for logs"
  type        = string
  default     = "production-admissions-platform-logs"
}

variable "s3_lifecycle_rules" {
  description = "Lifecycle rules for S3 buckets"
  type        = list(object({
    name       = string
    prefix     = string
    enabled    = bool
    transition = list(object({
      days          = number
      storage_class = string
    }))
    expiration = object({
      days = number
    })
  }))
  default = [
    {
      name    = "archive-documents"
      prefix  = "documents/"
      enabled = true
      transition = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 180
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 730  # 2 years
      }
    }
  ]
}

# Container Configuration
variable "web_container_image" {
  description = "Docker image for the web service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:production"
}

variable "worker_container_image" {
  description = "Docker image for the worker service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:production"
}

variable "scheduler_container_image" {
  description = "Docker image for the scheduler service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:production"
}

# ECS Cluster Configuration
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "production-admissions-platform-cluster"
}

# Web Service Configuration
variable "web_container_cpu" {
  description = "CPU units for the web service container"
  type        = number
  default     = 1024  # 1 vCPU
}

variable "web_container_memory" {
  description = "Memory (in MiB) for the web service container"
  type        = number
  default     = 2048  # 2 GB
}

variable "web_desired_count" {
  description = "Desired number of web service tasks"
  type        = number
  default     = 4  # Higher baseline for production
}

variable "web_min_count" {
  description = "Minimum number of web service tasks"
  type        = number
  default     = 4  # Higher minimum for production
}

variable "web_max_count" {
  description = "Maximum number of web service tasks"
  type        = number
  default     = 16  # Allow for significant scaling during peak admissions periods
}

# Worker Service Configuration
variable "worker_container_cpu" {
  description = "CPU units for the worker service container"
  type        = number
  default     = 1024  # 1 vCPU
}

variable "worker_container_memory" {
  description = "Memory (in MiB) for the worker service container"
  type        = number
  default     = 2048  # 2 GB
}

variable "worker_desired_count" {
  description = "Desired number of worker service tasks"
  type        = number
  default     = 2
}

variable "worker_min_count" {
  description = "Minimum number of worker service tasks"
  type        = number
  default     = 2
}

variable "worker_max_count" {
  description = "Maximum number of worker service tasks"
  type        = number
  default     = 8  # Allow for scaling during peak processing periods
}

# Scheduler Service Configuration
variable "scheduler_container_cpu" {
  description = "CPU units for the scheduler service container"
  type        = number
  default     = 512  # 0.5 vCPU
}

variable "scheduler_container_memory" {
  description = "Memory (in MiB) for the scheduler service container"
  type        = number
  default     = 1024  # 1 GB
}

# DNS and Certificate Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "admissions-platform.example.com"
}

variable "create_dns_record" {
  description = "Whether to create a DNS record for the application"
  type        = bool
  default     = true
}

variable "route53_zone_id" {
  description = "The Route53 hosted zone ID for the domain"
  type        = string
  default     = "Z0123456789ABCDEFGHIJ"
}

variable "acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the domain"
  type        = string
  default     = "arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890"
}

# CDN and Security Configuration
variable "enable_waf" {
  description = "Whether to enable AWS WAF for the CloudFront distribution"
  type        = bool
  default     = true  # Enable WAF for production security
}

variable "enable_cloudfront" {
  description = "Whether to create a CloudFront distribution for the application"
  type        = bool
  default     = true  # Enable CloudFront for production performance
}

# Logging Configuration
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 90  # Longer retention for production compliance
}

# Tagging
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {
    "Project"     = "StudentAdmissionsEnrollmentPlatform"
    "Environment" = "production"
    "ManagedBy"   = "Terraform"
    "Owner"       = "AdmissionsTeam"
    "CostCenter"  = "Admissions-101"
  }
}