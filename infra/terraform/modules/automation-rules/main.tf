# Automation Rules Module for Maysar

# Signed POD Auto-Decline Lambda
resource "aws_lambda_function" "pod_auto_decline" {
  filename         = data.archive_file.pod_auto_decline.output_path
  function_name    = "maysar-${var.environment}-pod-auto-decline"
  role            = aws_iam_role.automation_rules.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      TRUST_DB_ARN       = var.trust_db_arn
      LOGISTICS_DB_ARN   = var.logistics_db_arn
      EVENT_BUS_NAME     = var.event_bus_name
      NOTIFICATION_TOPIC = aws_sns_topic.automation_alerts.arn
      MIN_POD_STRENGTH   = "STRONG" # Minimum POD strength for auto-decline
    }
  }
}

data "archive_file" "pod_auto_decline" {
  type        = "zip"
  output_path = "/tmp/pod-auto-decline.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const eventBridge = new AWS.EventBridge();
  const sns = new AWS.SNS();

  try {
    const { disputeId } = event;

    // Get dispute details
    const dispute = await getDisputeDetails(rds, disputeId);
    if (!dispute) {
      throw new Error(`Dispute ${disputeId} not found`);
    }

    // Check if dispute is buyer claim type
    if (dispute.dispute_type !== 'buyer_claim') {
      console.log(`Dispute ${disputeId} is not a buyer claim, skipping POD auto-decline`);
      return { autoDeclined: false, reason: 'Not a buyer claim dispute' };
    }

    // Get POD information
    const podInfo = await getPODInformation(rds, dispute.shipment_id);
    if (!podInfo) {
      console.log(`No POD information found for dispute ${disputeId}`);
      return { autoDeclined: false, reason: 'No POD information available' };
    }

    // Assess POD strength
    const podStrength = assessPODStrength(podInfo);

    // Check minimum strength requirement
    if (podStrength.level !== process.env.MIN_POD_STRENGTH &&
        podStrength.level !== 'VERY_STRONG') {
      console.log(`POD strength ${podStrength.level} below minimum requirement for auto-decline`);
      return { autoDeclined: false, reason: `POD strength ${podStrength.level} insufficient` };
    }

    // Auto-decline the dispute
    await autoDeclineDispute(rds, disputeId, podStrength);

    // Emit DisputeResolved event
    await emitDisputeResolved(eventBridge, disputeId, 'AUTO_DECLINED_POD', podStrength);

    // Notify stakeholders
    await notifyAutoDecline(sns, disputeId, dispute, podStrength);

    return {
      autoDeclined: true,
      disputeId,
      podStrength: podStrength.level,
      reason: 'Strong POD evidence supports seller position'
    };

  } catch (error) {
    console.error('POD auto-decline failed:', error);
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

  return result.records[0] || null;
}

async function getPODInformation(rds, shipmentId) {
  if (!shipmentId) return null;

  const result = await rds.executeStatement({
    resourceArn: process.env.LOGISTICS_DB_ARN,
    secretArn: process.env.LOGISTICS_DB_SECRET_ARN,
    sql: 'SELECT pod_signed, pod_photos, gps_coordinates, delivered_at FROM shipments WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: shipmentId } }]
  }).promise();

  return result.records[0] || null;
}

function assessPODStrength(podInfo) {
  if (!podInfo) return { level: 'NONE', score: 0 };

  let score = 0;
  const factors = [];

  // Signature check (high weight)
  if (podInfo.pod_signed?.booleanValue === true) {
    score += 50;
    factors.push('signed');
  }

  // Photos check (medium weight)
  const photoCount = podInfo.pod_photos?.stringValue ?
    JSON.parse(podInfo.pod_photos.stringValue).length : 0;
  if (photoCount > 0) {
    score += 30;
    factors.push(`${photoCount} photos`);
  }

  // GPS check (medium weight)
  if (podInfo.gps_coordinates?.stringValue) {
    score += 20;
    factors.push('GPS coordinates');
  }

  // Determine level
  let level;
  if (score >= 80) level = 'VERY_STRONG';
  else if (score >= 50) level = 'STRONG';
  else if (score >= 20) level = 'MODERATE';
  else level = 'WEAK';

  return { level, score, factors };
}

async function autoDeclineDispute(rds, disputeId, podStrength) {
  const now = new Date().toISOString();
  const reason = `Auto-declined due to strong POD evidence (strength: ${podStrength.level}, score: ${podStrength.score})`;

  await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `UPDATE disputes SET
            status = 'RESOLVED',
            resolution_reason = $1,
            auto_resolution = $2,
            resolved_at = $3
          WHERE id = $4`,
    parameters: [
      { name: 'resolution_reason', value: { stringValue: reason } },
      { name: 'auto_resolution', value: { stringValue: JSON.stringify({
        type: 'POD_AUTO_DECLINE',
        podStrength: podStrength.level,
        podScore: podStrength.score,
        factors: podStrength.factors,
        timestamp: now
      }) } },
      { name: 'resolved_at', value: { stringValue: now } },
      { name: 'id', value: { stringValue: disputeId } }
    ]
  }).promise();
}

async function emitDisputeResolved(eventBridge, disputeId, resolutionType, podStrength) {
  const resolvedEvent = {
    Time: new Date(),
    Source: 'trust-service',
    DetailType: 'Dispute Lifecycle Event',
    Detail: JSON.stringify({
      eventType: 'DisputeResolved',
      eventVersion: 'v1',
      eventId: `dispute-resolved-auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      disputeId,
      resolution: {
        type: resolutionType,
        autoResolved: true,
        podStrength: podStrength.level,
        reason: 'Strong POD evidence supports seller position'
      },
      resolvedAt: new Date().toISOString(),
      metadata: {
        source: 'automation-rules',
        automationType: 'pod-auto-decline',
        version: 'v1'
      }
    })
  };

  await eventBridge.putEvents({
    Entries: [resolvedEvent]
  }).promise();
}

async function notifyAutoDecline(sns, disputeId, dispute, podStrength) {
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `AUTO-RESOLUTION: Dispute ${disputeId} - POD Auto-Decline`,
    Message: `Dispute ${disputeId} has been automatically resolved due to strong Proof of Delivery evidence.

Resolution: BUYER CLAIM DECLINED
POD Strength: ${podStrength.level} (${podStrength.score} points)
POD Factors: ${podStrength.factors.join(', ')}

The buyer claim has been automatically declined because the delivery proof clearly demonstrates successful delivery to the buyer.`
  }).promise();
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "automation_rules" {
  name = "maysar-${var.environment}-automation-rules-role"

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

resource "aws_iam_role_policy" "automation_rules" {
  name = "maysar-${var.environment}-automation-rules-policy"
  role = aws_iam_role.automation_rules.id

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
          var.logistics_db_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.trust_db_secret_arn,
          var.logistics_db_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = var.event_bus_arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.automation_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-automation-*"
      }
    ]
  })
}

# Repeat Pattern Flagging Lambda
resource "aws_lambda_function" "repeat_pattern_flagger" {
  filename         = data.archive_file.repeat_pattern_flagger.output_path
  function_name    = "maysar-${var.environment}-repeat-pattern-flagger"
  role            = aws_iam_role.automation_rules.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      TRUST_DB_ARN       = var.trust_db_arn
      FRAUD_DB_ARN       = var.fraud_db_arn
      PATTERN_THRESHOLD  = "3" # Minimum occurrences to flag as pattern
      LOOKBACK_DAYS      = "90" # Days to look back for patterns
      ALERT_TOPIC        = aws_sns_topic.automation_alerts.arn
    }
  }
}

data "archive_file" "repeat_pattern_flagger" {
  type        = "zip"
  output_path = "/tmp/repeat-pattern-flagger.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const sns = new AWS.SNS();

  try {
    // Analyze recent disputes for patterns
    const patterns = await analyzeDisputePatterns(rds);

    // Flag significant patterns
    const flaggedPatterns = [];
    const threshold = parseInt(process.env.PATTERN_THRESHOLD);

    for (const pattern of patterns) {
      if (pattern.occurrences >= threshold) {
        flaggedPatterns.push(pattern);

        // Store pattern in fraud database
        await storeFraudPattern(rds, pattern);

        // Alert if high-risk pattern
        if (pattern.riskLevel === 'HIGH') {
          await alertHighRiskPattern(sns, pattern);
        }
      }
    }

    return {
      statusCode: 200,
      patternsAnalyzed: patterns.length,
      patternsFlagged: flaggedPatterns.length,
      highRiskPatterns: flaggedPatterns.filter(p => p.riskLevel === 'HIGH').length
    };

  } catch (error) {
    console.error('Repeat pattern flagging failed:', error);
    throw error;
  }
};

async function analyzeDisputePatterns(rds) {
  const lookbackDays = parseInt(process.env.LOOKBACK_DAYS);
  const patterns = [];

  // Pattern 1: Same buyer multiple disputes against different sellers
  const buyerPatterns = await analyzeBuyerPatterns(rds, lookbackDays);
  patterns.push(...buyerPatterns);

  // Pattern 2: Same seller multiple disputes from different buyers
  const sellerPatterns = await analyzeSellerPatterns(rds, lookbackDays);
  patterns.push(...sellerPatterns);

  // Pattern 3: Disputes with same reason pattern
  const reasonPatterns = await analyzeReasonPatterns(rds, lookbackDays);
  patterns.push(...reasonPatterns);

  // Pattern 4: Time-based patterns (e.g., disputes filed at specific times)
  const timePatterns = await analyzeTimePatterns(rds, lookbackDays);
  patterns.push(...timePatterns);

  return patterns;
}

async function analyzeBuyerPatterns(rds, lookbackDays) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT
            buyer_id,
            COUNT(*) as dispute_count,
            COUNT(DISTINCT seller_id) as unique_sellers,
            AVG(CASE WHEN resolution = 'buyer_wins' THEN 1 ELSE 0 END) as win_rate
          FROM disputes
          WHERE created_at >= NOW() - INTERVAL '${lookbackDays} days'
          GROUP BY buyer_id
          HAVING COUNT(*) >= 2
          ORDER BY dispute_count DESC`,
  }).promise();

  return result.records.map(record => ({
    type: 'BUYER_MULTIPLE_DISPUTES',
    buyerId: record.buyer_id.stringValue,
    occurrences: parseInt(record.dispute_count.stringValue),
    uniqueSellers: parseInt(record.unique_sellers.stringValue),
    winRate: parseFloat(record.win_rate.stringValue),
    riskLevel: parseInt(record.dispute_count.stringValue) >= 5 ? 'HIGH' : 'MEDIUM',
    description: `Buyer filed ${record.dispute_count.stringValue} disputes against ${record.unique_sellers.stringValue} different sellers`
  }));
}

async function analyzeSellerPatterns(rds, lookbackDays) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT
            seller_id,
            COUNT(*) as dispute_count,
            COUNT(DISTINCT buyer_id) as unique_buyers,
            AVG(CASE WHEN resolution = 'seller_wins' THEN 1 ELSE 0 END) as win_rate
          FROM disputes
          WHERE created_at >= NOW() - INTERVAL '${lookbackDays} days'
          GROUP BY seller_id
          HAVING COUNT(*) >= 3
          ORDER BY dispute_count DESC`,
  }).promise();

  return result.records.map(record => ({
    type: 'SELLER_MULTIPLE_DISPUTES',
    sellerId: record.seller_id.stringValue,
    occurrences: parseInt(record.dispute_count.stringValue),
    uniqueBuyers: parseInt(record.unique_buyers.stringValue),
    winRate: parseFloat(record.win_rate.stringValue),
    riskLevel: parseFloat(record.win_rate.stringValue) < 0.3 ? 'HIGH' : 'MEDIUM',
    description: `Seller involved in ${record.dispute_count.stringValue} disputes with ${record.unique_buyers.stringValue} buyers (win rate: ${(parseFloat(record.win_rate.stringValue) * 100).toFixed(1)}%)`
  }));
}

async function analyzeReasonPatterns(rds, lookbackDays) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT
            reason,
            COUNT(*) as occurrence_count,
            COUNT(DISTINCT buyer_id) as unique_buyers,
            AVG(amount) as avg_amount
          FROM disputes
          WHERE created_at >= NOW() - INTERVAL '${lookbackDays} days'
          GROUP BY reason
          HAVING COUNT(*) >= 5
          ORDER BY occurrence_count DESC`,
  }).promise();

  return result.records.map(record => ({
    type: 'REASON_PATTERN',
    reason: record.reason.stringValue,
    occurrences: parseInt(record.occurrence_count.stringValue),
    uniqueBuyers: parseInt(record.unique_buyers.stringValue),
    avgAmount: parseFloat(record.avg_amount.stringValue),
    riskLevel: parseInt(record.occurrence_count.stringValue) >= 10 ? 'HIGH' : 'MEDIUM',
    description: `Reason "${record.reason.stringValue}" used in ${record.occurrence_count.stringValue} disputes by ${record.unique_buyers.stringValue} buyers`
  }));
}

async function analyzeTimePatterns(rds, lookbackDays) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `SELECT
            EXTRACT(hour from created_at) as dispute_hour,
            COUNT(*) as disputes_in_hour
          FROM disputes
          WHERE created_at >= NOW() - INTERVAL '${lookbackDays} days'
          GROUP BY EXTRACT(hour from created_at)
          HAVING COUNT(*) >= 10
          ORDER BY disputes_in_hour DESC`,
  }).promise();

  return result.records.map(record => ({
    type: 'TIME_PATTERN',
    hour: parseInt(record.dispute_hour.stringValue),
    occurrences: parseInt(record.disputes_in_hour.stringValue),
    riskLevel: parseInt(record.disputes_in_hour.stringValue) >= 20 ? 'HIGH' : 'MEDIUM',
    description: `${record.disputes_in_hour.stringValue} disputes filed at hour ${record.dispute_hour.stringValue}`
  }));
}

async function storeFraudPattern(rds, pattern) {
  await rds.executeStatement({
    resourceArn: process.env.FRAUD_DB_ARN,
    secretArn: process.env.FRAUD_DB_SECRET_ARN,
    sql: `INSERT INTO fraud_patterns
          (pattern_type, entity_id, occurrences, risk_level, description, detected_at)
          VALUES ($1, $2, $3, $4, $5, $6)`,
    parameters: [
      { name: 'pattern_type', value: { stringValue: pattern.type } },
      { name: 'entity_id', value: { stringValue: pattern.buyerId || pattern.sellerId || pattern.reason || `hour_${pattern.hour}` } },
      { name: 'occurrences', value: { integerValue: pattern.occurrences } },
      { name: 'risk_level', value: { stringValue: pattern.riskLevel } },
      { name: 'description', value: { stringValue: pattern.description } },
      { name: 'detected_at', value: { stringValue: new Date().toISOString() } }
    ]
  }).promise();
}

async function alertHighRiskPattern(sns, pattern) {
  await sns.publish({
    TopicArn: process.env.ALERT_TOPIC,
    Subject: `🚨 HIGH RISK FRAUD PATTERN DETECTED: ${pattern.type}`,
    Message: `High-risk fraud pattern detected:

Type: ${pattern.type}
Description: ${pattern.description}
Occurrences: ${pattern.occurrences}
Risk Level: ${pattern.riskLevel}

IMMEDIATE INVESTIGATION REQUIRED.`
  }).promise();
}
EOF
    filename = "index.js"
  }
}

# SNS Topic for Automation Alerts
resource "aws_sns_topic" "automation_alerts" {
  name = "maysar-${var.environment}-automation-alerts"

  tags = {
    Name = "maysar-${var.environment}-automation-alerts"
  }
}

# CloudWatch Event Rules for Automation
resource "aws_cloudwatch_event_rule" "pod_auto_decline_trigger" {
  name                = "maysar-${var.environment}-pod-auto-decline-trigger"
  description         = "Trigger POD auto-decline when evidence is collected"
  event_pattern = jsonencode({
    source      = ["trust-service"]
    detail-type = ["Dispute State Change"]
    detail = {
      newState = ["EVIDENCE_COLLECTED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "pod_auto_decline_trigger" {
  rule      = aws_cloudwatch_event_rule.pod_auto_decline_trigger.name
  arn       = aws_lambda_function.pod_auto_decline.arn
}

resource "aws_lambda_permission" "pod_auto_decline_trigger" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pod_auto_decline.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.pod_auto_decline_trigger.arn
}

resource "aws_cloudwatch_event_rule" "repeat_pattern_analysis" {
  name                = "maysar-${var.environment}-repeat-pattern-analysis"
  description         = "Daily analysis of dispute patterns for fraud detection"
  schedule_expression = "cron(0 2 * * ? *)" # Daily at 2 AM UTC
}

resource "aws_cloudwatch_event_target" "repeat_pattern_analysis" {
  rule      = aws_cloudwatch_event_rule.repeat_pattern_analysis.name
  arn       = aws_lambda_function.repeat_pattern_flagger.arn
}

resource "aws_lambda_permission" "repeat_pattern_analysis" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.repeat_pattern_flagger.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.repeat_pattern_analysis.arn
}
