variable "bucket_name" { type = string }

variable "force_destroy" {
  type    = bool
  default = false
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "noncurrent_retention_days" {
  type        = number
  description = "Days to keep noncurrent object versions."
  default     = 2557
}

variable "private_expiration_days" {
  type        = number
  description = "Expire objects under private/ after N days. 0 = never."
  default     = 0
}

variable "enable_replication" {
  type    = bool
  default = false
}

variable "replication_role_arn" {
  type    = string
  default = ""
}

variable "replication_destination_bucket_arn" {
  type    = string
  default = ""
}
