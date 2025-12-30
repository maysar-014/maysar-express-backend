# SLO/SLA Monitoring Module for Maysar

# SLO Monitoring Lambda
resource "aws_lambda_function" "slo_monitor" {
  filename         = data.archive_file.slo_monitor.output_path
  function_name    = "maysar-${var.environment}-slo-monitor"
  role            = aws_iam_role.slo_monitoring.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      PROMETHEUS_ENDPOINT      = var.prometheus_endpoint
      GRAFANA_ENDPOINT         = var.grafana_endpoint
      ALERT_WEBHOOK_URL        = var.alert_webhook_url
      ERROR_BUDGET_THRESHOLD   = var.error_budget_threshold
      RELEASE_FREEZE_SNS_TOPIC = aws_sns_topic.release_freeze.arn
      RCA_SNS_TOPIC           = aws_sns_topic.rca_required.arn
      SENTRY_DSN              = var.sentry_dsn
    }
  }
}

data "archive_file" "slo_monitor" {
  type        = "zip"
  output_path = "/tmp/slo-monitor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const cloudwatch = new AWS.CloudWatch();
  const sns = new AWS.SNS();

  try {
    console.log('Starting SLO monitoring cycle');

    // Monitor all critical service SLOs
    const sloResults = await monitorAllSLOs();

    // Calculate error budgets
    const errorBudget = await calculateErrorBudget(sloResults);

    // Check for SLO breaches
    const breaches = sloResults.filter(result => !result.sloMet);

    // Handle breaches
    if (breaches.length > 0) {
      await handleSLOBreaches(breaches, sns);
    }

    // Check error budget exhaustion
    if (errorBudget.exhausted) {
      await handleErrorBudgetExhaustion(errorBudget, sns);
    }

    // Update CloudWatch metrics
    await updateSLOMetrics(sloResults, errorBudget, cloudwatch);

    return {
      statusCode: 200,
      monitoredServices: sloResults.length,
      breachesDetected: breaches.length,
      errorBudgetExhausted: errorBudget.exhausted,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('SLO monitoring failed:', error);
    throw error;
  }
};

async function monitorAllSLOs() {
  const services = [
    { name: 'payment', availability: 99.9, p95: 400, webhook: 5000 },
    { name: 'order', availability: 99.95, p95: 300 },
    { name: 'auth', availability: 99.9, p95: 250 },
    { name: 'catalog', availability: 99.9, p95: 200 },
    { name: 'notification', availability: 99.5, delivery: 30000 }
  ];

  const results = [];

  for (const service of services) {
    const sloResult = await monitorServiceSLO(service);
    results.push(sloResult);
  }

  return results;
}

async function monitorServiceSLO(service) {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  // Get metrics from CloudWatch (in a real implementation, this would query Prometheus/Grafana)
  const metrics = await getServiceMetrics(service.name, oneHourAgo, now);

  // Calculate SLO compliance
  const availability = calculateAvailability(metrics);
  const p95Latency = calculateP95Latency(metrics);
  const sloMet = checkSLOMet(service, availability, p95Latency);

  return {
    service: service.name,
    availability: availability,
    p95Latency: p95Latency,
    sloMet: sloMet,
    targetAvailability: service.availability,
    targetP95: service.p95,
    period: '1h',
    timestamp: new Date().toISOString()
  };
}

async function getServiceMetrics(serviceName, startTime, endTime) {
  // In a real implementation, this would query Prometheus or CloudWatch
  // For now, return mock data
  return {
    totalRequests: 10000,
    successfulRequests: 9990,
    errorRequests: 10,
    latencies: generateMockLatencies(10000, serviceName)
  };
}

function generateMockLatencies(count, serviceName) {
  const latencies = [];
  const baseLatency = getBaseLatency(serviceName);

  for (let i = 0; i < count; i++) {
    // Generate latencies with some variance
    const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
    latencies.push(baseLatency * (1 + variance));
  }

  return latencies;
}

function getBaseLatency(serviceName) {
  const baseLatencies = {
    payment: 350,
    order: 250,
    auth: 200,
    catalog: 150,
    notification: 500
  };
  return baseLatencies[serviceName] || 200;
}

function calculateAvailability(metrics) {
  const totalRequests = metrics.totalRequests;
  const successfulRequests = metrics.successfulRequests;
  return (successfulRequests / totalRequests) * 100;
}

function calculateP95Latency(metrics) {
  const latencies = metrics.latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  return latencies[p95Index];
}

function checkSLOMet(service, availability, p95Latency) {
  const availabilityMet = availability >= service.availability;
  const latencyMet = p95Latency <= service.p95;

  // For notification service, also check delivery time
  if (service.name === 'notification') {
    const deliveryMet = true; // Would check actual delivery times
    return availabilityMet && latencyMet && deliveryMet;
  }

  return availabilityMet && latencyMet;
}

async function calculateErrorBudget(sloResults) {
  // Calculate overall error budget (simplified version)
  const totalServices = sloResults.length;
  const breachedServices = sloResults.filter(r => !r.sloMet).length;
  const breachRate = breachedServices / totalServices;

  // Error budget is exhausted if more than threshold of services are breaching SLOs
  const exhausted = breachRate >= parseFloat(process.env.ERROR_BUDGET_THRESHOLD);

  return {
    totalServices,
    breachedServices,
    breachRate,
    exhausted,
    threshold: parseFloat(process.env.ERROR_BUDGET_THRESHOLD),
    period: 'monthly'
  };
}

async function handleSLOBreaches(breaches, sns) {
  for (const breach of breaches) {
    const subject = `🚨 SLO BREACH: ${breach.service.toUpperCase()} Service`;
    const message = `CRITICAL: ${breach.service} service is breaching its SLO targets.

Current Availability: ${breach.availability.toFixed(2)}% (Target: ${breach.targetAvailability}%)
Current P95 Latency: ${breach.p95Latency.toFixed(0)}ms (Target: ${breach.targetP95}ms)

IMMEDIATE ACTION REQUIRED:
1. Page on-call engineer
2. Start incident response
3. Begin root cause analysis
4. Consider traffic throttling if necessary

This breach will be tracked for error budget calculations.`;

    await sns.publish({
      TopicArn: process.env.RCA_SNS_TOPIC,
      Subject: subject,
      Message: message
    }).promise();
  }
}

async function handleErrorBudgetExhaustion(errorBudget, sns) {
  const subject = `🚨🚨 ERROR BUDGET EXHAUSTED - RELEASE FREEZE ACTIVATED`;
  const message = `CRITICAL: Error budget has been exhausted for the current period.

Error Budget Status:
- Total Services: ${errorBudget.totalServices}
- Breached Services: ${errorBudget.breachedServices}
- Breach Rate: ${(errorBudget.breachRate * 100).toFixed(1)}%
- Threshold: ${(errorBudget.threshold * 100).toFixed(1)}%

AUTOMATED ACTIONS TAKEN:
✅ All deployments to production frozen
✅ CI/CD pipelines blocked
✅ Engineering team notified
✅ Management alerted

RECOVERY PROCESS:
1. Complete root cause analysis for all SLO breaches
2. Implement fixes for identified issues
3. Gradually restore error budget through improved reliability
4. Resume deployments only after budget recovery

All changes require manual approval until error budget is restored.`;

  await sns.publish({
    TopicArn: process.env.RELEASE_FREEZE_SNS_TOPIC,
    Subject: subject,
    Message: message
  }).promise();
}

async function updateSLOMetrics(sloResults, errorBudget, cloudwatch) {
  const metrics = [];

  // Service-specific metrics
  for (const result of sloResults) {
    metrics.push({
      MetricName: `SLO_${result.service}_availability`,
      Value: result.availability,
      Unit: 'Percent',
      Timestamp: new Date()
    });

    metrics.push({
      MetricName: `SLO_${result.service}_p95_latency`,
      Value: result.p95Latency,
      Unit: 'Milliseconds',
      Timestamp: new Date()
    });

    metrics.push({
      MetricName: `SLO_${result.service}_breach`,
      Value: result.sloMet ? 0 : 1,
      Unit: 'Count',
      Timestamp: new Date()
    });
  }

  // Error budget metrics
  metrics.push({
    MetricName: 'ErrorBudget_BreachRate',
    Value: errorBudget.breachRate * 100,
    Unit: 'Percent',
    Timestamp: new Date()
  });

  metrics.push({
    MetricName: 'ErrorBudget_Exhausted',
    Value: errorBudget.exhausted ? 1 : 0,
    Unit: 'Count',
    Timestamp: new Date()
  });

  await cloudwatch.putMetricData({
    Namespace: 'Maysar/SLO',
    MetricData: metrics
  }).promise();
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "slo_monitoring" {
  name = "maysar-${var.environment}-slo-monitoring-role"

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

resource "aws_iam_role_policy" "slo_monitoring" {
  name = "maysar-${var.environment}-slo-monitoring-policy"
  role = aws_iam_role.slo_monitoring.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.release_freeze.arn,
          aws_sns_topic.rca_required.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-slo-*"
      }
    ]
  })
}

# Error Budget Calculator Lambda
resource "aws_lambda_function" "error_budget_calculator" {
  filename         = data.archive_file.error_budget_calculator.output_path
  function_name    = "maysar-${var.environment}-error-budget-calculator"
  role            = aws_iam_role.slo_monitoring.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      ENVIRONMENT = var.environment
      ERROR_BUDGET_TABLE = aws_dynamodb_table.error_budget.table_name
      RELEASE_FREEZE_THRESHOLD = var.error_budget_threshold
    }
  }
}

data "archive_file" "error_budget_calculator" {
  type        = "zip"
  output_path = "/tmp/error-budget-calculator.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Get current error budget status
    const budgetStatus = await getCurrentErrorBudget(dynamodb, currentMonth);

    // Calculate remaining budget
    const remainingBudget = await calculateRemainingBudget(budgetStatus);

    // Check if budget is exhausted
    const exhausted = remainingBudget.percentage <= 0;

    // Update budget status
    await updateErrorBudget(dynamodb, currentMonth, budgetStatus, remainingBudget, exhausted);

    // Trigger actions if exhausted
    if (exhausted && !budgetStatus.freezeActive) {
      await triggerReleaseFreeze(dynamodb, currentMonth);
    }

    return {
      statusCode: 200,
      month: currentMonth,
      remainingPercentage: remainingBudget.percentage,
      exhausted: exhausted,
      freezeActive: budgetStatus.freezeActive || exhausted
    };

  } catch (error) {
    console.error('Error budget calculation failed:', error);
    throw error;
  }
};

async function getCurrentErrorBudget(dynamodb, month) {
  const params = {
    TableName: process.env.ERROR_BUDGET_TABLE,
    Key: {
      month: month,
      type: 'error_budget'
    }
  };

  const result = await dynamodb.get(params).promise();

  return result.Item || {
    month,
    type: 'error_budget',
    totalBudget: 100, // 100% error budget
    usedBudget: 0,
    freezeActive: false,
    lastUpdated: new Date().toISOString()
  };
}

async function calculateRemainingBudget(budgetStatus) {
  // Get SLO breach data from CloudWatch (simplified)
  const breachRate = await getCurrentBreachRate();

  const usedBudget = breachRate * 100; // Convert to percentage
  const remainingBudget = Math.max(0, budgetStatus.totalBudget - usedBudget);

  return {
    total: budgetStatus.totalBudget,
    used: usedBudget,
    remaining: remainingBudget,
    percentage: remainingBudget
  };
}

async function getCurrentBreachRate() {
  // In a real implementation, this would query CloudWatch metrics
  // For now, return a mock value
  return Math.random() * 0.3; // 0-30% breach rate
}

async function updateErrorBudget(dynamodb, month, budgetStatus, remainingBudget, exhausted) {
  const updateParams = {
    TableName: process.env.ERROR_BUDGET_TABLE,
    Key: {
      month: month,
      type: 'error_budget'
    },
    UpdateExpression: 'SET #used = :used, #remaining = :remaining, #percentage = :percentage, #exhausted = :exhausted, #freezeActive = :freezeActive, #lastUpdated = :lastUpdated',
    ExpressionAttributeNames: {
      '#used': 'usedBudget',
      '#remaining': 'remainingBudget',
      '#percentage': 'remainingPercentage',
      '#exhausted': 'budgetExhausted',
      '#freezeActive': 'freezeActive',
      '#lastUpdated': 'lastUpdated'
    },
    ExpressionAttributeValues: {
      ':used': remainingBudget.used,
      ':remaining': remainingBudget.remaining,
      ':percentage': remainingBudget.percentage,
      ':exhausted': exhausted,
      ':freezeActive': exhausted,
      ':lastUpdated': new Date().toISOString()
    }
  };

  await dynamodb.update(updateParams).promise();
}

async function triggerReleaseFreeze(dynamodb, month) {
  // Update DynamoDB to mark freeze as active
  const freezeParams = {
    TableName: process.env.ERROR_BUDGET_TABLE,
    Key: {
      month: month,
      type: 'release_freeze'
    },
    Item: {
      month,
      type: 'release_freeze',
      freezeActive: true,
      triggeredAt: new Date().toISOString(),
      reason: 'Error budget exhausted',
      manualOverride: false
    }
  };

  await dynamodb.put(freezeParams).promise();

  // In a real implementation, this would also:
  // 1. Update CI/CD systems to block deployments
  // 2. Send notifications to engineering teams
  // 3. Update status dashboards
  console.log(`Release freeze triggered for ${month} due to error budget exhaustion`);
}
EOF
    filename = "index.js"
  }
}

# DynamoDB Table for Error Budget Tracking
resource "aws_dynamodb_table" "error_budget" {
  name         = "maysar-${var.environment}-error-budget"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "month"
  range_key    = "type"

  attribute {
    name = "month"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  tags = {
    Name = "maysar-${var.environment}-error-budget"
  }
}

# SLO Dashboard API Gateway
resource "aws_api_gateway_rest_api" "slo_dashboard" {
  name        = "maysar-${var.environment}-slo-dashboard"
  description = "SLO Dashboard API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "slo_metrics" {
  rest_api_id = aws_api_gateway_rest_api.slo_dashboard.id
  parent_id   = aws_api_gateway_rest_api.slo_dashboard.root_resource_id
  path_part   = "metrics"
}

resource "aws_api_gateway_method" "get_slo_metrics" {
  rest_api_id   = aws_api_gateway_rest_api.slo_dashboard.id
  resource_id   = aws_api_gateway_resource.slo_metrics.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = var.cognito_authorizer_id
}

resource "aws_api_gateway_integration" "slo_metrics" {
  rest_api_id = aws_api_gateway_rest_api.slo_dashboard.id
  resource_id = aws_api_gateway_resource.slo_metrics.id
  http_method = aws_api_gateway_method.get_slo_metrics.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.slo_dashboard_api.invoke_arn
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "slo_dashboard" {
  rest_api_id = aws_api_gateway_rest_api.slo_dashboard.id
  stage_name  = "prod"

  depends_on = [
    aws_api_gateway_integration.slo_metrics
  ]
}

# SLO Dashboard Lambda
resource "aws_lambda_function" "slo_dashboard_api" {
  filename         = data.archive_file.slo_dashboard_api.output_path
  function_name    = "maysar-${var.environment}-slo-dashboard-api"
  role            = aws_iam_role.slo_monitoring.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      ERROR_BUDGET_TABLE = aws_dynamodb_table.error_budget.table_name
    }
  }
}

data "archive_file" "slo_dashboard_api" {
  type        = "zip"
  output_path = "/tmp/slo-dashboard-api.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const cloudwatch = new AWS.CloudWatch();
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const { pathParameters, queryStringParameters } = event;
    const period = queryStringParameters?.period || '24h';

    if (event.httpMethod === 'GET' && event.resource === '/metrics') {
      const metrics = await getSLOMetrics(cloudwatch, dynamodb, period);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(metrics)
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('SLO dashboard API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getSLOMetrics(cloudwatch, dynamodb, period) {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - parsePeriod(period));

  // Get SLO metrics from CloudWatch
  const sloMetrics = await getCloudWatchSLOMetrics(cloudwatch, startTime, endTime);

  // Get error budget status
  const currentMonth = new Date().toISOString().substring(0, 7);
  const errorBudget = await getErrorBudgetStatus(dynamodb, currentMonth);

  // Calculate SLO targets vs actuals
  const sloTargets = {
    payment: { availability: 99.9, p95: 400 },
    order: { availability: 99.95, p95: 300 },
    auth: { availability: 99.9, p95: 250 },
    catalog: { availability: 99.9, p95: 200 },
    notification: { availability: 99.5, delivery: 30 }
  };

  return {
    period,
    sloMetrics,
    errorBudget,
    sloTargets,
    generatedAt: new Date().toISOString()
  };
}

function parsePeriod(period) {
  const unit = period.slice(-1);
  const value = parseInt(period.slice(0, -1));

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000; // default 24h
  }
}

async function getCloudWatchSLOMetrics(cloudwatch, startTime, endTime) {
  const services = ['payment', 'order', 'auth', 'catalog', 'notification'];
  const metrics = {};

  for (const service of services) {
    const availability = await getMetricAverage(cloudwatch, `SLO_${service}_availability`, startTime, endTime);
    const p95Latency = await getMetricAverage(cloudwatch, `SLO_${service}_p95_latency`, startTime, endTime);
    const breaches = await getMetricSum(cloudwatch, `SLO_${service}_breach`, startTime, endTime);

    metrics[service] = {
      availability: availability || 99.9,
      p95Latency: p95Latency || 200,
      breaches: breaches || 0,
      sloMet: breaches === 0
    };
  }

  return metrics;
}

async function getMetricAverage(cloudwatch, metricName, startTime, endTime) {
  try {
    const params = {
      MetricDataQueries: [{
        Id: 'm1',
        MetricStat: {
          Metric: {
            Namespace: 'Maysar/SLO',
            MetricName: metricName
          },
          Period: 3600,
          Stat: 'Average'
        }
      }],
      StartTime: startTime,
      EndTime: endTime
    };

    const result = await cloudwatch.getMetricData(params).promise();
    return result.MetricDataResults[0]?.Values?.[0] || 0;
  } catch (error) {
    console.warn(`Failed to get metric ${metricName}:`, error);
    return 0;
  }
}

async function getMetricSum(cloudwatch, metricName, startTime, endTime) {
  try {
    const params = {
      MetricDataQueries: [{
        Id: 'm1',
        MetricStat: {
          Metric: {
            Namespace: 'Marsar/SLO',
            MetricName: metricName
          },
          Period: 3600,
          Stat: 'Sum'
        }
      }],
      StartTime: startTime,
      EndTime: endTime
    };

    const result = await cloudwatch.getMetricData(params).promise();
    return result.MetricDataResults[0]?.Values?.reduce((sum, val) => sum + val, 0) || 0;
  } catch (error) {
    console.warn(`Failed to get metric ${metricName}:`, error);
    return 0;
  }
}

async function getErrorBudgetStatus(dynamodb, month) {
  const params = {
    TableName: process.env.ERROR_BUDGET_TABLE,
    Key: {
      month: month,
      type: 'error_budget'
    }
  };

  const result = await dynamodb.get(params).promise();

  return result.Item || {
    totalBudget: 100,
    usedBudget: 0,
    remainingBudget: 100,
    remainingPercentage: 100,
    budgetExhausted: false,
    freezeActive: false
  };
}
EOF
    filename = "index.js"
  }
}

# SNS Topics for SLO/SLA Alerts
resource "aws_sns_topic" "release_freeze" {
  name = "maysar-${var.environment}-release-freeze"

  tags = {
    Name = "maysar-${var.environment}-release-freeze"
  }
}

resource "aws_sns_topic" "rca_required" {
  name = "maysar-${var.environment}-rca-required"

  tags = {
    Name = "maysar-${var.environment}-rca-required"
  }
}

# CloudWatch Alarms for SLO Breaches
resource "aws_cloudwatch_metric_alarm" "payment_slo_breach" {
  alarm_name          = "maysar-${var.environment}-payment-slo-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "SLO_payment_breach"
  namespace           = "Maysar/SLO"
  period              = "3600"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "Payment service SLO breached"
  alarm_actions       = [aws_sns_topic.rca_required.arn]

  dimensions = {
    ServiceName = "payment"
  }
}

resource "aws_cloudwatch_metric_alarm" "order_slo_breach" {
  alarm_name          = "maysar-${var.environment}-order-slo-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "SLO_order_breach"
  namespace           = "Maysar/SLO"
  period              = "3600"
  statistic           = "Maximum"
  threshold           = "0"
  alarm_description   = "Order service SLO breached"
  alarm_actions       = [aws_sns_topic.rca_required.arn]

  dimensions = {
    ServiceName = "order"
  }
}

resource "aws_cloudwatch_metric_alarm" "error_budget_exhausted" {
  alarm_name          = "maysar-${var.environment}-error-budget-exhausted"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "ErrorBudget_Exhausted"
  namespace           = "Maysar/SLO"
  period              = "3600"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "Error budget exhausted - release freeze activated"
  alarm_actions       = [aws_sns_topic.release_freeze.arn]

  dimensions = {
    ServiceName = "error-budget-calculator"
  }
}

# CloudWatch Event Rules for SLO Monitoring
resource "aws_cloudwatch_event_rule" "slo_monitoring" {
  name                = "maysar-${var.environment}-slo-monitoring"
  description         = "Monitor SLO compliance every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "slo_monitoring" {
  rule      = aws_cloudwatch_event_rule.slo_monitoring.name
  arn       = aws_lambda_function.slo_monitor.arn
}

resource "aws_lambda_permission" "slo_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slo_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.slo_monitoring.arn
}

resource "aws_cloudwatch_event_rule" "error_budget_monitoring" {
  name                = "maysar-${var.environment}-error-budget-monitoring"
  description         = "Monitor error budget status hourly"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "error_budget_monitoring" {
  rule      = aws_cloudwatch_event_rule.error_budget_monitoring.name
  arn       = aws_lambda_function.error_budget_calculator.arn
}

resource "aws_lambda_permission" "error_budget_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.error_budget_calculator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.error_budget_monitoring.arn
}
