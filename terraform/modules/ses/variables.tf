variable "name_prefix" { type = string }
variable "region" { type = string }
variable "kms_key_arn" { type = string }

variable "sending_domain" {
  type    = string
  default = ""
}

variable "enable_inbound" {
  type    = bool
  default = false
}

variable "inbound_domain" {
  type        = string
  description = "Ingest-only subdomain. Never the organization's real mail domain."
  default     = ""
}

variable "webhook_url" {
  type    = string
  default = ""
}

variable "raw_retention_days" {
  type    = number
  default = 7
}

variable "create_receipt_rule_set" {
  type    = bool
  default = true
}

variable "force_destroy" {
  type    = bool
  default = false
}
