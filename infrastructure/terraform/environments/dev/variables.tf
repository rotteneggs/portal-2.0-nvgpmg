# Database Configuration - Development Environment
variable "db_password" {
  description = "Password for the database"
  type        = string
  sensitive   = true
}

# Container Images - Development Environment
variable "web_container_image" {
  description = "Docker image for the web service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-web:dev"
}

variable "worker_container_image" {
  description = "Docker image for the worker service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-worker:dev"
}

variable "scheduler_container_image" {
  description = "Docker image for the scheduler service"
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/admissions-platform-scheduler:dev"
}