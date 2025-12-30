# Dispute Resolution Module for Maysar

# Define dispute states
locals {
  dispute_states = [
    "OPENED",
    "UNDER_REVIEW",
    "EVIDENCE_COLLECTED",
    "DECIDED",
    "RESOLVED"
  ]

  sla_thresholds = {
    initial_triage = 24  # hours
    resolution    = 168 # hours (7 days)
  }
}

# Dispute State Management Lambda
resource "aws_lambda_function" "dispute_state_manager" {
  filename         = data.archive_file.dispute_state_manager.output_path
  function_name    = "maysar-${var.environment}-dispute-state-manager"
  role            = aws_iam_role.dispute_resolution.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      DISPUTE_STATES = jsonencode(local.dispute_states)
      TRUST_DB_ARN   = var.trust_db_arn
      PAYMENT_DB_ARN = var.payment_db_arn
      ORDER_DB_ARN   = var.order_db_arn
      NOTIFICATION_TOPIC = aws_sns_topic.dispute_notifications.arn
    }
  }
}

data "archive_file" "dispute_state_manager" {
  type        = "zip"
  output_path = "/tmp/dispute-state-manager.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const { disputeId, newState, reason, evidence, adminId } = event;

  try {
    // Validate state transition
    const currentState = await getCurrentDisputeState(disputeId);
    const validTransition = validateStateTransition(currentState, newState);

    if (!validTransition) {
      throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
    }

    // Update dispute state
    await updateDisputeState(disputeId, newState, reason, evidence, adminId);

    // Emit DisputeResolved event if applicable
    if (newState === 'RESOLVED') {
      await emitDisputeResolvedEvent(disputeId);
    }

    // Send notifications
    await sendStateChangeNotification(disputeId, currentState, newState, reason);

    return {
      statusCode: 200,
      disputeId,
      oldState: currentState,
      newState,
      message: 'Dispute state updated successfully'
    };

  } catch (error) {
    console.error('Dispute state management failed:', error);
    throw error;
  }
};

async function getCurrentDisputeState(disputeId) {
  // Query trust database for current dispute state
  const rds = new AWS.RDSDataService();
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: 'SELECT status FROM disputes WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: disputeId } }]
  }).promise();

  return result.records[0]?.status?.stringValue || 'UNKNOWN';
}

async function validateStateTransition(currentState, newState) {
  const states = JSON.parse(process.env.DISPUTE_STATES);
  const currentIndex = states.indexOf(currentState);
  const newIndex = states.indexOf(newState);

  // Allow forward progression and some backward transitions
  return newIndex >= currentIndex || (newState === 'OPENED' && currentState === 'UNDER_REVIEW');
}

async function updateDisputeState(disputeId, newState, reason, evidence, adminId) {
  const rds = new AWS.RDSDataService();
  const now = new Date().toISOString();

  await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `UPDATE disputes SET
            status = $1,
            updated_at = $2,
            admin_id = $3,
            resolution_reason = $4,
            evidence = $5
          WHERE id = $6`,
    parameters: [
      { name: 'status', value: { stringValue: newState } },
      { name: 'updated_at', value: { stringValue: now } },
      { name: 'admin_id', value: { stringValue: adminId || null } },
      { name: 'resolution_reason', value: { stringValue: reason || null } },
      { name: 'evidence', value: { stringValue: JSON.stringify(evidence || {}) } },
      { name: 'id', value: { stringValue: disputeId } }
    ]
  }).promise();
}

async function emitDisputeResolvedEvent(disputeId) {
  // This would integrate with the event bus to emit DisputeResolved.v1
  console.log(`Emitting DisputeResolved event for dispute ${disputeId}`);
}

async function sendStateChangeNotification(disputeId, oldState, newState, reason) {
  const sns = new AWS.SNS();
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `Dispute ${disputeId} State Changed`,
    Message: `Dispute ${disputeId} changed from ${oldState} to ${newState}.

Reason: ${reason || 'No reason provided'}`,
  }).promise();
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "dispute_resolution" {
  name = "maysar-${var.environment}-dispute-resolution-role"

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

resource "aws_iam_role_policy" "dispute_resolution" {
  name = "maysar-${var.environment}-dispute-resolution-policy"
  role = aws_iam_role.dispute_resolution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement"
        ]
        Resource = [
          var.trust_db_arn,
          var.payment_db_arn,
          var.order_db_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.trust_db_secret_arn,
          var.payment_db_secret_arn,
          var.order_db_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.dispute_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-dispute-*"
      }
    ]
  })
}

# SLA Monitoring Lambda
resource "aws_lambda_function" "dispute_sla_monitor" {
  filename         = data.archive_file.dispute_sla_monitor.output_path
  function_name    = "maysar-${var.environment}-dispute-sla-monitor"
  role            = aws_iam_role.dispute_resolution.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      TRUST_DB_ARN   = var.trust_db_arn
      SLA_THRESHOLDS = jsonencode(local.sla_thresholds)
      ALERT_TOPIC    = aws_sns_topic.dispute_notifications.arn
      ESCALATION_TOPIC = aws_sns_topic.dispute_escalation.arn
    }
  }
}

data "archive_file" "dispute_sla_monitor" {
  type        = "zip"
  output_path = "/tmp/dispute-sla-monitor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const sns = new AWS.SNS();

  try {
    const slaThresholds = JSON.parse(process.env.SLA_THRESHOLDS);
    const now = new Date();

    // Find disputes approaching or breaching SLA
    const breaches = [];

    // Check initial triage SLA (< 24 hours)
    const triageBreaches = await checkTriageSLA(rds, slaThresholds.initial_triage, now);
    breaches.push(...triageBreaches);

    // Check resolution SLA (< 7 days)
    const resolutionBreaches = await checkResolutionSLA(rds, slaThresholds.resolution, now);
    breaches.push(...resolutionBreaches);

    // Process breaches
    for (const breach of breaches) {
      if (breach.type === 'triage' && breach.hoursElapsed >= slaThresholds.initial_triage) {
        // Escalate triage breach
        await escalateTriageBreach(breach, sns);
      } else if (breach.type === 'resolution' && breach.hoursElapsed >= slaThresholds.resolution) {
        // Escalate resolution breach
        await escalateResolutionBreach(breach, sns);
      }
    }

    // Update SLA metrics
    await updateSLAMetrics(breaches);

    return {
      statusCode: 200,
      breachesDetected: breaches.length,
      triageBreaches: triageBreaches.length,
      resolutionBreaches: resolutionBreaches.length
    };

  } catch (error) {
    console.error('Dispute SLA monitoring failed:', error);
    throw error;
  }
};

async function checkTriageSLA(rds, thresholdHours, now) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT id, created_at, status
          FROM disputes
          WHERE status = 'OPENED'
            AND EXTRACT(EPOCH FROM ($1 - created_at)) / 3600 > $2`,
    parameters: [
      { name: 'now', value: { stringValue: now.toISOString() } },
      { name: 'threshold', value: { doubleValue: thresholdHours } }
    ]
  }).promise();

  return result.records.map(record => ({
    disputeId: record.id.stringValue,
    type: 'triage',
    hoursElapsed: Math.floor((now - new Date(record.created_at.stringValue)) / (1000 * 60 * 60)),
    status: record.status.stringValue,
    threshold: thresholdHours
  }));
}

async function checkResolutionSLA(rds, thresholdHours, now) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT id, created_at, status
          FROM disputes
          WHERE status IN ('OPENED', 'UNDER_REVIEW', 'EVIDENCE_COLLECTED', 'DECIDED')
            AND EXTRACT(EPOCH FROM ($1 - created_at)) / 3600 > $2`,
    parameters: [
      { name: 'now', value: { stringValue: now.toISOString() } },
      { name: 'threshold', value: { doubleValue: thresholdHours } }
    ]
  }).promise();

  return result.records.map(record => ({
    disputeId: record.id.stringValue,
    type: 'resolution',
    hoursElapsed: Math.floor((now - new Date(record.created_at.stringValue)) / (1000 * 60 * 60)),
    status: record.status.stringValue,
    threshold: thresholdHours
  }));
}

async function escalateTriageBreach(breach, sns) {
  await sns.publish({
    TopicArn: process.env.ESCALATION_TOPIC,
    Subject: `🚨 DISPUTE TRIAGE SLA BREACH: ${breach.disputeId}`,
    Message: `CRITICAL: Dispute ${breach.disputeId} has not been triaged within ${breach.threshold} hours.

Status: ${breach.status}
Hours Elapsed: ${breach.hoursElapsed}
SLA Threshold: ${breach.threshold} hours

IMMEDIATE ACTION REQUIRED: Assign dispute to an admin for review.`,
  }).promise();
}

async function escalateResolutionBreach(breach, sns) {
  await sns.publish({
    TopicArn: process.env.ESCALATION_TOPIC,
    Subject: `🚨 DISPUTE RESOLUTION SLA BREACH: ${breach.disputeId}`,
    Message: `CRITICAL: Dispute ${breach.disputeId} has not been resolved within ${breach.threshold} hours.

Status: ${breach.status}
Hours Elapsed: ${breach.hoursElapsed}
SLA Threshold: ${breach.threshold} hours

IMMEDIATE ACTION REQUIRED: Escalate to senior management for resolution.`,
  }).promise();
}

async function updateSLAMetrics(breaches) {
  // Update CloudWatch metrics for SLA monitoring
  const cloudwatch = new AWS.CloudWatch();

  await cloudwatch.putMetricData({
    Namespace: 'Maysar/Disputes',
    MetricData: [
      {
        MetricName: 'SLABreaches',
        Value: breaches.length,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'TriageSLABreaches',
        Value: breaches.filter(b => b.type === 'triage').length,
        Unit: 'Count',
        Timestamp: new Date()
      },
      {
        MetricName: 'ResolutionSLABreaches',
        Value: breaches.filter(b => b.type === 'resolution').length,
        Unit: 'Count',
        Timestamp: new Date()
      }
    ]
  }).promise();
}
EOF
    filename = "index.js"
  }
}

# Evidence Collection Lambda
resource "aws_lambda_function" "evidence_collector" {
  filename         = data.archive_file.evidence_collector.output_path
  function_name    = "maysar-${var.environment}-evidence-collector"
  role            = aws_iam_role.dispute_resolution.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 180

  environment {
    variables = {
      TRUST_DB_ARN       = var.trust_db_arn
      PAYMENT_DB_ARN     = var.payment_db_arn
      ORDER_DB_ARN       = var.order_db_arn
      LOGISTICS_DB_ARN   = var.logistics_db_arn
      EVIDENCE_BUCKET    = aws_s3_bucket.dispute_evidence.bucket
      EVIDENCE_TIMEOUT   = "172800" # 48 hours for evidence collection
    }
  }
}

data "archive_file" "evidence_collector" {
  type        = "zip"
  output_path = "/tmp/evidence-collector.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const { disputeId } = event;
  const rds = new AWS.RDSDataService();
  const s3 = new AWS.S3();

  try {
    // Collect evidence from multiple sources
    const evidence = {
      disputeId,
      collectedAt: new Date().toISOString(),
      sources: {}
    };

    // Get dispute details
    evidence.sources.dispute = await getDisputeDetails(rds, disputeId);

    // Get order details
    if (evidence.sources.dispute.orderId) {
      evidence.sources.order = await getOrderDetails(rds, evidence.sources.dispute.orderId);
    }

    // Get payment details
    if (evidence.sources.dispute.paymentId) {
      evidence.sources.payment = await getPaymentDetails(rds, evidence.sources.dispute.paymentId);
    }

    // Get logistics details
    if (evidence.sources.dispute.shipmentId) {
      evidence.sources.logistics = await getLogisticsDetails(rds, evidence.sources.dispute.shipmentId);
    }

    // Auto-analyze evidence for common patterns
    evidence.analysis = await analyzeEvidence(evidence);

    // Store evidence in S3
    const evidenceKey = `disputes/${disputeId}/evidence-${Date.now()}.json`;
    await s3.putObject({
      Bucket: process.env.EVIDENCE_BUCKET,
      Key: evidenceKey,
      Body: JSON.stringify(evidence, null, 2),
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        'dispute-id': disputeId,
        'collected-at': evidence.collectedAt
      }
    }).promise();

    // Update dispute state to EVIDENCE_COLLECTED
    await updateDisputeState(rds, disputeId, 'EVIDENCE_COLLECTED', evidenceKey);

    return {
      statusCode: 200,
      disputeId,
      evidenceCollected: true,
      evidenceKey,
      analysis: evidence.analysis
    };

  } catch (error) {
    console.error('Evidence collection failed:', error);
    throw error;
  }
};

async function getDisputeDetails(rds, disputeId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: 'SELECT * FROM disputes WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: disputeId } }]
  }).promise();

  return result.records[0] || {};
}

async function getOrderDetails(rds, orderId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.ORDER_DB_ARN,
    secretArn: process.env.ORDER_DB_SECRET_ARN,
    sql: 'SELECT * FROM orders WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: orderId } }]
  }).promise();

  return result.records[0] || {};
}

async function getPaymentDetails(rds, paymentId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.PAYMENT_DB_ARN,
    secretArn: process.env.PAYMENT_DB_SECRET_ARN,
    sql: 'SELECT * FROM payments WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: paymentId } }]
  }).promise();

  return result.records[0] || {};
}

async function getLogisticsDetails(rds, shipmentId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.LOGISTICS_DB_ARN,
    secretArn: process.env.LOGISTICS_DB_SECRET_ARN,
    sql: 'SELECT * FROM shipments WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: shipmentId } }]
  }).promise();

  return result.records[0] || {};
}

async function analyzeEvidence(evidence) {
  const analysis = {
    autoDecisions: [],
    riskFactors: [],
    recommendations: []
  };

  const dispute = evidence.sources.dispute;
  const order = evidence.sources.order;
  const logistics = evidence.sources.logistics;

  // Check for signed POD (auto-decline buyer claims)
  if (logistics.pod_signed === true && dispute.dispute_type === 'buyer_claim') {
    analysis.autoDecisions.push({
      decision: 'DECLINE_BUYER_CLAIM',
      reason: 'Proof of Delivery signed by buyer',
      confidence: 'HIGH'
    });
  }

  // Check delivery time vs claim time
  if (order && logistics && dispute) {
    const deliveryTime = new Date(logistics.delivered_at);
    const disputeTime = new Date(dispute.created_at);
    const hoursDiff = (disputeTime - deliveryTime) / (1000 * 60 * 60);

    if (hoursDiff > 168) { // More than 7 days after delivery
      analysis.riskFactors.push('Dispute filed long after delivery');
    }
  }

  // Generate recommendations
  if (analysis.autoDecisions.length > 0) {
    analysis.recommendations.push('Consider auto-resolution based on evidence');
  }

  return analysis;
}

async function updateDisputeState(rds, disputeId, newState, evidenceKey) {
  await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `UPDATE disputes SET
            status = $1,
            evidence_key = $2,
            updated_at = $3
          WHERE id = $4`,
    parameters: [
      { name: 'status', value: { stringValue: newState } },
      { name: 'evidence_key', value: { stringValue: evidenceKey } },
      { name: 'updated_at', value: { stringValue: new Date().toISOString() } },
      { name: 'id', value: { stringValue: disputeId } }
    ]
  }).promise();
}
EOF
    filename = "index.js"
  }
}

# S3 Bucket for Dispute Evidence
resource "aws_s3_bucket" "dispute_evidence" {
  bucket = "maysar-${var.environment}-dispute-evidence-${random_string.evidence_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-dispute-evidence"
  }
}

resource "random_string" "evidence_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "dispute_evidence" {
  bucket = aws_s3_bucket.dispute_evidence.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# SNS Topics for Dispute Notifications
resource "aws_sns_topic" "dispute_notifications" {
  name = "maysar-${var.environment}-dispute-notifications"

  tags = {
    Name = "maysar-${var.environment}-dispute-notifications"
  }
}

resource "aws_sns_topic" "dispute_escalation" {
  name = "maysar-${var.environment}-dispute-escalation"

  tags = {
    Name = "maysar-${var.environment}-dispute-escalation"
  }
}

# CloudWatch Alarms for Dispute SLA
resource "aws_cloudwatch_metric_alarm" "dispute_triage_sla_breach" {
  alarm_name          = "maysar-${var.environment}-dispute-triage-sla-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "TriageSLABreaches"
  namespace           = "Maysar/Disputes"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Dispute triage SLA breached"
  alarm_actions       = [aws_sns_topic.dispute_escalation.arn]

  dimensions = {
    ServiceName = "dispute-sla-monitor"
  }
}

resource "aws_cloudwatch_metric_alarm" "dispute_resolution_sla_breach" {
  alarm_name          = "maysar-${var.environment}-dispute-resolution-sla-breach"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ResolutionSLABreaches"
  namespace           = "Maysar/Disputes"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Dispute resolution SLA breached"
  alarm_actions       = [aws_sns_topic.dispute_escalation.arn]

  dimensions = {
    ServiceName = "dispute-sla-monitor"
  }
}

# CloudWatch Event Rules for Scheduled Monitoring
resource "aws_cloudwatch_event_rule" "dispute_sla_monitoring" {
  name                = "maysar-${var.environment}-dispute-sla-monitoring"
  description         = "Monitor dispute SLA compliance hourly"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "dispute_sla_monitoring" {
  rule      = aws_cloudwatch_event_rule.dispute_sla_monitoring.name
  arn       = aws_lambda_function.dispute_sla_monitor.arn
}

resource "aws_lambda_permission" "dispute_sla_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dispute_sla_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.dispute_sla_monitoring.arn
}

resource "aws_cloudwatch_event_rule" "evidence_collection_timeout" {
  name                = "maysar-${var.environment}-evidence-collection-timeout"
  description         = "Monitor evidence collection timeouts"
  schedule_expression = "rate(6 hours)"
}

resource "aws_cloudwatch_event_target" "evidence_collection_timeout" {
  rule      = aws_cloudwatch_event_rule.evidence_collection_timeout.name
  arn       = aws_lambda_function.evidence_collector.arn
}

resource "aws_lambda_permission" "evidence_collection_timeout" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.evidence_collector.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.evidence_collection_timeout.arn
}
