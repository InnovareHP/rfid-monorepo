variable "name_prefix" { type = string }
variable "kms_key_arn" { type = string }
variable "audit_log_retention_days" { type = number }

variable "force_destroy" {
  type    = bool
  default = false
}
