# Development environment configuration for Student Admissions Enrollment Platform
# This file configures the infrastructure resources for the development environment

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  
  # Backend configuration for state management
  backend "s3" {
    bucket         = "admissions-platform-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "admissions-platform-terraform-locks"
  }
}

# Provider configuration for development environment
provider "aws" {
  region  = "us-east-1"
  profile = "dev"
}

# Local variables for configuration
locals {
  common_tags = {
    Project     = "StudentAdmissionsEnrollmentPlatform"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Owner       = "DevOps"
  }
}

# Variables for configurable inputs
variable "db_password" {
  description = "Password for the database (should be passed securely)"
  type        = string
  sensitive   = true
}

variable "web_container_image" {
  description = "Docker image for web application"
  type        = string
}

variable "worker_container_image" {
  description = "Docker image for worker processes"
  type        = string
}

variable "scheduler_container_image" {
  description = "Docker image for scheduler processes"
  type        = string
}

# VPC and networking infrastructure
module "vpc" {
  source = "../../modules/vpc"
  
  environment        = "dev"
  region             = "us-east-1"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  private_subnets    = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets     = ["10.0.101.0/24", "10.0.102.0/24"]
  database_subnets   = ["10.0.201.0/24", "10.0.202.0/24"]
  elasticache_subnets = ["10.0.301.0/24", "10.0.302.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true
  flow_log_bucket_arn = "${module.s3.log_bucket_arn}"
  common_tags        = "${local.common_tags}"
}

# RDS MySQL database
module "rds" {
  source = "../../modules/rds"
  
  environment             = "dev"
  identifier              = "dev-admissions-platform-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = "db.t3.small"
  allocated_storage       = 20
  max_allocated_storage   = 50
  db_name                 = "admissions_platform"
  username                = "admin"
  password                = "${var.db_password}"
  port                    = 3306
  vpc_id                  = "${module.vpc.vpc_id}"
  subnet_ids              = "${module.vpc.database_subnet_ids}"
  allowed_security_groups = ["${module.vpc.ecs_tasks_security_group_id}"]
  multi_az                = false
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  deletion_protection     = false
  skip_final_snapshot     = true
  apply_immediately       = true
  monitoring_interval     = 60
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  max_connections         = 100
  common_tags             = "${local.common_tags}"
}

# Redis ElastiCache for caching and session management
module "elasticache" {
  source = "../../modules/elasticache"
  
  environment             = "dev"
  cluster_id              = "admissions-platform-redis"
  engine                  = "redis"
  engine_version          = "7.0"
  node_type               = "cache.t3.small"
  port                    = 6379
  num_cache_nodes         = 1
  vpc_id                  = "${module.vpc.vpc_id}"
  subnet_ids              = "${module.vpc.elasticache_subnet_ids}"
  allowed_security_groups = ["${module.vpc.ecs_tasks_security_group_id}"]
  automatic_failover_enabled = false
  multi_az_enabled        = false
  apply_immediately       = true
  common_tags             = "${local.common_tags}"
}

# S3 buckets for document storage and logging
module "s3" {
  source = "../../modules/s3"
  
  environment          = "dev"
  document_bucket_name = "dev-admissions-platform-documents"
  log_bucket_name      = "dev-admissions-platform-logs"
  enable_versioning    = true
  enable_replication   = false
  lifecycle_rules      = [
    {
      id      = "archive-documents"
      status  = "Enabled"
      prefix  = "documents/"
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
  common_tags          = "${local.common_tags}"
}

# ECS cluster and services for containerized applications
module "ecs" {
  source = "../../modules/ecs"
  
  environment              = "dev"
  region                   = "us-east-1"
  cluster_name             = "dev-admissions-platform-cluster"
  vpc_id                   = "${module.vpc.vpc_id}"
  public_subnet_ids        = "${module.vpc.public_subnet_ids}"
  private_subnet_ids       = "${module.vpc.private_subnet_ids}"
  web_container_image      = "${var.web_container_image}"
  worker_container_image   = "${var.worker_container_image}"
  scheduler_container_image = "${var.scheduler_container_image}"
  web_container_port       = 80
  web_container_cpu        = 256
  web_container_memory     = 512
  web_desired_count        = 1
  web_min_count            = 1
  web_max_count            = 3
  worker_container_cpu     = 256
  worker_container_memory  = 512
  worker_desired_count     = 1
  worker_min_count         = 1
  worker_max_count         = 2
  scheduler_container_cpu  = 128
  scheduler_container_memory = 256
  health_check_path        = "/api/health"
  health_check_interval    = 30
  health_check_timeout     = 5
  health_check_healthy_threshold = 3
  health_check_unhealthy_threshold = 3
  enable_autoscaling       = true
  cpu_utilization_high_threshold = 70
  db_host                  = "${module.rds.db_instance_address}"
  db_name                  = "${module.rds.db_instance_name}"
  db_username              = "${module.rds.db_instance_username}"
  db_password              = "${var.db_password}"
  redis_host               = "${module.elasticache.redis_endpoint}"
  document_bucket_name     = "${module.s3.document_bucket_name}"
  log_bucket_name          = "${module.s3.log_bucket_name}"
  sqs_queue_name           = "dev-admissions-queue"
  acm_certificate_arn      = ""
  create_dns_record        = false
  domain_name              = ""
  route53_zone_id          = ""
  common_tags              = "${local.common_tags}"
}

# Outputs
output "vpc_id" {
  value       = "${module.vpc.vpc_id}"
  description = "The ID of the VPC"
}

output "db_instance_endpoint" {
  value       = "${module.rds.db_instance_endpoint}"
  description = "The connection endpoint for the RDS database"
}

output "redis_endpoint" {
  value       = "${module.elasticache.redis_endpoint}"
  description = "The endpoint of the Redis ElastiCache cluster"
}

output "document_bucket_name" {
  value       = "${module.s3.document_bucket_name}"
  description = "The name of the S3 bucket for document storage"
}

output "log_bucket_name" {
  value       = "${module.s3.log_bucket_name}"
  description = "The name of the S3 bucket for logs"
}

output "alb_dns_name" {
  value       = "${module.ecs.alb_dns_name}"
  description = "The DNS name of the application load balancer"
}

output "ecs_cluster_name" {
  value       = "${module.ecs.ecs_cluster_name}"
  description = "The name of the ECS cluster"
}