# Main Terraform configuration file for Student Admissions Enrollment Platform
# This file orchestrates the infrastructure deployment for the platform

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  
  # Backend configuration for state management
  backend "s3" {
    # These values should be provided through initialization
    # terraform init -backend-config="bucket=your-state-bucket" -backend-config="key=path/to/state"
    encrypt = true
  }
}

# Provider configuration
provider "aws" {
  region = var.aws_region
  
  # Enable default tags for all AWS resources
  default_tags {
    tags = local.common_tags
  }
}

provider "random" {}

# Local variables for configuration
locals {
  common_tags = merge({
    "Project"     = "StudentAdmissionsEnrollmentPlatform"
    "Environment" = var.environment
    "ManagedBy"   = "Terraform"
  }, var.common_tags)
}

# Random password generation for database
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
}

# SQS queues for asynchronous processing
resource "aws_sqs_queue" "dead_letter_queue" {
  name                      = "${var.environment}-admissions-dlq"
  message_retention_seconds = 1209600  # 14 days
  tags                      = merge({"Name":"${var.environment}-admissions-dlq"}, var.common_tags)
}

resource "aws_sqs_queue" "main_queue" {
  name                       = "${var.environment}-admissions-queue"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = 345600  # 4 days
  receive_wait_time_seconds  = 10
  visibility_timeout_seconds = 300     # 5 minutes
  redrive_policy             = jsonencode({
    "deadLetterTargetArn" = aws_sqs_queue.dead_letter_queue.arn,
    "maxReceiveCount"     = 5
  })
  tags                       = merge({"Name":"${var.environment}-admissions-queue"}, var.common_tags)
}

# Outputs
output "vpc_id" {
  value       = var.vpc_id
  description = "The ID of the VPC"
}

output "sqs_queue_url" {
  value       = aws_sqs_queue.main_queue.url
  description = "The URL of the main SQS queue"
}

output "dead_letter_queue_url" {
  value       = aws_sqs_queue.dead_letter_queue.url
  description = "The URL of the dead letter queue"
}