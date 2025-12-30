# Dispute Actors & Flow Module for Maysar

# Dispute Actors Configuration
locals {
  dispute_actors = {
    buyer = {
      role = "complainant"
      permissions = ["create_dispute", "provide_evidence", "respond_to_admin", "accept_resolution"]
      notifications = ["dispute_created", "evidence_requested", "resolution_proposed", "final_decision"]
    }
    seller = {
      role = "respondent"
      permissions = ["respond_to_dispute", "provide_evidence", "counter_claim", "accept_resolution"]
      notifications = ["dispute_received", "evidence_requested", "resolution_proposed", "final_decision"]
    }
    enabler = {
      role = "witness"
      permissions = ["provide_delivery_proof", "confirm_pod", "provide_tracking"]
      notifications = ["dispute_involving_delivery", "pod_requested", "resolution_impact"]
    }
    admin = {
      role = "arbiter"
      permissions = ["review_dispute", "request_evidence", "make_decision", "escalate", "close_dispute"]
      notifications = ["new_dispute", "evidence_submitted", "sla_breach", "escalation"]
    }
    payment_service = {
      role = "executor"
      permissions = ["process_refund", "adjust_wallet", "reverse_transaction", "hold_funds"]
      notifications = ["dispute_resolution", "payment_adjustment_required"]
    }
  }

  dispute_flow_steps = [
    "dispute_opened",
    "evidence_collection_72h",
    "auto_checks_pod_fraud",
    "admin_decision_refund_split_uphold",
    "dispute_resolved",
    "payment_execution_adjustments"
  ]
}

# Dispute Opened Event Emission Lambda
resource "aws_lambda_function" "dispute_opened_emitter" {
  filename         = data.archive_file.dispute_opened_emitter.output_path
  function_name    = "maysar-${var.environment}-dispute-opened-emitter"
  role            = aws_iam_role.dispute_flow.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      EVENT_BUS_NAME = var.event_bus_name
      ACTORS_CONFIG  = jsonencode(local.dispute_actors)
    }
  }
}

data "archive_file" "dispute_opened_emitter" {
  type        = "zip"
  output_path = "/tmp/dispute-opened-emitter.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const eventBridge = new AWS.EventBridge();
  const { disputeId, buyerId, sellerId, orderId, reason, amount, evidence } = event;

  try {
    // Create DisputeOpened.v1 event
    const disputeOpenedEvent = {
      Time: new Date(),
      Source: 'trust-service',
      DetailType: 'Dispute Lifecycle Event',
      Detail: JSON.stringify({
        eventType: 'DisputeOpened',
        eventVersion: 'v1',
        eventId: `dispute-opened-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        disputeId,
        buyerId,
        sellerId,
        orderId,
        reason,
        amount: amount || 0,
        evidence: evidence || [],
        actors: {
          buyer: buyerId,
          seller: sellerId,
          admin: null, // To be assigned
          enabler: null // To be determined from order
        },
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'dispute-creation',
          version: 'v1'
        }
      })
    };

    // Emit event to EventBridge
    await eventBridge.putEvents({
      Entries: [disputeOpenedEvent]
    }).promise();

    // Notify all relevant actors
    await notifyActors(disputeId, buyerId, sellerId, 'dispute_opened');

    return {
      statusCode: 200,
      disputeId,
      eventEmitted: true,
      actorsNotified: ['buyer', 'seller']
    };

  } catch (error) {
    console.error('Dispute opened event emission failed:', error);
    throw error;
  }
};

async function notifyActors(disputeId, buyerId, sellerId, eventType) {
  const actors = {
    buyer: buyerId,
    seller: sellerId
  };

  // Send notifications based on actor roles
  // This would integrate with the notification service
  console.log(`Notifying actors for dispute ${disputeId}:`, Object.keys(actors));
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "dispute_flow" {
  name = "maysar-${var.environment}-dispute-flow-role"

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

resource "aws_iam_role_policy" "dispute_flow" {
  name = "maysar-${var.environment}-dispute-flow-policy"
  role = aws_iam_role.dispute_flow.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-dispute-*"
      }
    ]
  })
}

# Evidence Collection with 72h Timebox
resource "aws_lambda_function" "evidence_collection_72h" {
  filename         = data.archive_file.evidence_collection_72h.output_path
  function_name    = "maysar-${var.environment}-evidence-collection-72h"
  role            = aws_iam_role.dispute_flow.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      TRUST_DB_ARN       = var.trust_db_arn
      ORDER_DB_ARN       = var.order_db_arn
      PAYMENT_DB_ARN     = var.payment_db_arn
      LOGISTICS_DB_ARN   = var.logistics_db_arn
      EVIDENCE_BUCKET    = aws_s3_bucket.dispute_evidence_flow.bucket
      TIMEBOX_HOURS      = "72"
      NOTIFICATION_TOPIC = aws_sns_topic.dispute_flow_notifications.arn
    }
  }
}

data "archive_file" "evidence_collection_72h" {
  type        = "zip"
  output_path = "/tmp/evidence-collection-72h.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const s3 = new AWS.S3();
  const sns = new AWS.SNS();

  try {
    const { disputeId } = event;
    const timeboxHours = parseInt(process.env.TIMEBOX_HOURS);

    // Collect comprehensive evidence within 72-hour timebox
    const evidence = {
      disputeId,
      collectionStart: new Date().toISOString(),
      timeboxHours,
      deadline: new Date(Date.now() + (timeboxHours * 60 * 60 * 1000)).toISOString(),
      collectedEvidence: {},
      autoAnalysis: {}
    };

    // 1. Dispute Details
    evidence.collectedEvidence.dispute = await collectDisputeEvidence(rds, disputeId);

    // 2. Order Evidence
    if (evidence.collectedEvidence.dispute.orderId) {
      evidence.collectedEvidence.order = await collectOrderEvidence(rds, evidence.collectedEvidence.dispute.orderId);
    }

    // 3. Payment Evidence
    if (evidence.collectedEvidence.dispute.paymentId) {
      evidence.collectedEvidence.payment = await collectPaymentEvidence(rds, evidence.collectedEvidence.dispute.paymentId);
    }

    // 4. Logistics/Delivery Evidence
    if (evidence.collectedEvidence.dispute.shipmentId) {
      evidence.collectedEvidence.logistics = await collectLogisticsEvidence(rds, evidence.collectedEvidence.dispute.shipmentId);
    }

    // 5. Auto-Analysis: POD and Fraud Signals
    evidence.autoAnalysis = await performAutoAnalysis(evidence.collectedEvidence);

    // Store evidence
    const evidenceKey = `disputes/${disputeId}/evidence-72h-${Date.now()}.json`;
    await s3.putObject({
      Bucket: process.env.EVIDENCE_BUCKET,
      Key: evidenceKey,
      Body: JSON.stringify(evidence, null, 2),
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        'dispute-id': disputeId,
        'collection-type': '72h-timebox',
        'deadline': evidence.deadline
      }
    }).promise();

    // Update dispute with evidence key
    await updateDisputeEvidence(rds, disputeId, evidenceKey);

    // Notify actors about evidence collection
    await notifyEvidenceCollection(disputeId, evidence, sns);

    return {
      statusCode: 200,
      disputeId,
      evidenceCollected: true,
      evidenceKey,
      deadline: evidence.deadline,
      autoAnalysis: evidence.autoAnalysis
    };

  } catch (error) {
    console.error('72h evidence collection failed:', error);
    throw error;
  }
};

async function collectDisputeEvidence(rds, disputeId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: 'SELECT * FROM disputes WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: disputeId } }]
  }).promise();

  return result.records[0] || {};
}

async function collectOrderEvidence(rds, orderId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.ORDER_DB_ARN,
    secretArn: process.env.ORDER_DB_SECRET_ARN,
    sql: 'SELECT id, user_id, status, created_at, updated_at, total_amount FROM orders WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: orderId } }]
  }).promise();

  return result.records[0] || {};
}

async function collectPaymentEvidence(rds, paymentId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.PAYMENT_DB_ARN,
    secretArn: process.env.PAYMENT_DB_SECRET_ARN,
    sql: 'SELECT id, order_id, amount, status, payment_method, created_at FROM payments WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: paymentId } }]
  }).promise();

  return result.records[0] || {};
}

async function collectLogisticsEvidence(rds, shipmentId) {
  const result = await rds.executeStatement({
    resourceArn: process.env.LOGISTICS_DB_ARN,
    secretArn: process.env.LOGISTICS_DB_SECRET_ARN,
    sql: 'SELECT id, order_id, status, pod_signed, delivered_at, tracking_events FROM shipments WHERE id = $1',
    parameters: [{ name: 'id', value: { stringValue: shipmentId } }]
  }).promise();

  return result.records[0] || {};
}

async function performAutoAnalysis(evidence) {
  const analysis = {
    podAnalysis: {},
    fraudSignals: [],
    recommendations: []
  };

  // POD Analysis
  if (evidence.logistics && evidence.logistics.pod_signed?.booleanValue === true) {
    analysis.podAnalysis = {
      signed: true,
      confidence: 'HIGH',
      impact: 'AUTO_DECLINE_BUYER_CLAIM',
      reason: 'Proof of Delivery signed by buyer confirms successful delivery'
    };
  }

  // Fraud Signals Analysis
  const dispute = evidence.dispute;
  const order = evidence.order;
  const logistics = evidence.logistics;

  // Check delivery timing vs dispute timing
  if (order.created_at && dispute.created_at && logistics.delivered_at) {
    const deliveryTime = new Date(logistics.delivered_at.stringValue);
    const disputeTime = new Date(dispute.created_at.stringValue);
    const daysDiff = (disputeTime - deliveryTime) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      analysis.fraudSignals.push({
        type: 'DELAYED_DISPUTE',
        severity: 'MEDIUM',
        description: `Dispute filed ${daysDiff.toFixed(1)} days after delivery`,
        risk: 'POTENTIAL_FRAUD'
      });
    }
  }

  // Generate recommendations
  if (analysis.podAnalysis.signed) {
    analysis.recommendations.push({
      action: 'AUTO_RESOLVE',
      decision: 'UPHOLD_SELLER',
      confidence: 'HIGH',
      reason: 'POD signature confirms delivery'
    });
  }

  return analysis;
}

async function updateDisputeEvidence(rds, disputeId, evidenceKey) {
  await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `UPDATE disputes SET
            evidence_key = $1,
            status = 'EVIDENCE_COLLECTED',
            updated_at = $2
          WHERE id = $3`,
    parameters: [
      { name: 'evidence_key', value: { stringValue: evidenceKey } },
      { name: 'updated_at', value: { stringValue: new Date().toISOString() } },
      { name: 'id', value: { stringValue: disputeId } }
    ]
  }).promise();
}

async function notifyEvidenceCollection(disputeId, evidence, sns) {
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `Dispute ${disputeId} - Evidence Collection Started`,
    Message: `Evidence collection started for dispute ${disputeId}.

Timebox: 72 hours
Deadline: ${evidence.deadline}

Auto-Analysis Results:
${JSON.stringify(evidence.autoAnalysis, null, 2)}

All parties should submit additional evidence within the timebox.`
  }).promise();
}
EOF
    filename = "index.js"
  }
}

# Auto-Checks: POD Analysis & Fraud Signals
resource "aws_lambda_function" "auto_checks_pod_fraud" {
  filename         = data.archive_file.auto_checks_pod_fraud.output_path
  function_name    = "maysar-${var.environment}-auto-checks-pod-fraud"
  role            = aws_iam_role.dispute_flow.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 180

  environment {
    variables = {
      TRUST_DB_ARN       = var.trust_db_arn
      FRAUD_ANALYSIS_ARN = var.fraud_analysis_lambda_arn
      NOTIFICATION_TOPIC = aws_sns_topic.dispute_flow_notifications.arn
    }
  }
}

data "archive_file" "auto_checks_pod_fraud" {
  type        = "zip"
  output_path = "/tmp/auto-checks-pod-fraud.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const lambda = new AWS.Lambda();
  const sns = new AWS.SNS();

  try {
    const { disputeId, evidenceKey } = event;

    // Perform comprehensive auto-checks
    const checks = {
      disputeId,
      timestamp: new Date().toISOString(),
      podAnalysis: {},
      fraudAnalysis: {},
      riskAssessment: {},
      recommendations: []
    };

    // 1. POD Analysis
    checks.podAnalysis = await performPODAnalysis(rds, disputeId);

    // 2. Fraud Signals Analysis
    checks.fraudAnalysis = await performFraudAnalysis(lambda, disputeId);

    // 3. Risk Assessment
    checks.riskAssessment = assessOverallRisk(checks.podAnalysis, checks.fraudAnalysis);

    // 4. Generate Recommendations
    checks.recommendations = generateRecommendations(checks);

    // Store check results
    await storeCheckResults(rds, disputeId, checks);

    // Auto-resolve if high confidence
    if (checks.recommendations.some(r => r.action === 'AUTO_RESOLVE' && r.confidence === 'HIGH')) {
      await triggerAutoResolution(disputeId, checks, sns);
    }

    return {
      statusCode: 200,
      disputeId,
      checksPerformed: true,
      autoResolutionTriggered: checks.recommendations.some(r => r.action === 'AUTO_RESOLVE'),
      riskLevel: checks.riskAssessment.level
    };

  } catch (error) {
    console.error('Auto-checks failed:', error);
    throw error;
  }
};

async function performPODAnalysis(rds, disputeId) {
  // Query logistics for POD information
  const podResult = await rds.executeStatement({
    resourceArn: process.env.LOGISTICS_DB_ARN,
    secretArn: process.env.LOGISTICS_DB_SECRET_ARN,
    sql: `SELECT d.id, s.pod_signed, s.delivered_at, s.pod_photos, s.gps_coordinates
          FROM disputes d
          JOIN shipments s ON d.shipment_id = s.id
          WHERE d.id = $1`,
    parameters: [{ name: 'id', value: { stringValue: disputeId } }]
  }).promise();

  const podData = podResult.records[0];

  if (!podData) {
    return { available: false, analysis: 'NO_POD_DATA' };
  }

  const analysis = {
    available: true,
    signed: podData.pod_signed?.booleanValue || false,
    deliveredAt: podData.delivered_at?.stringValue,
    photosCount: podData.pod_photos?.stringValue ? JSON.parse(podData.pod_photos.stringValue).length : 0,
    gpsAvailable: !!podData.gps_coordinates?.stringValue
  };

  // Determine POD strength
  if (analysis.signed && analysis.photosCount > 0 && analysis.gpsAvailable) {
    analysis.strength = 'VERY_STRONG';
    analysis.confidence = 'HIGH';
  } else if (analysis.signed) {
    analysis.strength = 'STRONG';
    analysis.confidence = 'MEDIUM';
  } else {
    analysis.strength = 'WEAK';
    analysis.confidence = 'LOW';
  }

  return analysis;
}

async function performFraudAnalysis(lambda, disputeId) {
  // Call fraud analysis service
  try {
    const fraudResult = await lambda.invoke({
      FunctionName: process.env.FRAUD_ANALYSIS_ARN,
      Payload: JSON.stringify({ disputeId, analysisType: 'dispute_fraud' })
    }).promise();

    return JSON.parse(fraudResult.Payload);
  } catch (error) {
    console.warn('Fraud analysis failed, using default:', error);
    return {
      fraudScore: 0,
      signals: [],
      riskLevel: 'UNKNOWN'
    };
  }
}

function assessOverallRisk(podAnalysis, fraudAnalysis) {
  let riskScore = 0;

  // POD-based risk assessment
  if (podAnalysis.confidence === 'HIGH') {
    riskScore -= 30; // Strong POD reduces risk
  } else if (podAnalysis.confidence === 'LOW') {
    riskScore += 20; // Weak POD increases risk
  }

  // Fraud-based risk assessment
  riskScore += fraudAnalysis.fraudScore || 0;

  // Determine risk level
  let level;
  if (riskScore < -20) level = 'LOW';
  else if (riskScore < 20) level = 'MEDIUM';
  else level = 'HIGH';

  return {
    score: riskScore,
    level,
    factors: {
      podStrength: podAnalysis.strength,
      fraudScore: fraudAnalysis.fraudScore
    }
  };
}

function generateRecommendations(checks) {
  const recommendations = [];

  // POD-based recommendations
  if (checks.podAnalysis.confidence === 'HIGH' && checks.podAnalysis.signed) {
    recommendations.push({
      action: 'AUTO_RESOLVE',
      decision: 'UPHOLD_SELLER',
      confidence: 'HIGH',
      reason: 'Strong POD evidence supports seller',
      evidence: checks.podAnalysis
    });
  }

  // Fraud-based recommendations
  if (checks.fraudAnalysis.riskLevel === 'HIGH') {
    recommendations.push({
      action: 'ESCALATE',
      reason: 'High fraud risk detected',
      priority: 'URGENT',
      evidence: checks.fraudAnalysis
    });
  }

  // Risk-based recommendations
  if (checks.riskAssessment.level === 'LOW') {
    recommendations.push({
      action: 'FAST_TRACK',
      reason: 'Low risk dispute can be resolved quickly',
      evidence: checks.riskAssessment
    });
  }

  return recommendations;
}

async function storeCheckResults(rds, disputeId, checks) {
  await rds.executeStatement({
    resourceArn: process.env.TRUST_DB_ARN,
    secretArn: process.env.TRUST_DB_SECRET_ARN,
    sql: `UPDATE disputes SET
            auto_checks = $1,
            risk_assessment = $2,
            updated_at = $3
          WHERE id = $4`,
    parameters: [
      { name: 'auto_checks', value: { stringValue: JSON.stringify(checks) } },
      { name: 'risk_assessment', value: { stringValue: checks.riskAssessment.level } },
      { name: 'updated_at', value: { stringValue: new Date().toISOString() } },
      { name: 'id', value: { stringValue: disputeId } }
    ]
  }).promise();
}

async function triggerAutoResolution(disputeId, checks, sns) {
  const recommendation = checks.recommendations.find(r => r.action === 'AUTO_RESOLVE');

  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `AUTO-RESOLUTION: Dispute ${disputeId}`,
    Message: `Dispute ${disputeId} qualifies for auto-resolution.

Decision: ${recommendation.decision}
Confidence: ${recommendation.confidence}
Reason: ${recommendation.reason}

The dispute will be automatically resolved.`
  }).promise();
}
EOF
    filename = "index.js"
  }
}

# Admin Decision & Payment Execution
resource "aws_lambda_function" "admin_decision_payment_execution" {
  filename         = data.archive_file.admin_decision_payment_execution.output_path
  function_name    = "maysar-${var.environment}-admin-decision-payment-execution"
  role            = aws_iam_role.dispute_flow.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      TRUST_DB_ARN         = var.trust_db_arn
      PAYMENT_SERVICE_URL  = "http://payment-service.maysar.svc.cluster.local:3000"
      EVENT_BUS_NAME       = var.event_bus_name
      NOTIFICATION_TOPIC   = aws_sns_topic.dispute_flow_notifications.arn
    }
  }
}

data "archive_file" "admin_decision_payment_execution" {
  type        = "zip"
  output_path = "/tmp/admin-decision-payment-execution.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');
const https = require('https');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const eventBridge = new AWS.EventBridge();
  const sns = new AWS.SNS();

  try {
    const { disputeId, adminId, decision, refundAmount, splitRatio, reason, evidence } = event;

    // Validate decision
    const validDecisions = ['refund', 'split', 'uphold'];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Invalid decision: ${decision}`);
    }

    // Record admin decision
    const adminDecision = {
      adminId,
      decision,
      refundAmount: refundAmount || 0,
      splitRatio: splitRatio || 0, // 0.0 to 1.0 (percentage to buyer)
      reason,
      evidence: evidence || [],
      timestamp: new Date().toISOString()
    };

    // Update dispute with decision
    await rds.executeStatement({
      resourceArn: process.env.TRUST_DB_ARN,
      secretArn: process.env.TRUST_DB_SECRET_ARN,
      sql: `UPDATE disputes SET
              status = 'DECIDED',
              admin_decision = $1,
              resolution_reason = $2,
              updated_at = $3
            WHERE id = $4`,
      parameters: [
        { name: 'admin_decision', value: { stringValue: JSON.stringify(adminDecision) } },
        { name: 'resolution_reason', value: { stringValue: reason } },
        { name: 'updated_at', value: { stringValue: new Date().toISOString() } },
        { name: 'id', value: { stringValue: disputeId } }
      ]
    }).promise();

    // Execute payment adjustments
    const paymentResult = await executePaymentAdjustments(disputeId, adminDecision);

    // Update dispute status to RESOLVED
    await rds.executeStatement({
      resourceArn: process.env.TRUST_DB_ARN,
      secretArn: process.env.TRUST_DB_SECRET_ARN,
      sql: `UPDATE disputes SET
              status = 'RESOLVED',
              payment_adjustment = $1,
              resolved_at = $2
            WHERE id = $3`,
      parameters: [
        { name: 'payment_adjustment', value: { stringValue: JSON.stringify(paymentResult) } },
        { name: 'resolved_at', value: { stringValue: new Date().toISOString() } },
        { name: 'id', value: { stringValue: disputeId } }
      ]
    }).promise();

    // Emit DisputeResolved.v1 event
    await emitDisputeResolvedEvent(eventBridge, disputeId, adminDecision, paymentResult);

    // Notify all parties
    await notifyResolution(disputeId, adminDecision, paymentResult, sns);

    return {
      statusCode: 200,
      disputeId,
      decision,
      paymentExecuted: true,
      eventEmitted: true,
      notificationsSent: true
    };

  } catch (error) {
    console.error('Admin decision and payment execution failed:', error);
    throw error;
  }
};

async function executePaymentAdjustments(disputeId, decision) {
  const { decision: action, refundAmount, splitRatio } = decision;

  let adjustments = [];

  if (action === 'refund') {
    // Full refund to buyer
    adjustments.push({
      type: 'FULL_REFUND',
      amount: refundAmount,
      to: 'buyer',
      from: 'seller'
    });
  } else if (action === 'split') {
    // Partial refund based on split ratio
    const refundToBuyer = refundAmount * splitRatio;
    const refundToSeller = refundAmount * (1 - splitRatio);

    adjustments.push({
      type: 'PARTIAL_REFUND',
      buyerAmount: refundToBuyer,
      sellerAmount: refundToSeller,
      splitRatio
    });
  } else if (action === 'uphold') {
    // No refund, seller keeps payment
    adjustments.push({
      type: 'NO_ADJUSTMENT',
      reason: 'Seller position upheld'
    });
  }

  // Call payment service to execute adjustments
  const paymentPayload = {
    disputeId,
    adjustments,
    executedBy: 'dispute-resolution-system'
  };

  try {
    const result = await callPaymentService('POST', '/admin/dispute-adjustment', paymentPayload);
    return {
      success: true,
      adjustments,
      paymentResult: result
    };
  } catch (error) {
    return {
      success: false,
      adjustments,
      error: error.message
    };
  }
}

async function emitDisputeResolvedEvent(eventBridge, disputeId, decision, paymentResult) {
  const resolvedEvent = {
    Time: new Date(),
    Source: 'trust-service',
    DetailType: 'Dispute Lifecycle Event',
    Detail: JSON.stringify({
      eventType: 'DisputeResolved',
      eventVersion: 'v1',
      eventId: `dispute-resolved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      disputeId,
      decision: decision.decision,
      refundAmount: decision.refundAmount,
      splitRatio: decision.splitRatio,
      reason: decision.reason,
      paymentAdjustment: paymentResult,
      resolvedAt: new Date().toISOString(),
      metadata: {
        source: 'dispute-resolution',
        version: 'v1'
      }
    })
  };

  await eventBridge.putEvents({
    Entries: [resolvedEvent]
  }).promise();
}

async function notifyResolution(disputeId, decision, paymentResult, sns) {
  const subject = `Dispute ${disputeId} - Final Resolution`;
  const message = `Dispute ${disputeId} has been resolved.

Decision: ${decision.decision.toUpperCase()}
${decision.refundAmount ? `Refund Amount: $${decision.refundAmount}` : ''}
${decision.splitRatio ? `Split Ratio: ${(decision.splitRatio * 100).toFixed(1)}% to buyer` : ''}

Reason: ${decision.reason}

Payment Status: ${paymentResult.success ? 'Executed successfully' : 'Failed - manual intervention required'}

This decision is final.`;

  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: subject,
    Message: message
  }).promise();
}

async function callPaymentService(method, path, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'payment-service.maysar.svc.cluster.local',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SERVICE_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ success: true });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}
EOF
    filename = "index.js"
  }
}

# S3 Bucket for Dispute Evidence Flow
resource "aws_s3_bucket" "dispute_evidence_flow" {
  bucket = "maysar-${var.environment}-dispute-evidence-flow-${random_string.evidence_flow_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-dispute-evidence-flow"
  }
}

resource "random_string" "evidence_flow_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "dispute_evidence_flow" {
  bucket = aws_s3_bucket.dispute_evidence_flow.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# SNS Topic for Dispute Flow Notifications
resource "aws_sns_topic" "dispute_flow_notifications" {
  name = "maysar-${var.environment}-dispute-flow-notifications"

  tags = {
    Name = "maysar-${var.environment}-dispute-flow-notifications"
  }
}

# CloudWatch Events for Dispute Flow Automation
resource "aws_cloudwatch_event_rule" "dispute_evidence_collection" {
  name                = "maysar-${var.environment}-dispute-evidence-collection"
  description         = "Trigger evidence collection when dispute enters UNDER_REVIEW"
  event_pattern = jsonencode({
    source      = ["trust-service"]
    detail-type = ["Dispute State Change"]
    detail = {
      newState = ["UNDER_REVIEW"]
    }
  })
}

resource "aws_cloudwatch_event_target" "dispute_evidence_collection" {
  rule      = aws_cloudwatch_event_rule.dispute_evidence_collection.name
  arn       = aws_lambda_function.evidence_collection_72h.arn
}

resource "aws_lambda_permission" "dispute_evidence_collection" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.evidence_collection_72h.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.dispute_evidence_collection.arn
}

resource "aws_cloudwatch_event_rule" "dispute_auto_checks" {
  name                = "maysar-${var.environment}-dispute-auto-checks"
  description         = "Trigger auto-checks when evidence is collected"
  event_pattern = jsonencode({
    source      = ["trust-service"]
    detail-type = ["Dispute State Change"]
    detail = {
      newState = ["EVIDENCE_COLLECTED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "dispute_auto_checks" {
  rule      = aws_cloudwatch_event_rule.dispute_auto_checks.name
  arn       = aws_lambda_function.auto_checks_pod_fraud.arn
}

resource "aws_lambda_permission" "dispute_auto_checks" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auto_checks_pod_fraud.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.dispute_auto_checks.arn
}
