# Fraud Scoring System Module for Maysar

# Fraud Score Calculator Lambda
resource "aws_lambda_function" "fraud_score_calculator" {
  filename         = data.archive_file.fraud_score_calculator.output_path
  function_name    = "maysar-${var.environment}-fraud-score-calculator"
  role            = aws_iam_role.fraud_scoring.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      FRAUD_DB_ARN       = var.fraud_db_arn
      AUTH_DB_ARN        = var.auth_db_arn
      ORDER_DB_ARN       = var.order_db_arn
      PAYMENT_DB_ARN     = var.payment_db_arn
      TRUST_DB_ARN       = var.trust_db_arn
      ALERT_TOPIC        = aws_sns_topic.fraud_alerts.arn
      SCORE_THRESHOLDS   = jsonencode({
        normal  = 30
        monitor = 60
        limit   = 80
        freeze  = 100
      })
    }
  }
}

data "archive_file" "fraud_score_calculator" {
  type        = "zip"
  output_path = "/tmp/fraud-score-calculator.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const sns = new AWS.SNS();

  try {
    const { entityType, entityId, signals } = event;

    // Calculate fraud score based on signals
    const scoreResult = await calculateFraudScore(rds, entityType, entityId, signals);

    // Determine risk level and actions
    const riskAssessment = assessRiskLevel(scoreResult.totalScore);

    // Store fraud score
    await storeFraudScore(rds, entityType, entityId, scoreResult, riskAssessment);

    // Trigger automated actions if needed
    if (riskAssessment.level !== 'normal') {
      await triggerAutomatedActions(rds, entityType, entityId, riskAssessment, sns);
    }

    return {
      statusCode: 200,
      entityType,
      entityId,
      totalScore: scoreResult.totalScore,
      riskLevel: riskAssessment.level,
      actionsTriggered: riskAssessment.actions.length
    };

  } catch (error) {
    console.error('Fraud score calculation failed:', error);
    throw error;
  }
};

async function calculateFraudScore(rds, entityType, entityId, providedSignals) {
  let totalScore = 0;
  const signals = [];
  const thresholds = JSON.parse(process.env.SCORE_THRESHOLDS);

  // Buyer fraud signals
  if (entityType === 'buyer') {
    const buyerSignals = await calculateBuyerSignals(rds, entityId);
    signals.push(...buyerSignals);
  }

  // Seller fraud signals
  else if (entityType === 'seller') {
    const sellerSignals = await calculateSellerSignals(rds, entityId);
    signals.push(...sellerSignals);
  }

  // Enabler fraud signals
  else if (entityType === 'enabler') {
    const enablerSignals = await calculateEnablerSignals(rds, entityId);
    signals.push(...enablerSignals);
  }

  // Order/transaction fraud signals
  else if (entityType === 'order') {
    const orderSignals = await calculateOrderSignals(rds, entityId);
    signals.push(...orderSignals);
  }

  // Calculate total score
  totalScore = signals.reduce((sum, signal) => sum + signal.score, 0);

  return {
    totalScore,
    signals,
    calculatedAt: new Date().toISOString()
  };
}

async function calculateBuyerSignals(rds, buyerId) {
  const signals = [];

  // Signal 1: Frequent refunds
  const refundSignal = await calculateRefundFrequency(rds, buyerId);
  signals.push(refundSignal);

  // Signal 2: IP/device churn
  const churnSignal = await calculateDeviceChurn(rds, buyerId);
  signals.push(churnSignal);

  // Signal 3: COD cancellation rate
  const codSignal = await calculateCODCancellation(rds, buyerId);
  signals.push(codSignal);

  // Signal 4: High dispute rate
  const disputeSignal = await calculateDisputeRate(rds, buyerId);
  signals.push(disputeSignal);

  return signals;
}

async function calculateSellerSignals(rds, sellerId) {
  const signals = [];

  // Signal 1: Order spikes
  const spikeSignal = await calculateOrderSpikes(rds, sellerId);
  signals.push(spikeSignal);

  // Signal 2: Refund rate
  const refundSignal = await calculateSellerRefundRate(rds, sellerId);
  signals.push(refundSignal);

  // Signal 3: Reused images
  const imageSignal = await calculateReusedImages(rds, sellerId);
  signals.push(imageSignal);

  // Signal 4: Fulfillment issues
  const fulfillmentSignal = await calculateFulfillmentIssues(rds, sellerId);
  signals.push(fulfillmentSignal);

  return signals;
}

async function calculateEnablerSignals(rds, enablerId) {
  const signals = [];

  // Signal 1: GPS drift
  const gpsSignal = await calculateGPSDrift(rds, enablerId);
  signals.push(gpsSignal);

  // Signal 2: Fake POD uploads
  const podSignal = await calculateFakePODUploads(rds, enablerId);
  signals.push(podSignal);

  // Signal 3: Unusual delivery patterns
  const patternSignal = await calculateDeliveryPatterns(rds, enablerId);
  signals.push(patternSignal);

  return signals;
}

async function calculateOrderSignals(rds, orderId) {
  const signals = [];

  // Signal 1: Suspicious payment method changes
  const paymentSignal = await calculatePaymentMethodChanges(rds, orderId);
  signals.push(paymentSignal);

  // Signal 2: Address mismatch
  const addressSignal = await calculateAddressMismatch(rds, orderId);
  signals.push(addressSignal);

  return signals;
}

async function calculateRefundFrequency(rds, buyerId) {
  // Query recent refunds for this buyer
  const result = await rds.executeStatement({
    resourceArn: process.env.PAYMENT_DB_ARN,
    secretArn: process.env.PAYMENT_DB_SECRET_ARN,
    sql: `SELECT COUNT(*) as refund_count
          FROM payments
          WHERE user_id = $1
            AND type = 'refund'
            AND created_at >= NOW() - INTERVAL '30 days'`,
    parameters: [{ name: 'buyer_id', value: { stringValue: buyerId } }]
  }).promise();

  const refundCount = parseInt(result.records[0]?.refund_count?.stringValue || '0');
  let score = 0;

  if (refundCount >= 5) score = 25;
  else if (refundCount >= 3) score = 15;
  else if (refundCount >= 1) score = 5;

  return {
    type: 'FREQUENT_REFUNDS',
    score,
    description: `${refundCount} refunds in last 30 days`,
    severity: score >= 15 ? 'high' : score >= 5 ? 'medium' : 'low'
  };
}

async function calculateDeviceChurn(rds, buyerId) {
  // Query device/IP changes
  const result = await rds.executeStatement({
    resourceArn: process.env.AUTH_DB_ARN,
    secretArn: process.env.AUTH_DB_SECRET_ARN,
    sql: `SELECT
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT device_fingerprint) as unique_devices
          FROM sessions
          WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '7 days'`,
    parameters: [{ name: 'buyer_id', value: { stringValue: buyerId } }]
  }).promise();

  const uniqueIPs = parseInt(result.records[0]?.unique_ips?.stringValue || '0');
  const uniqueDevices = parseInt(result.records[0]?.unique_devices?.stringValue || '0');

  let score = 0;
  if (uniqueIPs >= 10 || uniqueDevices >= 5) score = 20;
  else if (uniqueIPs >= 5 || uniqueDevices >= 3) score = 10;

  return {
    type: 'DEVICE_CHURN',
    score,
    description: `${uniqueIPs} IPs, ${uniqueDevices} devices in 7 days`,
    severity: score >= 10 ? 'high' : 'medium'
  };
}

async function calculateCODCancellation(rds, buyerId) {
  // Query COD cancellations
  const result = await rds.executeStatement({
    resourceArn: process.env.ORDER_DB_ARN,
    secretArn: process.env.ORDER_DB_SECRET_ARN,
    sql: `SELECT
            COUNT(*) as total_cod_orders,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_cod
          FROM orders
          WHERE user_id = $1
            AND payment_method = 'cod'
            AND created_at >= NOW() - INTERVAL '30 days'`,
    parameters: [{ name: 'buyer_id', value: { stringValue: buyerId } }]
  }).promise();

  const totalCOD = parseInt(result.records[0]?.total_cod_orders?.stringValue || '0');
  const cancelledCOD = parseInt(result.records[0]?.cancelled_cod?.stringValue || '0');

  let score = 0;
  if (totalCOD > 0) {
    const cancelRate = cancelledCOD / totalCOD;
    if (cancelRate >= 0.8) score = 30;
    else if (cancelRate >= 0.5) score = 20;
    else if (cancelRate >= 0.3) score = 10;
  }

  return {
    type: 'COD_CANCELLATION',
    score,
    description: `${cancelledCOD}/${totalCOD} COD orders cancelled`,
    severity: score >= 20 ? 'high' : score >= 10 ? 'medium' : 'low'
  };
}

async function calculateDisputeRate(rds, buyerId) {
  // Query dispute history
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT
            COUNT(*) as dispute_count,
            COUNT(CASE WHEN resolution = 'buyer_wins' THEN 1 END) as buyer_wins
          FROM disputes
          WHERE buyer_id = $1
            AND created_at >= NOW() - INTERVAL '90 days'`,
    parameters: [{ name: 'buyer_id', value: { stringValue: buyerId } }]
  }).promise();

  const disputeCount = parseInt(result.records[0]?.dispute_count?.stringValue || '0');
  const buyerWins = parseInt(result.records[0]?.buyer_wins?.stringValue || '0');

  let score = 0;
  if (disputeCount >= 10) score = 25;
  else if (disputeCount >= 5) score = 15;
  else if (disputeCount >= 2) score = 5;

  return {
    type: 'HIGH_DISPUTE_RATE',
    score,
    description: `${disputeCount} disputes, ${buyerWins} wins in 90 days`,
    severity: score >= 15 ? 'high' : score >= 5 ? 'medium' : 'low'
  };
}

function assessRiskLevel(totalScore) {
  const thresholds = JSON.parse(process.env.SCORE_THRESHOLDS);
  let level;
  let actions = [];

  if (totalScore >= thresholds.freeze) {
    level = 'freeze';
    actions = ['ACCOUNT_FREEZE', 'ADMIN_ALERT', 'PAYMENT_BLOCK'];
  } else if (totalScore >= thresholds.limit) {
    level = 'limit';
    actions = ['PAYMENT_LIMIT', 'ENHANCED_MONITORING', 'ADMIN_REVIEW'];
  } else if (totalScore >= thresholds.monitor) {
    level = 'monitor';
    actions = ['ENHANCED_MONITORING', 'EMAIL_ALERT'];
  } else {
    level = 'normal';
    actions = [];
  }

  return { level, actions };
}

async function storeFraudScore(rds, entityType, entityId, scoreResult, riskAssessment) {
  await rds.executeStatement({
    resourceArn: process.env.FRAUD_DB_ARN,
    secretArn: process.env.FRAUD_DB_SECRET_ARN,
    sql: `INSERT INTO fraud_scores
          (entity_type, entity_id, total_score, risk_level, signals, calculated_at)
          VALUES ($1, $2, $3, $4, $5, $6)`,
    parameters: [
      { name: 'entity_type', value: { stringValue: entityType } },
      { name: 'entity_id', value: { stringValue: entityId } },
      { name: 'total_score', value: { integerValue: scoreResult.totalScore } },
      { name: 'risk_level', value: { stringValue: riskAssessment.level } },
      { name: 'signals', value: { stringValue: JSON.stringify(scoreResult.signals) } },
      { name: 'calculated_at', value: { stringValue: scoreResult.calculatedAt } }
    ]
  }).promise();
}

async function triggerAutomatedActions(rds, entityType, entityId, riskAssessment, sns) {
  // Implement automated actions based on risk level
  const actions = riskAssessment.actions;

  for (const action of actions) {
    if (action === 'ACCOUNT_FREEZE') {
      await freezeAccount(rds, entityType, entityId);
    } else if (action === 'PAYMENT_BLOCK') {
      await blockPayments(rds, entityType, entityId);
    } else if (action === 'PAYMENT_LIMIT') {
      await limitPayments(rds, entityType, entityId);
    }

    // Send alert
    await sns.publish({
      TopicArn: process.env.ALERT_TOPIC,
      Subject: `🚨 FRAUD ACTION TRIGGERED: ${action}`,
      Message: `Automated fraud action triggered:

Entity: ${entityType} ${entityId}
Action: ${action}
Risk Level: ${riskAssessment.level}

Please review and confirm this action.`
    }).promise();
  }
}

async function freezeAccount(rds, entityType, entityId) {
  if (entityType === 'buyer' || entityType === 'seller') {
    await rds.executeStatement({
      resourceArn: process.env.AUTH_DB_ARN,
      secretArn: process.env.AUTH_DB_SECRET_ARN,
      sql: `UPDATE users SET status = 'frozen', frozen_reason = 'fraud_detection' WHERE id = $1`,
      parameters: [{ name: 'id', value: { stringValue: entityId } }]
    }).promise();
  }
}

async function blockPayments(rds, entityType, entityId) {
  // Implement payment blocking logic
  console.log(`Payment blocking triggered for ${entityType} ${entityId}`);
}

async function limitPayments(rds, entityType, entityId) {
  // Implement payment limiting logic
  console.log(`Payment limiting triggered for ${entityType} ${entityId}`);
}

// Placeholder implementations for other signals
async function calculateOrderSpikes(rds, sellerId) {
  return { type: 'ORDER_SPIKES', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateSellerRefundRate(rds, sellerId) {
  return { type: 'SELLER_REFUND_RATE', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateReusedImages(rds, sellerId) {
  return { type: 'REUSED_IMAGES', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateFulfillmentIssues(rds, sellerId) {
  return { type: 'FULFILLMENT_ISSUES', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateGPSDrift(rds, enablerId) {
  return { type: 'GPS_DRIFT', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateFakePODUploads(rds, enablerId) {
  return { type: 'FAKE_POD_UPLOADS', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateDeliveryPatterns(rds, enablerId) {
  return { type: 'DELIVERY_PATTERNS', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculatePaymentMethodChanges(rds, orderId) {
  return { type: 'PAYMENT_METHOD_CHANGES', score: 0, description: 'Not implemented', severity: 'low' };
}

async function calculateAddressMismatch(rds, orderId) {
  return { type: 'ADDRESS_MISMATCH', score: 0, description: 'Not implemented', severity: 'low' };
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "fraud_scoring" {
  name = "maysar-${var.environment}-fraud-scoring-role"

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

resource "aws_iam_role_policy" "fraud_scoring" {
  name = "maysar-${var.environment}-fraud-scoring-policy"
  role = aws_iam_role.fraud_scoring.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement"
        ]
        Resource = [
          var.fraud_db_arn,
          var.auth_db_arn,
          var.order_db_arn,
          var.payment_db_arn,
          var.trust_db_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.fraud_db_secret_arn,
          var.auth_db_secret_arn,
          var.order_db_secret_arn,
          var.payment_db_secret_arn,
          var.trust_db_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.fraud_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-fraud-*"
      }
    ]
  })
}

# Fraud Dashboard API Gateway
resource "aws_api_gateway_rest_api" "fraud_dashboard" {
  name        = "maysar-${var.environment}-fraud-dashboard"
  description = "Fraud Dashboard API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "fraud_scores" {
  rest_api_id = aws_api_gateway_rest_api.fraud_dashboard.id
  parent_id   = aws_api_gateway_rest_api.fraud_dashboard.root_resource_id
  path_part   = "scores"
}

resource "aws_api_gateway_method" "get_fraud_scores" {
  rest_api_id   = aws_api_gateway_rest_api.fraud_dashboard.id
  resource_id   = aws_api_gateway_resource.fraud_scores.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = var.cognito_authorizer_id
}

resource "aws_api_gateway_integration" "fraud_scores" {
  rest_api_id = aws_api_gateway_rest_api.fraud_dashboard.id
  resource_id = aws_api_gateway_resource.fraud_scores.id
  http_method = aws_api_gateway_method.get_fraud_scores.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.fraud_dashboard_api.invoke_arn
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "fraud_dashboard" {
  rest_api_id = aws_api_gateway_rest_api.fraud_dashboard.id
  stage_name  = "prod"

  depends_on = [
    aws_api_gateway_integration.fraud_scores
  ]
}

# Fraud Dashboard Lambda
resource "aws_lambda_function" "fraud_dashboard_api" {
  filename         = data.archive_file.fraud_dashboard_api.output_path
  function_name    = "maysar-${var.environment}-fraud-dashboard-api"
  role            = aws_iam_role.fraud_dashboard.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      FRAUD_DB_ARN = var.fraud_db_arn
    }
  }
}

data "archive_file" "fraud_dashboard_api" {
  type        = "zip"
  output_path = "/tmp/fraud-dashboard-api.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();

  try {
    const { pathParameters, queryStringParameters } = event;
    const period = queryStringParameters?.period || '30d';

    // Get fraud metrics based on request
    if (event.httpMethod === 'GET' && event.resource === '/scores') {
      const metrics = await getFraudMetrics(rds, period);

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
    console.error('Fraud dashboard API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getFraudMetrics(rds, period) {
  // Get overall fraud statistics
  const overallStats = await rds.executeStatement({
    resourceArn: process.env.FRAUD_DB_ARN,
    secretArn: process.env.FRAUD_DB_SECRET_ARN,
    sql: `SELECT
            risk_level,
            COUNT(*) as count
          FROM fraud_scores
          WHERE calculated_at >= NOW() - INTERVAL '${period}'
          GROUP BY risk_level`,
  }).promise();

  // Get top flagged accounts
  const topFlagged = await rds.executeStatement({
    resourceArn: process.env.FRAUD_DB_ARN,
    secretArn: process.env.FRAUD_DB_SECRET_ARN,
    sql: `SELECT
            entity_type,
            entity_id,
            total_score,
            risk_level
          FROM fraud_scores
          WHERE calculated_at >= NOW() - INTERVAL '${period}'
            AND risk_level IN ('limit', 'freeze')
          ORDER BY total_score DESC
          LIMIT 10`,
  }).promise();

  // Get time series data
  const timeSeries = await rds.executeStatement({
    resourceArn: process.env.FRAUD_DB_ARN,
    secretArn: process.env.FRAUD_DB_SECRET_ARN,
    sql: `SELECT
            DATE_TRUNC('day', calculated_at) as date,
            COUNT(*) as total_scores,
            COUNT(CASE WHEN risk_level = 'freeze' THEN 1 END) as freeze_count,
            COUNT(CASE WHEN risk_level = 'limit' THEN 1 END) as limit_count,
            COUNT(CASE WHEN risk_level = 'monitor' THEN 1 END) as monitor_count,
            AVG(total_score) as avg_score
          FROM fraud_scores
          WHERE calculated_at >= NOW() - INTERVAL '${period}'
          GROUP BY DATE_TRUNC('day', calculated_at)
          ORDER BY date DESC`,
  }).promise();

  // Calculate false positive rate (this would need historical data)
  const falsePositiveRate = 0.05; // Placeholder

  return {
    overallStats: overallStats.records,
    topFlagged: topFlagged.records,
    timeSeries: timeSeries.records,
    falsePositiveRate,
    generatedAt: new Date().toISOString()
  };
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "fraud_dashboard" {
  name = "maysar-${var.environment}-fraud-dashboard-role"

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

resource "aws_iam_role_policy" "fraud_dashboard" {
  name = "maysar-${var.environment}-fraud-dashboard-policy"
  role = aws_iam_role.fraud_dashboard.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement"
        ]
        Resource = var.fraud_db_arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.fraud_db_secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-fraud-dashboard-*"
      }
    ]
  })
}

# SNS Topic for Fraud Alerts
resource "aws_sns_topic" "fraud_alerts" {
  name = "maysar-${var.environment}-fraud-alerts"

  tags = {
    Name = "maysar-${var.environment}-fraud-alerts"
  }
}

# CloudWatch Alarms for Fraud System
resource "aws_cloudwatch_metric_alarm" "high_risk_fraud_scores" {
  alarm_name          = "maysar-${var.environment}-high-risk-fraud-scores"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HighRiskFraudScores"
  namespace           = "Maysar/Fraud"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "High number of high-risk fraud scores detected"
  alarm_actions       = [aws_sns_topic.fraud_alerts.arn]

  dimensions = {
    ServiceName = "fraud-score-calculator"
  }
}

resource "aws_cloudwatch_metric_alarm" "automated_fraud_actions" {
  alarm_name          = "maysar-${var.environment}-automated-fraud-actions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "AutomatedFraudActions"
  namespace           = "Maysar/Fraud"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High number of automated fraud actions triggered"
  alarm_actions       = [aws_sns_topic.fraud_alerts.arn]

  dimensions = {
    ServiceName = "fraud-score-calculator"
  }
}
