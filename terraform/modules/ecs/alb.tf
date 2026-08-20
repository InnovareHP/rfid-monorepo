resource "aws_lb" "this" {
  name               = "${substr(var.name_prefix, 0, 26)}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  drop_invalid_header_fields = true

  # socket.io keeps a connection open between events. The default 60s idle
  # timeout closes it mid-session and the client reconnects in a loop.
  idle_timeout = 300
}

resource "aws_lb_target_group" "api" {
  name        = "${substr(var.name_prefix, 0, 24)}-api-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 15
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # socket.io's polling transport does the handshake over several requests and
  # they must all land on the same task. Harmless for the REST routes.
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  deregistration_delay = 30
}

resource "aws_lb_target_group" "fe" {
  name        = "${substr(var.name_prefix, 0, 25)}-fe-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

resource "aws_lb_target_group" "fe_support" {
  name        = "${substr(var.name_prefix, 0, 20)}-sup-tg"
  port        = 3001
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

resource "aws_lb_target_group" "landing" {
  name        = "${substr(var.name_prefix, 0, 21)}-land-tg"
  port        = 3002
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

locals {
  # Static, plan-known. var.acm_certificate_arn is often a computed cert ARN,
  # and driving listener counts off it makes the first plan fail.
  https_enabled = var.enable_https
}

# Redirect everything to HTTPS once a cert exists. Before that, forward to
# landing (it's the apex/www site) with path rules for the other services so
# the whole stack is reachable during bootstrap.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = local.https_enabled ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = local.https_enabled ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    target_group_arn = local.https_enabled ? null : aws_lb_target_group.landing.arn
  }
}

resource "aws_lb_listener_rule" "api_http" {
  count        = local.https_enabled ? 0 : 1
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "support_http" {
  count        = local.https_enabled ? 0 : 1
  listener_arn = aws_lb_listener.http.arn
  priority     = 90

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fe_support.arn
  }

  condition {
    path_pattern {
      values = ["/support/*"]
    }
  }
}

resource "aws_lb_listener_rule" "portal_http" {
  count        = local.https_enabled ? 0 : 1
  listener_arn = aws_lb_listener.http.arn
  priority     = 80

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fe.arn
  }

  condition {
    path_pattern {
      values = ["/portal/*"]
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = local.https_enabled ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.landing.arn
  }
}

resource "aws_lb_listener_rule" "api_host" {
  count        = local.https_enabled && var.api_hostname != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = [var.api_hostname]
    }
  }
}

resource "aws_lb_listener_rule" "app_host" {
  count        = local.https_enabled && var.app_hostname != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fe.arn
  }

  condition {
    host_header {
      values = [var.app_hostname]
    }
  }
}

resource "aws_lb_listener_rule" "support_host" {
  count        = local.https_enabled && var.support_hostname != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.fe_support.arn
  }

  condition {
    host_header {
      values = [var.support_hostname]
    }
  }
}

# Matches apex + www once var.landing_hostnames is set (see local.fqdn_www /
# var.domain_name in root main.tf).
resource "aws_lb_listener_rule" "landing_host" {
  count        = local.https_enabled && length(var.landing_hostnames) > 0 ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 40

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.landing.arn
  }

  condition {
    host_header {
      values = var.landing_hostnames
    }
  }
}
