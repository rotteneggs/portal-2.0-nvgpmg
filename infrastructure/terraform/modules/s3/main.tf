# S3 module for Student Admissions Enrollment Platform
# Provides secure document storage with versioning, encryption, and optional replication

# Generate random suffix for bucket names if not explicitly provided
resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# Main document storage bucket
resource "aws_s3_bucket" "document_bucket" {
  bucket = var.document_bucket_name != null ? var.document_bucket_name : "${var.environment}-admissions-documents-${random_id.bucket_suffix.hex}"
  
  tags = merge(
    {
      "Name" = "${var.environment}-admissions-documents"
    },
    var.common_tags
  )
}

# Enable versioning for document bucket
resource "aws_s3_bucket_versioning" "document_bucket_versioning" {
  bucket = aws_s3_bucket.document_bucket.id
  
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Enable encryption for document bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "document_bucket_encryption" {
  bucket = aws_s3_bucket.document_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Configure lifecycle rules for document bucket
resource "aws_s3_bucket_lifecycle_configuration" "document_bucket_lifecycle" {
  bucket = aws_s3_bucket.document_bucket.id
  
  rule = var.lifecycle_rules
}

# Configure CORS for document bucket
resource "aws_s3_bucket_cors_configuration" "document_bucket_cors" {
  bucket = aws_s3_bucket.document_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.environment == "production" && var.domain_name != null ? ["https://${var.domain_name}"] : ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Block public access to document bucket
resource "aws_s3_bucket_public_access_block" "document_bucket_public_access_block" {
  bucket = aws_s3_bucket.document_bucket.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Log bucket for storing access logs
resource "aws_s3_bucket" "log_bucket" {
  bucket = var.log_bucket_name != null ? var.log_bucket_name : "${var.environment}-admissions-logs-${random_id.bucket_suffix.hex}"
  
  tags = merge(
    {
      "Name" = "${var.environment}-admissions-logs"
    },
    var.common_tags
  )
}

# Enable encryption for log bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "log_bucket_encryption" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Configure lifecycle rules for log bucket
resource "aws_s3_bucket_lifecycle_configuration" "log_bucket_lifecycle" {
  bucket = aws_s3_bucket.log_bucket.id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

# Block public access to log bucket
resource "aws_s3_bucket_public_access_block" "log_bucket_public_access_block" {
  bucket = aws_s3_bucket.log_bucket.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable logging for document bucket
resource "aws_s3_bucket_logging" "document_bucket_logging" {
  bucket = aws_s3_bucket.document_bucket.id
  
  target_bucket = aws_s3_bucket.log_bucket.id
  target_prefix = "document-bucket-logs/"
}

# Replica bucket in secondary region (only for production)
resource "aws_s3_bucket" "document_bucket_replica" {
  count    = var.environment == "production" && var.enable_replication ? 1 : 0
  provider = aws.replica
  
  bucket = var.document_bucket_name != null ? "${var.document_bucket_name}-replica" : "${var.environment}-admissions-documents-replica-${random_id.bucket_suffix.hex}"
  
  tags = merge(
    {
      "Name" = "${var.environment}-admissions-documents-replica"
    },
    var.common_tags
  )
}

# Enable versioning for replica bucket
resource "aws_s3_bucket_versioning" "document_bucket_replica_versioning" {
  count    = var.environment == "production" && var.enable_replication ? 1 : 0
  provider = aws.replica
  bucket   = aws_s3_bucket.document_bucket_replica[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption for replica bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "document_bucket_replica_encryption" {
  count    = var.environment == "production" && var.enable_replication ? 1 : 0
  provider = aws.replica
  bucket   = aws_s3_bucket.document_bucket_replica[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to replica bucket
resource "aws_s3_bucket_public_access_block" "document_bucket_replica_public_access_block" {
  count    = var.environment == "production" && var.enable_replication ? 1 : 0
  provider = aws.replica
  bucket   = aws_s3_bucket.document_bucket_replica[0].id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM role for replication
resource "aws_iam_role" "replication_role" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0
  
  name = "${var.environment}-admissions-s3-replication-role"
  
  assume_role_policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "s3.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM policy for replication
resource "aws_iam_policy" "replication_policy" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0
  
  name = "${var.environment}-admissions-s3-replication-policy"
  
  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ],
        "Effect": "Allow",
        "Resource": [
          "${aws_s3_bucket.document_bucket.arn}"
        ]
      },
      {
        "Action": [
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl"
        ],
        "Effect": "Allow",
        "Resource": [
          "${aws_s3_bucket.document_bucket.arn}/*"
        ]
      },
      {
        "Action": [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ],
        "Effect": "Allow",
        "Resource": "${aws_s3_bucket.document_bucket_replica[0].arn}/*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "replication_policy_attachment" {
  count = var.environment == "production" && var.enable_replication ? 1 : 0
  
  role       = aws_iam_role.replication_role[0].name
  policy_arn = aws_iam_policy.replication_policy[0].arn
}

# Configure replication
resource "aws_s3_bucket_replication_configuration" "document_bucket_replication" {
  count  = var.environment == "production" && var.enable_replication ? 1 : 0
  bucket = aws_s3_bucket.document_bucket.id
  role   = aws_iam_role.replication_role[0].arn

  rule {
    id     = "document-replication"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.document_bucket_replica[0].arn
      storage_class = "STANDARD"
    }
  }
}

# Provider configuration for replica region
provider "aws" {
  alias  = "replica"
  region = var.replica_region
}