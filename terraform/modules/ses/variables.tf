variable "name_prefix" { type = string }
variable "region" { type = string }
variable "kms_key_arn" { type = string }

variable "sending_domain" {
  type    = string
  default = ""
}

# Envelope sender domain. Without one the bounce path stays amazonses.com, so
# SPF passes for AWS and never aligns with the From domain - DMARC then rests on
# DKIM alone, which Exchange Online scores lower than both aligned.
variable "mail_from_subdomain" {
  type        = string
  description = "Subdomain of sending_domain used as MAIL FROM, e.g. mail.refidly.com. Empty = SES default."
  default     = ""
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
