# Output definitions for the S3 module

output "document_bucket_id" {
  description = "The ID of the document storage bucket"
  value       = aws_s3_bucket.document_bucket.id
}

output "document_bucket_name" {
  description = "The name of the document storage bucket"
  value       = aws_s3_bucket.document_bucket.bucket
}

output "document_bucket_arn" {
  description = "The ARN of the document storage bucket"
  value       = aws_s3_bucket.document_bucket.arn
}

output "document_bucket_domain_name" {
  description = "The domain name of the document storage bucket"
  value       = aws_s3_bucket.document_bucket.bucket_domain_name
}

output "document_bucket_regional_domain_name" {
  description = "The regional domain name of the document storage bucket"
  value       = aws_s3_bucket.document_bucket.bucket_regional_domain_name
}

output "log_bucket_id" {
  description = "The ID of the log bucket"
  value       = aws_s3_bucket.log_bucket.id
}

output "log_bucket_name" {
  description = "The name of the log bucket"
  value       = aws_s3_bucket.log_bucket.bucket
}

output "log_bucket_arn" {
  description = "The ARN of the log bucket"
  value       = aws_s3_bucket.log_bucket.arn
}

output "document_bucket_replica_id" {
  description = "The ID of the replica document bucket (only in production with replication enabled)"
  value       = var.environment == "production" && var.enable_replication ? aws_s3_bucket.document_bucket_replica[0].id : null
}

output "document_bucket_replica_name" {
  description = "The name of the replica document bucket (only in production with replication enabled)"
  value       = var.environment == "production" && var.enable_replication ? aws_s3_bucket.document_bucket_replica[0].bucket : null
}

output "document_bucket_replica_arn" {
  description = "The ARN of the replica document bucket (only in production with replication enabled)"
  value       = var.environment == "production" && var.enable_replication ? aws_s3_bucket.document_bucket_replica[0].arn : null
}

output "replication_role_arn" {
  description = "The ARN of the IAM role used for bucket replication (only in production with replication enabled)"
  value       = var.environment == "production" && var.enable_replication ? aws_iam_role.replication_role[0].arn : null
}