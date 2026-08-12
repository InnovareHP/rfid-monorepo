variable "name_prefix" { type = string }
variable "vpc_id" { type = string }

variable "alb_cloudflare_only" {
  type    = bool
  default = false
}
