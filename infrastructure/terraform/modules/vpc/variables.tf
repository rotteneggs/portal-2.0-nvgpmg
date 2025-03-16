# General Configuration
variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
}

variable "region" {
  description = "AWS region where the VPC will be created"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "The vpc_cidr must be a valid CIDR block."
  }
}

# Availability Zones
variable "availability_zones" {
  description = "List of availability zones to use for the subnets in the VPC"
  type        = list(string)
}

# Subnet Configuration
variable "public_subnets" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for s in var.public_subnets : can(cidrnetmask(s))])
    error_message = "All public_subnets must be valid CIDR blocks."
  }
}

variable "private_subnets" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for s in var.private_subnets : can(cidrnetmask(s))])
    error_message = "All private_subnets must be valid CIDR blocks."
  }
}

variable "database_subnets" {
  description = "List of CIDR blocks for database subnets"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for s in var.database_subnets : can(cidrnetmask(s))])
    error_message = "All database_subnets must be valid CIDR blocks."
  }
}

variable "elasticache_subnets" {
  description = "List of CIDR blocks for elasticache subnets"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for s in var.elasticache_subnets : can(cidrnetmask(s))])
    error_message = "All elasticache_subnets must be valid CIDR blocks."
  }
}

# NAT Gateway Configuration
variable "enable_nat_gateway" {
  description = "Should be true if you want to provision NAT Gateways for each of your private networks"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Should be true if you want to provision a single shared NAT Gateway across all of your private networks"
  type        = bool
  default     = false
}

# VPC Flow Logs Configuration
variable "flow_log_bucket_arn" {
  description = "ARN of the S3 bucket where VPC Flow Logs will be stored"
  type        = string
  default     = null
}

# Tagging
variable "common_tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}