variable "domain_name" {
  type        = string
  description = "Apex domain, e.g. refidly.com."
}

variable "alb_subdomains" {
  type        = list(string)
  description = "Subdomains pointed at the ALB."
  default     = ["app", "api", "support"]
}

variable "create_zone" {
  type    = bool
  default = true
}

variable "existing_zone_id" {
  type    = string
  default = ""
}

variable "alb_dns_name" { type = string }
variable "alb_zone_id" { type = string }
