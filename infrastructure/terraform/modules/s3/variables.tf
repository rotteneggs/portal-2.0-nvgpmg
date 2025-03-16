variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "document_bucket_name" {
  description = "Name of the S3 bucket for document storage (if not provided, a name will be generated)"
  type        = string
  default     = null
  
  validation {
    condition     = var.document_bucket_name == null || (
      length(var.document_bucket_name) >= 3 &&
      length(var.document_bucket_name) <= 63 &&
      can(regex("^[a-z0-9][a-z0-9-.]*[a-z0-9]$", var.document_bucket_name))
    )
    error_message = "The bucket name must be between 3 and 63 characters, start and end with a lowercase letter or number, and can contain only lowercase letters, numbers, hyphens, and periods."
  }
}

variable "log_bucket_name" {
  description = "Name of the S3 bucket for logs (if not provided, a name will be generated)"
  type        = string
  default     = null
  
  validation {
    condition     = var.log_bucket_name == null || (
      length(var.log_bucket_name) >= 3 &&
      length(var.log_bucket_name) <= 63 &&
      can(regex("^[a-z0-9][a-z0-9-.]*[a-z0-9]$", var.log_bucket_name))
    )
    error_message = "The bucket name must be between 3 and 63 characters, start and end with a lowercase letter or number, and can contain only lowercase letters, numbers, hyphens, and periods."
  }
}

variable "enable_versioning" {
  description = "Whether to enable versioning for the document bucket to maintain a complete history of objects and protect against accidental deletions"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = <<EOF
Lifecycle rules for the document bucket to automatically transition objects to lower-cost storage classes.
Each rule should include:
- id: Unique identifier for the rule
- status: "Enabled" or "Disabled"
- transition: List of transition rules, each with:
  - days: Number of days after creation to transition
  - storage_class: AWS storage class to transition to (e.g., "STANDARD_IA", "GLACIER")
  
Optional fields include:
- prefix: Object key prefix to which the rule applies
- expiration: Object expiration rules
EOF
  type        = list(any)
  default = [
    {
      id      = "transition-to-ia"
      status  = "Enabled"
      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        }
      ]
    },
    {
      id      = "transition-to-glacier"
      status  = "Enabled"
      transition = [
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]
}

variable "enable_replication" {
  description = "Whether to enable cross-region replication for the document bucket (only applicable in production) to ensure disaster recovery capabilities"
  type        = bool
  default     = false
}

variable "replica_region" {
  description = "AWS region for the replica bucket (required if enable_replication is true)"
  type        = string
  default     = "us-west-2"
  
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.replica_region))
    error_message = "The replica region must be a valid AWS region code (e.g., us-west-2, eu-west-1)."
  }
}

variable "domain_name" {
  description = "Domain name for CORS configuration (if not provided, all origins will be allowed in non-production environments)"
  type        = string
  default     = null
}

variable "common_tags" {
  description = "Common tags to apply to all resources for organizational and billing purposes"
  type        = map(string)
  default     = {}
}