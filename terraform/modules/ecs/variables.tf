variable "name_prefix" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "alb_sg_id" { type = string }
variable "ecs_sg_id" { type = string }

variable "logs_kms_key_arn" { type = string }
variable "secrets_kms_key_arn" { type = string }

variable "uploads_bucket" { type = string }
variable "uploads_bucket_arn" { type = string }
variable "uploads_public_cdn_url" { type = string }

variable "redis_url_secret_arn" { type = string }

# ── Sizing ─────────────────────────────────────────────────
variable "api_cpu" { type = number }
variable "api_memory" { type = number }
variable "api_desired_count" { type = number }
variable "fe_cpu" { type = number }
variable "fe_memory" { type = number }
variable "fe_desired_count" { type = number }
variable "fe_support_cpu" { type = number }
variable "fe_support_memory" { type = number }
variable "fe_support_desired_count" { type = number }
variable "landing_cpu" { type = number }
variable "landing_memory" { type = number }
variable "landing_desired_count" { type = number }

variable "frontend_spot_weight" {
  type        = number
  description = "FARGATE_SPOT weight above the one on-demand base task on fe and fe-support. 0 disables Spot."
  default     = 3
}

variable "cpu_architecture" {
  type    = string
  default = "X86_64"
}

variable "image_tag_mutability" {
  type        = string
  description = "IMMUTABLE gives a rollback something to roll back to, but requires CI to tag by commit SHA rather than latest."
  default     = "MUTABLE"
}

variable "api_image_tag" { type = string }
variable "fe_image_tag" { type = string }
variable "fe_support_image_tag" { type = string }
variable "landing_image_tag" { type = string }

variable "log_retention_days" { type = number }
variable "container_insights_enabled" { type = bool }

# ── Autoscaling ────────────────────────────────────────────
variable "enable_autoscaling" { type = bool }
variable "api_min_count" { type = number }
variable "api_max_count" { type = number }
variable "fe_min_count" { type = number }
variable "fe_max_count" { type = number }
variable "fe_support_min_count" { type = number }
variable "fe_support_max_count" { type = number }
variable "landing_min_count" { type = number }
variable "landing_max_count" { type = number }
variable "autoscaling_cpu_target" { type = number }
variable "autoscaling_memory_target" { type = number }
variable "autoscaling_requests_per_target" { type = number }
variable "autoscaling_scale_in_cooldown" { type = number }
variable "autoscaling_scale_out_cooldown" { type = number }

# ── TLS and hostnames ──────────────────────────────────────
variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "enable_https" {
  type        = bool
  description = "Static, plan-known. Drives listener counts; the cert ARN itself may be computed."
  default     = false
}

variable "app_hostname" {
  type    = string
  default = ""
}

variable "api_hostname" {
  type    = string
  default = ""
}

variable "support_hostname" {
  type    = string
  default = ""
}

# Empty by default: apex/www currently serve via the landing_site CloudFront
# module. Set this once you decide this ECS service should take over that
# traffic instead, and wire the matching DNS record yourself.
variable "landing_hostname" {
  type    = string
  default = ""
}

# ── App config ─────────────────────────────────────────────
variable "app_email" { type = string }
variable "ses_from_email" { type = string }
variable "ses_configuration_set" { type = string }

variable "ses_inbound_bucket" {
  type    = string
  default = ""
}

variable "ses_inbound_bucket_arn" {
  type    = string
  default = ""
}

variable "ses_inbound_topic_arn" {
  type    = string
  default = ""
}

variable "email_ingest_domain" {
  type    = string
  default = ""
}

variable "email_logo_url" {
  type    = string
  default = ""
}

variable "bedrock_model_id" { type = string }
variable "bedrock_vision_model_id" { type = string }
variable "log_level" { type = string }
variable "ai_scrub_phi" { type = string }
variable "retention_purge_enabled" { type = string }
variable "email_open_tracking" { type = string }
variable "eldonfax_base_url" { type = string }
