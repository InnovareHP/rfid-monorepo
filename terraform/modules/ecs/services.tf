locals {
  # HTTPS hostnames once DNS and ACM are wired, else the bare ALB over HTTP.
  # app-config.ts validates these with z.url(), which accepts either.
  api_url     = var.api_hostname != "" ? "https://${var.api_hostname}" : "http://${aws_lb.this.dns_name}"
  app_url     = var.app_hostname != "" ? "https://${var.app_hostname}" : "http://${aws_lb.this.dns_name}"
  support_url = var.support_hostname != "" ? "https://${var.support_hostname}" : "http://${aws_lb.this.dns_name}"

  # Registrable parent of the app hostname, so a passkey registered on
  # app.<domain> still verifies against api.<domain>.
  passkey_rp_id = (
    var.app_hostname != "" && length(split(".", var.app_hostname)) >= 2
    ? join(".", slice(split(".", var.app_hostname), length(split(".", var.app_hostname)) - 2, length(split(".", var.app_hostname))))
    : "localhost"
  )

  # AWS credentials are not injected here. app-config.ts still requires them,
  # so they come from the app secret; once that requirement is dropped the
  # Fargate task role supplies them through IMDS instead.
  api_env = concat([
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "8080" },
    { name = "APP_NAME", value = var.name_prefix },
    { name = "AWS_REGION", value = var.region },

    { name = "API_URL", value = local.api_url },
    { name = "WEBSITE_URL", value = local.app_url },
    { name = "SUPPORT_URL", value = local.support_url },
    { name = "BETTER_AUTH_URL", value = local.api_url },
    { name = "PASSKEY_RP_ID", value = local.passkey_rp_id },

    { name = "S3_UPLOADS_BUCKET", value = var.uploads_bucket },
    { name = "S3_PUBLIC_BASE_URL", value = var.uploads_public_cdn_url },

    { name = "APP_EMAIL", value = var.app_email },
    { name = "SES_FROM_EMAIL", value = var.ses_from_email },
    { name = "SES_CONFIGURATION_SET", value = var.ses_configuration_set },
    { name = "EMAIL_OPEN_TRACKING", value = var.email_open_tracking },

    { name = "BEDROCK_MODEL_ID", value = var.bedrock_model_id },
    { name = "BEDROCK_VISION_MODEL_ID", value = var.bedrock_vision_model_id },
    { name = "AI_SCRUB_PHI", value = var.ai_scrub_phi },
    { name = "RETENTION_PURGE_ENABLED", value = var.retention_purge_enabled },

    { name = "LOG_LEVEL", value = var.log_level },
    { name = "LOG_SERVICE", value = "api" },
    { name = "ELDONFAX_BASE_URL", value = var.eldonfax_base_url },
    ],
    # Every entry below is optional in app-config.ts but declared with
    # .min(1) or z.url(), so an empty string fails validation and the
    # container exits before listen(). Inject only when set.
    var.email_logo_url != "" ? [{ name = "EMAIL_LOGO_URL", value = var.email_logo_url }] : [],
    var.email_ingest_domain != "" ? [{ name = "EMAIL_INGEST_DOMAIN", value = var.email_ingest_domain }] : [],
    var.ses_inbound_bucket != "" ? [{ name = "SES_INBOUND_BUCKET", value = var.ses_inbound_bucket }] : [],
    var.ses_inbound_topic_arn != "" ? [{ name = "SES_INBOUND_SNS_TOPIC_ARN", value = var.ses_inbound_topic_arn }] : [],
  )

  app_secret_keys = [
    "DATABASE_URL",
    "JWT_SECRET",
    "BETTER_AUTH_SECRET",
    "ENCRYPTION_KEY",
    "AUDIT_HMAC_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ESSENTIALS_SEAT",
    "STRIPE_PRICE_GROWTH_SEAT",
    "STRIPE_PRICE_SCALE_SEAT",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ]

  api_secrets = concat(
    [
      { name = "REDIS_URL", valueFrom = var.redis_url_secret_arn },
    ],
    [
      for k in local.app_secret_keys : {
        name      = k
        valueFrom = "${aws_secretsmanager_secret.app.arn}:${k}::"
      }
    ],
  )

  # One on-demand task guarantees the target group is never empty during a
  # Spot capacity crunch; everything above it rides Spot.
  frontend_capacity_strategy = var.frontend_spot_weight > 0 ? [
    { capacity_provider = "FARGATE", weight = 1, base = 1 },
    { capacity_provider = "FARGATE_SPOT", weight = var.frontend_spot_weight, base = 0 },
  ] : []
}

# ── API ──────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name_prefix}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([{
    name      = "api"
    image     = "${aws_ecr_repository.this["api"].repository_url}:${var.api_image_tag}"
    essential = true

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    environment = local.api_env
    secrets     = local.api_secrets

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["api"].name
        awslogs-region        = var.region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "api" {
  name            = "${var.name_prefix}-api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count

  # Fully on-demand. The API holds Stripe webhooks, uploads and socket.io
  # connections, none of which want a two-minute Spot eviction notice.
  launch_type = "FARGATE"

  # Lets `aws ecs execute-command` open a shell in the task to run one-off
  # admin commands from inside the VPC, now that Postgres is private.
  enable_execute_command = true

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8080
  }

  # Prisma client warmup plus Redis and Postgres connects run before the first
  # health probe can succeed. Without the grace period ECS kills the task and
  # the service crash-loops.
  health_check_grace_period_seconds = 120

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # CI updates the task definition and autoscaling owns the count.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
}

# ── FE ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "fe" {
  family                   = "${var.name_prefix}-fe"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.fe_cpu
  memory                   = var.fe_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  # VITE_* values are baked in at image build time, so nothing here configures
  # the bundle. Pass them as docker build args in CI instead.
  container_definitions = jsonencode([{
    name      = "fe"
    image     = "${aws_ecr_repository.this["fe"].repository_url}:${var.fe_image_tag}"
    essential = true

    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["fe"].name
        awslogs-region        = var.region
        awslogs-stream-prefix = "fe"
      }
    }
  }])
}

resource "aws_ecs_service" "fe" {
  name            = "${var.name_prefix}-fe"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.fe.arn
  desired_count   = var.fe_desired_count
  launch_type     = var.frontend_spot_weight > 0 ? null : "FARGATE"

  dynamic "capacity_provider_strategy" {
    for_each = local.frontend_capacity_strategy
    content {
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = capacity_provider_strategy.value.weight
      base              = capacity_provider_strategy.value.base
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.fe.arn
    container_name   = "fe"
    container_port   = 3000
  }

  health_check_grace_period_seconds = 120

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
}

# ── FE support ───────────────────────────────────────────
resource "aws_ecs_task_definition" "fe_support" {
  family                   = "${var.name_prefix}-fe-support"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.fe_support_cpu
  memory                   = var.fe_support_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  container_definitions = jsonencode([{
    name      = "fe-support"
    image     = "${aws_ecr_repository.this["fe-support"].repository_url}:${var.fe_support_image_tag}"
    essential = true

    portMappings = [{ containerPort = 3001, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["fe-support"].name
        awslogs-region        = var.region
        awslogs-stream-prefix = "fe-support"
      }
    }
  }])
}

resource "aws_ecs_service" "fe_support" {
  name            = "${var.name_prefix}-fe-support"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.fe_support.arn
  desired_count   = var.fe_support_desired_count
  launch_type     = var.frontend_spot_weight > 0 ? null : "FARGATE"

  dynamic "capacity_provider_strategy" {
    for_each = local.frontend_capacity_strategy
    content {
      capacity_provider = capacity_provider_strategy.value.capacity_provider
      weight            = capacity_provider_strategy.value.weight
      base              = capacity_provider_strategy.value.base
    }
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.fe_support.arn
    container_name   = "fe-support"
    container_port   = 3001
  }

  health_check_grace_period_seconds = 120

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }

  depends_on = [aws_lb_listener.http]
}
