data "aws_caller_identity" "current" {}

resource "aws_sns_topic" "alerts" {
  name              = "${var.name_prefix}-alerts"
  kms_master_key_id = var.kms_key_arn
}

data "aws_iam_policy_document" "topic" {
  statement {
    sid    = "AllowAccountOwner"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    # A topic-attached policy can only grant topic-scoped actions. Account-scoped
    # (CreateTopic, ListTopics) and subscription-scoped (Unsubscribe) actions are
    # rejected as out of service scope.
    actions = [
      "sns:Publish",
      "sns:Subscribe",
      "sns:GetTopicAttributes",
      "sns:SetTopicAttributes",
      "sns:AddPermission",
      "sns:RemovePermission",
      "sns:ListSubscriptionsByTopic",
    ]
    resources = [aws_sns_topic.alerts.arn]
  }

  statement {
    sid    = "AllowAwsServices"
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = [
        "backup.amazonaws.com",
        "events.amazonaws.com",
        "cloudwatch.amazonaws.com",
        "s3.amazonaws.com",
      ]
    }
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]
  }
}

resource "aws_sns_topic_policy" "alerts" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.topic.json
}

# Each address gets a confirmation email after the first apply.
resource "aws_sns_topic_subscription" "email" {
  for_each  = toset(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_backup_vault_notifications" "this" {
  count             = var.backup_vault_name != "" ? 1 : 0
  backup_vault_name = var.backup_vault_name
  sns_topic_arn     = aws_sns_topic.alerts.arn
  backup_vault_events = [
    "BACKUP_JOB_FAILED",
    "BACKUP_JOB_EXPIRED",
    "RESTORE_JOB_FAILED",
    "COPY_JOB_FAILED",
    "RECOVERY_POINT_MODIFIED",
  ]
}

# ── Replication ────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "replication_lag" {
  count = var.source_bucket_name != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-s3-replication-lag"
  alarm_description   = "Cross-region replication latency exceeded the RTC SLA"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicationLatency"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.replication_lag_threshold_seconds
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    SourceBucket = var.source_bucket_name
    RuleId       = var.replication_rule_id
  }
}

resource "aws_cloudwatch_metric_alarm" "replication_failures" {
  count = var.source_bucket_name != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-s3-replication-failures"
  alarm_description   = "Objects failing to replicate cross-region"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "OperationsFailedReplication"
  namespace           = "AWS/S3"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    SourceBucket = var.source_bucket_name
    RuleId       = var.replication_rule_id
  }
}

# ── ECS ────────────────────────────────────────────────────
# RunningTaskCount lives in ECS/ContainerInsights, which only publishes when
# Container Insights is on. The CPU alarm below uses the free AWS/ECS
# namespace, so service health is still covered with Insights off.
resource "aws_cloudwatch_metric_alarm" "ecs_tasks_low" {
  for_each = var.container_insights_enabled ? toset(var.ecs_services_to_watch) : toset([])

  alarm_name          = "${var.name_prefix}-ecs-${each.value}-tasks-low"
  alarm_description   = "ECS service ${each.value} has no running tasks"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  treat_missing_data  = "breaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }
}

# AWS/ECS CPUUtilization stops reporting entirely when a service has no tasks,
# so treat_missing_data = breaching turns silence into a page.
resource "aws_cloudwatch_metric_alarm" "ecs_service_silent" {
  for_each = toset(var.ecs_services_to_watch)

  alarm_name          = "${var.name_prefix}-ecs-${each.value}-silent"
  alarm_description   = "ECS service ${each.value} stopped reporting metrics"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  treat_missing_data  = "breaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = each.value
  }
}

# ── RDS ────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "db_storage_low" {
  count = var.db_instance_id != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-rds-storage-low"
  alarm_description   = "Free storage below threshold. Autoscaling should have grown it already."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.db_free_storage_threshold_bytes
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}

# Prisma opens a pool per task, so a scale-out event multiplies connections.
resource "aws_cloudwatch_metric_alarm" "db_connections_high" {
  count = var.db_instance_id != "" ? 1 : 0

  alarm_name          = "${var.name_prefix}-rds-connections-high"
  alarm_description   = "Database connection count approaching the instance limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.db_connection_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}
