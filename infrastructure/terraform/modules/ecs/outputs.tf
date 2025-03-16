output "cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "The ID of the ECS cluster"
}

output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster"
}

output "cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "The ARN of the ECS cluster"
}

output "web_service_name" {
  value       = aws_ecs_service.web.name
  description = "The name of the web service"
}

output "web_service_arn" {
  value       = aws_ecs_service.web.id
  description = "The ARN of the web service"
}

output "worker_service_name" {
  value       = aws_ecs_service.worker.name
  description = "The name of the worker service"
}

output "worker_service_arn" {
  value       = aws_ecs_service.worker.id
  description = "The ARN of the worker service"
}

output "scheduler_service_name" {
  value       = aws_ecs_service.scheduler.name
  description = "The name of the scheduler service"
}

output "scheduler_service_arn" {
  value       = aws_ecs_service.scheduler.id
  description = "The ARN of the scheduler service"
}

output "web_task_definition_arn" {
  value       = aws_ecs_task_definition.web.arn
  description = "The ARN of the web task definition"
}

output "worker_task_definition_arn" {
  value       = aws_ecs_task_definition.worker.arn
  description = "The ARN of the worker task definition"
}

output "scheduler_task_definition_arn" {
  value       = aws_ecs_task_definition.scheduler.arn
  description = "The ARN of the scheduler task definition"
}

output "task_execution_role_arn" {
  value       = aws_iam_role.ecs_task_execution_role.arn
  description = "The ARN of the ECS task execution IAM role"
}

output "task_role_arn" {
  value       = aws_iam_role.ecs_task_role.arn
  description = "The ARN of the ECS task IAM role"
}

output "alb_id" {
  value       = aws_lb.main.id
  description = "The ID of the application load balancer"
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "The ARN of the application load balancer"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the application load balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "The canonical hosted zone ID of the load balancer (for Route53 alias records)"
}

output "target_group_arn" {
  value       = aws_lb_target_group.web.arn
  description = "The ARN of the target group for the web service"
}

output "https_listener_arn" {
  value       = var.acm_certificate_arn != "" ? aws_lb_listener.https[0].arn : null
  description = "The ARN of the HTTPS listener (if certificate is provided)"
}

output "http_listener_arn" {
  value       = aws_lb_listener.http.arn
  description = "The ARN of the HTTP listener"
}

output "security_group_id" {
  value       = aws_security_group.ecs_tasks_sg.id
  description = "The ID of the security group for ECS tasks"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb_sg.id
  description = "The ID of the security group for the application load balancer"
}

output "cloudwatch_log_group_name" {
  value       = aws_cloudwatch_log_group.ecs_logs.name
  description = "The name of the CloudWatch log group for ECS container logs"
}

output "cloudwatch_log_group_arn" {
  value       = aws_cloudwatch_log_group.ecs_logs.arn
  description = "The ARN of the CloudWatch log group for ECS container logs"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "The ARN of the SNS topic for ECS alerts"
}

output "autoscaling_target_web_id" {
  value       = var.enable_autoscaling ? aws_appautoscaling_target.web_target[0].resource_id : null
  description = "The resource ID of the web service auto-scaling target (if auto-scaling is enabled)"
}

output "autoscaling_target_worker_id" {
  value       = var.enable_autoscaling ? aws_appautoscaling_target.worker_target[0].resource_id : null
  description = "The resource ID of the worker service auto-scaling target (if auto-scaling is enabled)"
}

output "dashboard_name" {
  value       = aws_cloudwatch_dashboard.ecs_dashboard.dashboard_name
  description = "The name of the CloudWatch dashboard for ECS monitoring"
}