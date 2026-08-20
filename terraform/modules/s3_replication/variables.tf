variable "name_prefix" { type = string }
variable "source_bucket_name" { type = string }
variable "source_bucket_arn" { type = string }
variable "replica_region" { type = string }

variable "noncurrent_retention_days" {
  type    = number
  default = 2557
}

variable "force_destroy" {
  type    = bool
  default = false
}
