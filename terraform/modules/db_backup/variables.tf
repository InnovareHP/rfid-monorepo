variable "bucket_name" { type = string }
variable "kms_key_arn" { type = string }

variable "retention_days" {
  type        = number
  description = "Object Lock retention and lifecycle expiration. 2557 = 7y."
  default     = 2557
}

variable "cold_storage_after_days" {
  type    = number
  default = 90
}

# COMPLIANCE-mode objects still cannot be deleted before retention expires, so
# destroy fails until then regardless of this flag.
variable "force_destroy" {
  type    = bool
  default = false
}
