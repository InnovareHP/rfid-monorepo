variable "name_prefix" { type = string }
variable "vpc_cidr" { type = string }
variable "azs" { type = list(string) }
variable "single_nat_gateway" { type = bool }
variable "region" { type = string }

variable "force_destroy" {
  type    = bool
  default = false
}

variable "flow_log_retention_days" {
  type        = number
  description = "Expiration for flow logs in S3. 2557 = 7y."
  default     = 2557
}
