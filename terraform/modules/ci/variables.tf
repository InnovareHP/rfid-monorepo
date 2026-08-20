variable "github_repo" {
  type        = string
  description = "owner/repo that is trusted to assume this role, main branch pushes only."
}

variable "ecr_repository_arns" {
  type = map(string)
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_service_names" {
  type = list(string)
}

variable "ecs_execution_role_arn" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}

variable "landing_bucket_arn" {
  type = string
}

variable "landing_distribution_id" {
  type = string
}
