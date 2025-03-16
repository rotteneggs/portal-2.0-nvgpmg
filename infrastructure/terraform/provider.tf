# Configure Terraform providers for the Student Admissions Enrollment Platform

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
}

# AWS provider is configured with the region from variables and default tags
provider "aws" {
  region = var.region
  
  default_tags {
    tags = local.common_tags
  }
}

# Additional AWS provider for us-east-1 region is needed for global resources
provider "aws" {
  alias  = "us-east-1"
  region = "us-east-1"
}

# Random provider is used for generating secure passwords and other random values
provider "random" {}