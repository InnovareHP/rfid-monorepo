variable "name_prefix" { type = string }
variable "kms_key_arn" { type = string }

variable "alert_emails" {
  type    = list(string)
  default = []
}

variable "backup_vault_name" {
  type    = string
  default = ""
}

variable "source_bucket_name" {
  type    = string
  default = ""
}

variable "replication_rule_id" {
  type    = string
  default = "uploads-crr"
}

variable "replication_lag_threshold_seconds" {
  type        = number
  description = "Replication Time Control SLA is 900s."
  default     = 900
}

variable "ecs_cluster_name" {
  type    = string
  default = ""
}

variable "ecs_services_to_watch" {
  type    = list(string)
  default = []
}

variable "container_insights_enabled" {
  type        = bool
  description = "RunningTaskCount alarms only work when Container Insights publishes the metric."
  default     = false
}

variable "db_instance_id" {
  type    = string
  default = ""
}

variable "db_free_storage_threshold_bytes" {
  type        = number
  description = "10 GiB."
  default     = 10737418240
}

variable "db_connection_threshold" {
  type    = number
  default = 150
}
