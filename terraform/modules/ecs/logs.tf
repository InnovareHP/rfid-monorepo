# Container stdout only, on app_log_retention_days. The audit record lives in
# CloudTrail, the AuditLog table and the flow logs, all on the 7-year knob.
resource "aws_cloudwatch_log_group" "service" {
  for_each = toset(local.ecr_repositories)

  name              = "/ecs/${var.name_prefix}/${each.value}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.logs_kms_key_arn
}
