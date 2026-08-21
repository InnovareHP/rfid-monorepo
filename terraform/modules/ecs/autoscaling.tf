# Target tracking moves task count between min and max. AWS creates the
# service-linked role on first use, so there is no IAM resource here.
#
# Every service sets ignore_changes on desired_count, so once a scaling target
# attaches, autoscaling owns the count and Terraform stops fighting it.

locals {
  autoscale_services = {
    api = {
      service_name  = aws_ecs_service.api.name
      min           = var.api_min_count
      max           = var.api_max_count
      tg_arn_suffix = aws_lb_target_group.api.arn_suffix
    }
    fe = {
      service_name  = aws_ecs_service.fe.name
      min           = var.fe_min_count
      max           = var.fe_max_count
      tg_arn_suffix = aws_lb_target_group.fe.arn_suffix
    }
    fe-support = {
      service_name  = aws_ecs_service.fe_support.name
      min           = var.fe_support_min_count
      max           = var.fe_support_max_count
      tg_arn_suffix = aws_lb_target_group.fe_support.arn_suffix
    }
    landing = {
      service_name  = aws_ecs_service.landing.name
      min           = var.landing_min_count
      max           = var.landing_max_count
      tg_arn_suffix = aws_lb_target_group.landing.arn_suffix
    }
  }
}

resource "aws_appautoscaling_target" "ecs" {
  for_each = var.enable_autoscaling ? local.autoscale_services : {}

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.this.name}/${each.value.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = each.value.min
  max_capacity       = each.value.max
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = var.enable_autoscaling ? local.autoscale_services : {}

  name               = "${var.name_prefix}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_cpu_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Catches the case where a service is memory-bound (CSV export buffers, PDF
# generation) while CPU stays flat.
resource "aws_appautoscaling_policy" "memory" {
  for_each = var.enable_autoscaling ? local.autoscale_services : {}

  name               = "${var.name_prefix}-${each.key}-mem"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.autoscaling_memory_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# Leading indicator: reacts to traffic before CPU and memory catch up.
resource "aws_appautoscaling_policy" "requests" {
  for_each = var.enable_autoscaling ? local.autoscale_services : {}

  name               = "${var.name_prefix}-${each.key}-req"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.this.arn_suffix}/${each.value.tg_arn_suffix}"
    }
    target_value       = var.autoscaling_requests_per_target
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
  }
}

# BullMQ runs in-process in the API, and queue work is IO-bound on Bedrock and
# SES, so CPU and memory stay low while the queue backs up. Scaling on backlog
# needs a published CloudWatch metric for the waiting count; min_count >= 2
# covers availability until then.
