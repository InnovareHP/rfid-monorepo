output "deploy_role_arn" { value = aws_iam_role.gha_ecs_deploy.arn }
output "deploy_role_name" { value = aws_iam_role.gha_ecs_deploy.name }
