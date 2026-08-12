variable "bucket_name" { type = string }

variable "force_destroy" {
  type    = bool
  default = false
}

variable "price_class" {
  type    = string
  default = "PriceClass_100"
}

variable "aliases" {
  description = "Custom domains, e.g. [\"refidly.com\", \"www.refidly.com\"]. Applied only when enable_custom_domain is true."
  type        = list(string)
  default     = []
}

# Static, plan-known. The cert ARN and zone id below are computed when the dns
# module creates them, and a for_each or dynamic block driven off an unknown
# value fails the plan. Same reason ecs takes enable_https rather than deriving
# it from the cert ARN.
variable "enable_custom_domain" {
  description = "Serve on the aliases with the supplied cert and create the Route53 records."
  type        = bool
  default     = false
}

variable "acm_certificate_arn" {
  description = "ACM cert in us-east-1. Ignored unless enable_custom_domain is true."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Zone to create the alias records in. Ignored unless enable_custom_domain is true."
  type        = string
  default     = ""
}
