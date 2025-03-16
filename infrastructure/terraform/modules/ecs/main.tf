# Data sources to get AWS account ID and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Create ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = merge(var.common_tags, { Name = var.cluster_name })
}

# CloudWatch Log Group for ECS logs
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.environment}/${var.cluster_name}"
  retention_in_days = 30
  tags              = var.common_tags
}

# Security Group for the ALB
resource "aws_security_group" "alb_sg" {
  name        = "${var.environment}-alb-sg"
  description = "Security group for the application load balancer"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-alb-sg" })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks_sg" {
  name        = "${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.alb_sg.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-ecs-tasks-sg" })
}

# Application Load Balancer
resource "aws_lb" "main" {
  name                       = "${var.environment}-alb"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb_sg.id]
  subnets                    = var.public_subnet_ids
  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2               = true
  idle_timeout               = 60
  
  access_logs {
    bucket  = var.log_bucket_name
    prefix  = "alb-logs"
    enabled = true
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-alb" })
}

# Target Group for the web service
resource "aws_lb_target_group" "web" {
  name                 = "${var.environment}-web-tg"
  port                 = var.web_container_port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  
  health_check {
    enabled             = true
    path                = var.health_check_path
    port                = "traffic-port"
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    timeout             = var.health_check_timeout
    interval            = var.health_check_interval
    matcher             = "200-299"
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-web-tg" })
}

# HTTP Listener for the ALB
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type = var.acm_certificate_arn != "" ? "redirect" : "forward"
    
    dynamic "redirect" {
      for_each = var.acm_certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    
    target_group_arn = var.acm_certificate_arn != "" ? null : aws_lb_target_group.web.arn
  }
}

# HTTPS Listener for the ALB (conditional on certificate)
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.acm_certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-ecs-task-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# Attach policy to Task Execution Role
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.environment}-ecs-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# S3 access policy for ECS Tasks
resource "aws_iam_policy" "ecs_task_s3_access" {
  name        = "${var.environment}-ecs-task-s3-access"
  description = "Allow ECS tasks to access S3 buckets"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ],
        Resource = [
          "arn:aws:s3:::${var.document_bucket_name}",
          "arn:aws:s3:::${var.document_bucket_name}/*"
        ]
      }
    ]
  })
}

# Attach S3 policy to Task Role
resource "aws_iam_role_policy_attachment" "ecs_task_s3_access_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_s3_access.arn
}

# SQS access policy for ECS Tasks (conditional)
resource "aws_iam_policy" "ecs_task_sqs_access" {
  count       = var.sqs_queue_name != "" ? 1 : 0
  name        = "${var.environment}-ecs-task-sqs-access"
  description = "Allow ECS tasks to access SQS queues"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ],
        Resource = "arn:aws:sqs:${var.region}:*:${var.sqs_queue_name}*"
      }
    ]
  })
}

# Attach SQS policy to Task Role (conditional)
resource "aws_iam_role_policy_attachment" "ecs_task_sqs_access_attachment" {
  count      = var.sqs_queue_name != "" ? 1 : 0
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_sqs_access[0].arn
}

# Task Definition for the web service
resource "aws_ecs_task_definition" "web" {
  family                   = "${var.environment}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.web_container_cpu
  memory                   = var.web_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name = "web",
      image = var.web_container_image,
      essential = true,
      portMappings = [
        {
          containerPort = var.web_container_port,
          hostPort = var.web_container_port,
          protocol = "tcp"
        }
      ],
      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "DOCUMENT_BUCKET", value = var.document_bucket_name }
      ],
      secrets = [
        { name = "DB_PASSWORD", valueFrom = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/db/password" }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group" = aws_cloudwatch_log_group.ecs_logs.name,
          "awslogs-region" = var.region,
          "awslogs-stream-prefix" = "web"
        }
      },
      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:${var.web_container_port}${var.health_check_path} || exit 1"],
        interval = 30,
        timeout = 5,
        retries = 3,
        startPeriod = 60
      }
    }
  ])
  
  tags = merge(var.common_tags, { Name = "${var.environment}-web-task" })
}

# ECS Service for the web application
resource "aws_ecs_service" "web" {
  name                               = "${var.environment}-web-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.web.arn
  desired_count                      = var.web_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds  = 60
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = var.web_container_port
  }
  
  deployment_controller {
    type = "ECS"
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-web-service" })
}

# Task Definition for the worker service
resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.environment}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_container_cpu
  memory                   = var.worker_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name = "worker",
      image = var.worker_container_image,
      essential = true,
      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "DOCUMENT_BUCKET", value = var.document_bucket_name },
        { name = "QUEUE_CONNECTION", value = "sqs" },
        { name = "SQS_QUEUE", value = var.sqs_queue_name }
      ],
      secrets = [
        { name = "DB_PASSWORD", valueFrom = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/db/password" }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group" = aws_cloudwatch_log_group.ecs_logs.name,
          "awslogs-region" = var.region,
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])
  
  tags = merge(var.common_tags, { Name = "${var.environment}-worker-task" })
}

# ECS Service for the worker processes
resource "aws_ecs_service" "worker" {
  name                               = "${var.environment}-worker-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.worker.arn
  desired_count                      = var.worker_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
  
  deployment_controller {
    type = "ECS"
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-worker-service" })
}

# Task Definition for the scheduler service
resource "aws_ecs_task_definition" "scheduler" {
  family                   = "${var.environment}-scheduler"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.scheduler_container_cpu
  memory                   = var.scheduler_container_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name = "scheduler",
      image = var.scheduler_container_image,
      essential = true,
      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "REDIS_HOST", value = var.redis_host },
        { name = "DOCUMENT_BUCKET", value = var.document_bucket_name },
        { name = "QUEUE_CONNECTION", value = "sqs" },
        { name = "SQS_QUEUE", value = var.sqs_queue_name }
      ],
      secrets = [
        { name = "DB_PASSWORD", valueFrom = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/db/password" }
      ],
      logConfiguration = {
        logDriver = "awslogs",
        options = {
          "awslogs-group" = aws_cloudwatch_log_group.ecs_logs.name,
          "awslogs-region" = var.region,
          "awslogs-stream-prefix" = "scheduler"
        }
      }
    }
  ])
  
  tags = merge(var.common_tags, { Name = "${var.environment}-scheduler-task" })
}

# ECS Service for the scheduler process
resource "aws_ecs_service" "scheduler" {
  name                               = "${var.environment}-scheduler-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.scheduler.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }
  
  deployment_controller {
    type = "ECS"
  }
  
  tags = merge(var.common_tags, { Name = "${var.environment}-scheduler-service" })
}

# Auto Scaling for the web service
resource "aws_appautoscaling_target" "web_target" {
  count              = var.enable_autoscaling ? 1 : 0
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.web_min_count
  max_capacity       = var.web_max_count
}

# CPU-based Auto Scaling policy for the web service
resource "aws_appautoscaling_policy" "web_cpu_policy" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.environment}-web-cpu-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web_target[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_utilization_high_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Request Count-based Auto Scaling policy for the web service
resource "aws_appautoscaling_policy" "web_request_policy" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.environment}-web-request-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web_target[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.web.arn_suffix}"
    }
    target_value       = 1000
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Auto Scaling for the worker service
resource "aws_appautoscaling_target" "worker_target" {
  count              = var.enable_autoscaling ? 1 : 0
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.worker_min_count
  max_capacity       = var.worker_max_count
}

# CPU-based Auto Scaling policy for the worker service
resource "aws_appautoscaling_policy" "worker_cpu_policy" {
  count              = var.enable_autoscaling ? 1 : 0
  name               = "${var.environment}-worker-cpu-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.worker_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker_target[0].service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_utilization_high_threshold
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# CloudWatch Alarm for web service high CPU
resource "aws_cloudwatch_metric_alarm" "web_cpu_high" {
  alarm_name          = "${var.environment}-web-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.cpu_utilization_high_threshold
  alarm_description   = "This metric monitors ECS web service CPU utilization"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.web.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# CloudWatch Alarm for worker service high CPU
resource "aws_cloudwatch_metric_alarm" "worker_cpu_high" {
  alarm_name          = "${var.environment}-worker-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.cpu_utilization_high_threshold
  alarm_description   = "This metric monitors ECS worker service CPU utilization"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.worker.name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-ecs-alerts"
  tags = var.common_tags
}

# Store the database password in SSM Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name        = "/${var.environment}/db/password"
  type        = "SecureString"
  value       = var.db_password
  description = "Database password for the ${var.environment} environment"
  tags        = var.common_tags
}

# CloudWatch Dashboard for ECS monitoring
resource "aws_cloudwatch_dashboard" "ecs_dashboard" {
  dashboard_name = "${var.environment}-ecs-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric",
        x = 0,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.web.name, "ClusterName", aws_ecs_cluster.main.name],
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.worker.name, "ClusterName", aws_ecs_cluster.main.name]
          ],
          period = 300,
          stat = "Average",
          region = var.region,
          title = "ECS CPU Utilization"
        }
      },
      {
        type = "metric",
        x = 12,
        y = 0,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ServiceName", aws_ecs_service.web.name, "ClusterName", aws_ecs_cluster.main.name],
            ["AWS/ECS", "MemoryUtilization", "ServiceName", aws_ecs_service.worker.name, "ClusterName", aws_ecs_cluster.main.name]
          ],
          period = 300,
          stat = "Average",
          region = var.region,
          title = "ECS Memory Utilization"
        }
      },
      {
        type = "metric",
        x = 0,
        y = 6,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix]
          ],
          period = 300,
          stat = "Sum",
          region = var.region,
          title = "ALB Request Count"
        }
      },
      {
        type = "metric",
        x = 12,
        y = 6,
        width = 12,
        height = 6,
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix]
          ],
          period = 300,
          stat = "Average",
          region = var.region,
          title = "ALB Response Time"
        }
      }
    ]
  })
}