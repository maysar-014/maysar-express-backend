# Enhanced Monitoring & Alerting Infrastructure
# Complete SLO dashboard implementation with PagerDuty integration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

locals {
  service_names = [
    "api-gateway",
    "auth-service",
    "order-service",
    "payment-service",
    "inventory-service",
    "logistics-service",
    "notification-service",
    "analytics-service"
  ]

  slo_targets = {
    api-gateway     = { availability = 99.95, latency_p95 = 200 }
    auth-service    = { availability = 99.95, latency_p95 = 250 }
    order-service   = { availability = 99.95, latency_p95 = 300 }
    payment-service = { availability = 99.9,  latency_p95 = 400 }
    inventory-service = { availability = 99.95, latency_p95 = 200 }
    logistics-service = { availability = 99.9,  latency_p95 = 500 }
    notification-service = { availability = 99.5, latency_p95 = 1000 }
    analytics-service = { availability = 99.9, latency_p95 = 2000 }
  }
}

# CloudWatch Alarms for SLO Tracking
resource "aws_cloudwatch_metric_alarm" "slo_availability" {
  for_each = local.slo_targets

  alarm_name          = "maysar-${each.key}-slo-availability-breach"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = each.value.availability / 100
  alarm_description   = "SLO availability breach for ${each.key}: target ${each.value.availability}%"

  dimensions = {
    LoadBalancer = aws_lb.api_gateway.arn_suffix
  }

  alarm_actions = [aws_sns_topic.slo_alerts.arn]
  ok_actions    = [aws_sns_topic.slo_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "slo_latency" {
  for_each = local.slo_targets

  alarm_name          = "maysar-${each.key}-slo-latency-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "5"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "p95"
  threshold           = each.value.latency_p95
  alarm_description   = "SLO latency breach for ${each.key}: target ${each.value.latency_p95}ms p95"

  dimensions = {
    LoadBalancer = aws_lb.api_gateway.arn_suffix
  }

  alarm_actions = [aws_sns_topic.slo_alerts.arn]
  ok_actions    = [aws_sns_topic.slo_alerts.arn]
}

# Error Budget Tracking
resource "aws_cloudwatch_metric_alarm" "error_budget_exhaustion" {
  for_each = local.slo_targets

  alarm_name          = "maysar-${each.key}-error-budget-exhaustion"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "3600" # 1 hour
  statistic           = "Sum"
  threshold           = (1 - each.value.availability / 100) * 1000 # Rough error budget calculation
  alarm_description   = "Error budget exhaustion warning for ${each.key}"

  dimensions = {
    LoadBalancer = aws_lb.api_gateway.arn_suffix
  }

  alarm_actions = [aws_sns_topic.slo_alerts.arn]
}

# SNS Topic for SLO Alerts
resource "aws_sns_topic" "slo_alerts" {
  name = "maysar-slo-alerts"

  tags = {
    Environment = var.environment
    Service     = "monitoring"
  }
}

# PagerDuty Integration
resource "pagerduty_service" "maysar_critical" {
  name                    = "Maysar E-commerce - Critical"
  description             = "Critical alerts for Maysar e-commerce platform"
  auto_resolve_timeout    = 14400 # 4 hours
  acknowledgement_timeout = 600   # 10 minutes
  escalation_policy       = pagerduty_escalation_policy.maysar_critical.id
  alert_creation          = "create_alerts_and_incidents"
}

resource "pagerduty_service" "maysar_warning" {
  name                    = "Maysar E-commerce - Warning"
  description             = "Warning alerts for Maysar e-commerce platform"
  auto_resolve_timeout    = 3600  # 1 hour
  acknowledgement_timeout = 1800  # 30 minutes
  escalation_policy       = pagerduty_escalation_policy.maysar_warning.id
  alert_creation          = "create_alerts_and_incidents"
}

resource "pagerduty_escalation_policy" "maysar_critical" {
  name      = "Maysar Critical Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary_on_call.id
    }
  }

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.secondary_on_call.id
    }
  }
}

resource "pagerduty_escalation_policy" "maysar_warning" {
  name      = "Maysar Warning Escalation"
  num_loops = 1

  rule {
    escalation_delay_in_minutes = 30
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary_on_call.id
    }
  }
}

resource "pagerduty_schedule" "primary_on_call" {
  name      = "Maysar Primary On-Call"
  time_zone = "Africa/Dar_es_Salaam"

  layer {
    name                         = "Daily Rotation"
    start                        = "2024-01-01T09:00:00-00:00"
    rotation_virtual_start       = "2024-01-01T09:00:00-00:00"
    rotation_turn_length_seconds = 604800 # 1 week
    users                        = var.primary_on_call_users
  }
}

resource "pagerduty_schedule" "secondary_on_call" {
  name      = "Maysar Secondary On-Call"
  time_zone = "Africa/Dar_es_Salaam"

  layer {
    name                         = "Weekly Backup"
    start                        = "2024-01-01T09:00:00-00:00"
    rotation_virtual_start       = "2024-01-01T09:00:00-00:00"
    rotation_turn_length_seconds = 604800 # 1 week
    users                        = var.secondary_on_call_users
  }
}

# SNS to PagerDuty Integration
resource "aws_sns_topic_subscription" "pagerduty_critical" {
  topic_arn              = aws_sns_topic.slo_alerts.arn
  protocol               = "https"
  endpoint               = "https://events.pagerduty.com/integration/${pagerduty_service.maysar_critical.integration_key}/enqueue"
  endpoint_auto_confirms = true
}

# CloudWatch Dashboard for SLO Monitoring
resource "aws_cloudwatch_dashboard" "maysar_slo_dashboard" {
  dashboard_name = "Maysar-SLO-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # SLO Overview
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 24
        height = 6

        properties = {
          metrics = [
            for service in local.service_names : [
              "AWS/ApplicationELB", "TargetResponseTime",
              "LoadBalancer", aws_lb.api_gateway.arn_suffix,
              { label = "${service} Availability", expression = "100 - (m${index(local.service_names, service) + 1} / 100)" }
            ]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SLO Availability Overview"
          period  = 300
        }
      },

      # Latency Tracking
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6

        properties = {
          metrics = [
            for service in local.service_names : [
              "AWS/ApplicationELB", "TargetResponseTime",
              "LoadBalancer", aws_lb.api_gateway.arn_suffix,
              { label = "${service} P95 Latency" }
            ]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "SLO Latency Tracking (P95)"
          period  = 300
        }
      },

      # Error Budget Visualization
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.api_gateway.arn_suffix, { label = "5XX Errors" }],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.api_gateway.arn_suffix, { label = "Total Requests" }],
            [{ expression = "100 - (m1 / m2 * 100)", label = "Error Rate %", id = "e1" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Error Budget & Burn Rate"
          period  = 300
        }
      },

      # Historical Trend Analysis
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 24
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.api_gateway.arn_suffix, { label = "Weekly Avg Latency", stat = "Average" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.api_gateway.arn_suffix, { label = "Weekly P95 Latency", stat = "p95" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Historical Performance Trends (7-day view)"
          period  = 3600
        }
      }
    ]
  })
}

# Grafana SLO Dashboards
resource "aws_cloudwatch_dashboard" "grafana_slo_detail" {
  for_each = local.slo_targets

  dashboard_name = "Maysar-${each.key}-SLO-Detail"

  dashboard_body = jsonencode({
    widgets = [
      # Service-specific SLO metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.api_gateway.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", aws_lb.api_gateway.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.api_gateway.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.api_gateway.arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "${each.key} - Detailed SLO Metrics"
          period  = 300
        }
      },

      # Error budget burn down chart
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            [{ expression = "${(1 - each.value.availability / 100) * 100}", label = "Monthly Error Budget %", id = "budget" }],
            [{ expression = "RATE(m1)*100", label = "Current Burn Rate %/hour", id = "burn" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "${each.key} - Error Budget Tracking"
          period  = 3600
        }
      }
    ]
  })
}

# Incident Response Automation
resource "aws_lambda_function" "incident_response" {
  filename         = data.archive_file.incident_response.output_path
  function_name    = "maysar-incident-response"
  role            = aws_iam_role.incident_response.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      PAGERDUTY_ROUTING_KEY = pagerduty_service.maysar_critical.integration_key
      SLACK_WEBHOOK_URL     = var.slack_webhook_url
      ENVIRONMENT          = var.environment
    }
  }
}

resource "aws_lambda_permission" "allow_sns_invoke" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.incident_response.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.slo_alerts.arn
}

resource "aws_sns_topic_subscription" "lambda_incident_response" {
  topic_arn = aws_sns_topic.slo_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.incident_response.arn
}

# IAM Role for Incident Response Lambda
resource "aws_iam_role" "incident_response" {
  name = "maysar-incident-response-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "incident_response_basic" {
  role       = aws_iam_role.incident_response.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Placeholder for Lambda deployment package
data "archive_file" "incident_response" {
  type        = "zip"
  output_path = "${path.module}/incident-response.zip"

  source {
    content  = <<EOF
exports.handler = async (event) => {
  console.log('Incident Response Triggered:', JSON.stringify(event, null, 2));

  // Implement incident response logic:
  // 1. Parse CloudWatch alarm
  // 2. Determine incident severity
  // 3. Escalate via PagerDuty
  // 4. Notify Slack channels
  // 5. Trigger automated remediation

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Incident response processed' })
  };
};
EOF
    filename = "index.js"
  }
}

# Outputs
output "slo_dashboard_url" {
  description = "URL for the main SLO monitoring dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.maysar_slo_dashboard.dashboard_name}"
}

output "pagerduty_service_ids" {
  description = "PagerDuty service IDs for integration"
  value = {
    critical = pagerduty_service.maysar_critical.id
    warning  = pagerduty_service.maysar_warning.id
  }
}

output "alert_sns_topic_arn" {
  description = "SNS topic ARN for SLO alerts"
  value       = aws_sns_topic.slo_alerts.arn
}
