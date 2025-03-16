# AWS Region
variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use for resources"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]
}

variable "elasticache_subnets" {
  description = "CIDR blocks for ElastiCache subnets"
  type        = list(string)
  default     = ["10.1.301.0/24", "10.1.302.0/24", "10.1.303.0/24"]
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
  default     = "staging-admissions-platform-db"
}

variable "rds_instance_class" {
  description = "Instance class for the RDS instance"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for the RDS instance in GB"
  type        = number
  default     = 50
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for the RDS instance in GB"
  type        = number
  default     = 100
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

# ElastiCache Configuration
variable "redis_cluster_id" {
  description = "Identifier for the Redis cluster"
  type        = string
  default     = "staging-admissions-platform-redis"
}

variable "redis_node_type" {
  description = "Node type for the ElastiCache Redis cluster"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the ElastiCache Redis cluster"
  type        = number
  default     = 2
}

# Storage Configuration
variable "document_bucket_name" {
  description = "Name of the S3 bucket for document storage"
  type        = string
  default     = "staging-admissions-platform-documents"
}

variable "log_bucket_name" {
  description = "Name of the S3 bucket for logs"
  type        = string
  default     = "staging-admissions-platform-logs"
}

variable "s3_lifecycle_rules" {
  description = "Lifecycle rules for S3 buckets"
  type        = list(object({
    name      = string
    prefix    = string
    enabled   = bool
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
      name      = "archive-documents"
      prefix    = "documents/"
      enabled   = true
      transition = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        }
      ]
      expiration = {
        days = 365
      }
    }
  ]
}

# Container Configuration
variable "web_container_image" {
  description = "Docker image for the web service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:staging"
}

variable "worker_container_image" {
  description = "Docker image for the worker service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:staging"
}

variable "scheduler_container_image" {
  description = "Docker image for the scheduler service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:staging"
}

# ECS Configuration
variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "staging-admissions-platform-cluster"
}

variable "web_container_cpu" {
  description = "CPU units for the web service container"
  type        = number
  default     = 512
}

variable "web_container_memory" {
  description = "Memory (in MiB) for the web service container"
  type        = number
  default     = 1024
}

variable "web_desired_count" {
  description = "Desired number of web service tasks"
  type        = number
  default     = 2
}

variable "web_min_count" {
  description = "Minimum number of web service tasks"
  type        = number
  default     = 2
}

variable "web_max_count" {
  description = "Maximum number of web service tasks"
  type        = number
  default     = 4
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

variable "worker_desired_count" {
  description = "Desired number of worker service tasks"
  type        = number
  default     = 2
}

variable "worker_min_count" {
  description = "Minimum number of worker service tasks"
  type        = number
  default     = 1
}

variable "worker_max_count" {
  description = "Maximum number of worker service tasks"
  type        = number
  default     = 3
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

# DNS and Certificate Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "staging.admissions-platform.example.com"
}

variable "create_dns_record" {
  description = "Whether to create a DNS record for the application"
  type        = bool
  default     = true
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