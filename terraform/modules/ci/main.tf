data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Provisioned once, outside this stack. Referenced, not owned, since other
# repos' CI roles trust the same provider.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  ecs_service_arns = [
    for name in var.ecs_service_names :
    "arn:aws:ecs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:service/${var.ecs_cluster_name}/${name}"
  ]

  landing_distribution_arn = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.landing_distribution_id}"
}

resource "aws_iam_role" "gha_ecs_deploy" {
  name        = "gha-ecs-deploy"
  description = "GitHub Actions: build/push images, deploy ECS services, deploy landing site. ${var.github_repo} main branch only."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/main"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "gha_ecs_deploy" {
  name = "ecs-deploy-permissions"
  role = aws_iam_role.gha_ecs_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "EcrAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid = "EcrPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = values(var.ecr_repository_arns)
      },
      {
        Sid = "EcsDescribeRegister"
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
        ]
        # Neither action supports resource-level restriction.
        Resource = "*"
      },
      {
        Sid = "EcsDeploy"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService",
        ]
        Resource = local.ecs_service_arns
      },
      {
        Sid      = "PassEcsRoles"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = [var.ecs_execution_role_arn, var.ecs_task_role_arn]
        Condition = {
          StringEquals = { "iam:PassedToService" = "ecs-tasks.amazonaws.com" }
        }
      },
      {
        Sid = "LandingDeploy"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [var.landing_bucket_arn, "${var.landing_bucket_arn}/*"]
      },
      {
        Sid      = "LandingInvalidate"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = local.landing_distribution_arn
      },
    ]
  })
}
