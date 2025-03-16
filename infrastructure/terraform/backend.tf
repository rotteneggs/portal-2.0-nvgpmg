# Configure the Terraform backend for state storage and locking
terraform {
  backend "s3" {
    # Using S3 for state storage with encryption enabled for security
    bucket = "admissions-platform-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
    encrypt = true
    
    # DynamoDB table is used for state locking to prevent concurrent modifications
    dynamodb_table = "admissions-platform-terraform-locks"
  }
}

# Note: This backend configuration should be initialized with 'terraform init'
# For environment-specific backends, see the configurations in the environments directory