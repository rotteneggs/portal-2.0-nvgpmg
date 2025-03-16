# Production environment configuration for Student Admissions Enrollment Platform
# This file defines the production infrastructure deployment with high availability,
# security, and scalability requirements for the live system.

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  # Backend configuration for remote state storage
  backend "s3" {
    bucket         = "admissions-platform-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "admissions-platform-terraform-locks"
  }
}

# Provider configuration specific to production environment
provider "aws" {
  region  = "us-east-1"
  profile = "production"
}

# Call the root module with production-specific configuration
module "admissions_platform" {
  source = "../.."

  # Environment identifier
  environment = "production"
  region      = "us-east-1"

  # Network configuration
  vpc_cidr           = "10.2.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets    = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  public_subnets     = ["10.2.101.0/24", "10.2.102.0/24", "10.2.103.0/24"]
  database_subnets   = ["10.2.201.0/24", "10.2.202.0/24", "10.2.203.0/24"]
  elasticache_subnets = ["10.2.301.0/24", "10.2.302.0/24", "10.2.303.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = false  # Use multiple NAT gateways for high availability

  # Database configuration
  db_name                  = "admissions_platform"
  db_username              = "admin"
  db_password              = "ProdSecurePassword123!"  # Should be replaced with SSM Parameter Store in actual implementation
  db_instance_class        = "db.r5.large"
  db_allocated_storage     = 100
  db_max_allocated_storage = 500
  db_multi_az              = true
  db_backup_retention_period = 30

  # Redis configuration
  redis_node_type      = "cache.r5.large"
  redis_num_cache_nodes = 3

  # Container configuration
  web_container_image       = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:production"
  worker_container_image    = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:production"
  scheduler_container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:production"

  # Container resources
  web_container_cpu     = 1024
  web_container_memory  = 2048
  web_min_capacity      = 4
  web_max_capacity      = 16
  worker_container_cpu  = 1024
  worker_container_memory = 2048
  worker_min_capacity   = 2
  worker_max_capacity   = 8
  scheduler_container_cpu = 512
  scheduler_container_memory = 1024

  # Domain and SSL configuration
  domain_name        = "admissions-platform.example.com"
  create_dns_record  = true
  route53_zone_id    = "Z0123456789ABCDEFGHIJ"
  acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/abcdef12-3456-7890-abcd-ef1234567890"

  # Security configuration
  enable_waf       = true
  enable_cloudfront = true

  # Storage configuration
  document_bucket_name = "production-admissions-platform-documents"
  log_bucket_name      = "production-admissions-platform-logs"
  log_retention_days   = 90

  # Resource tagging
  common_tags = {
    Project     = "StudentAdmissionsEnrollmentPlatform"
    Environment = "production"
    ManagedBy   = "Terraform"
    Owner       = "AdmissionsTeam"
    CostCenter  = "Admissions-101"
  }
}

# Outputs
output "vpc_id" {
  value       = module.admissions_platform.vpc_id
  description = "The ID of the VPC"
}

output "db_endpoint" {
  value       = module.admissions_platform.db_endpoint
  description = "The endpoint of the RDS database"
  sensitive   = true
}

output "redis_endpoint" {
  value       = module.admissions_platform.redis_endpoint
  description = "The endpoint of the Redis cluster"
  sensitive   = true
}

output "alb_dns_name" {
  value       = module.admissions_platform.alb_dns_name
  description = "The DNS name of the application load balancer"
}

output "cloudfront_domain_name" {
  value       = module.admissions_platform.cloudfront_domain_name
  description = "The domain name of the CloudFront distribution"
}

output "document_bucket_name" {
  value       = module.admissions_platform.document_bucket_name
  description = "The name of the S3 bucket for document storage"
}

output "log_bucket_name" {
  value       = module.admissions_platform.log_bucket_name
  description = "The name of the S3 bucket for logs"
}

output "sqs_queue_url" {
  value       = module.admissions_platform.sqs_queue_url
  description = "The URL of the main SQS queue"
}

output "dead_letter_queue_url" {
  value       = module.admissions_platform.dead_letter_queue_url
  description = "The URL of the dead letter queue"
}