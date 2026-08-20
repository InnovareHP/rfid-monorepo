variable "name_prefix" { type = string }
variable "kms_key_arn" { type = string }
variable "s3_bucket_arn" { type = string }
variable "retention_days" { type = number }
variable "cold_storage_after_days" { type = number }

variable "enable_daily_backup" {
  type    = bool
  default = false
}

variable "daily_retention_days" {
  type    = number
  default = 90
}
