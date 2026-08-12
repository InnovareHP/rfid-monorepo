variable "name_prefix" { type = string }

variable "alb_arn" {
  type        = string
  description = "ALB to associate the Web ACL with."
}

variable "rate_limit_per_5min" {
  type    = number
  default = 2000
}

variable "enable_logging" {
  type    = bool
  default = true
}

variable "log_retention_days" {
  type        = number
  description = "Expiration for WAF logs in S3. 2557 = 7y."
  default     = 2557
}

variable "managed_rule_excluded_rules" {
  type        = list(string)
  description = "AWSManagedRulesCommonRuleSet rules to Count instead of Block."
  default     = []
}

variable "body_inspection_exempt_paths" {
  type        = list(string)
  description = "URI prefixes exempt from managed-group body inspection. Needs at least two entries when non-empty."
  default     = []
}

variable "force_destroy" {
  type    = bool
  default = false
}
