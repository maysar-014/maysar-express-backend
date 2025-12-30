# Two-Person Rule Implementation Module for Maysar

# Approval Request Processing Lambda
resource "aws_lambda_function" "approval_processor" {
  filename         = data.archive_file.approval_processor.output_path
  function_name    = "maysar-${var.environment}-approval-processor"
  role            = aws_iam_role.approval_processor.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      APPROVAL_BUCKET = aws_s3_bucket.approval_requests.bucket
      NOTIFICATION_TOPIC = aws_sns_topic.approval_notifications.arn
      APPROVAL_TIMEOUT = var.approval_timeout_hours
      REQUIRED_APPROVERS = var.required_approvers
    }
  }
}

data "archive_file" "approval_processor" {
  type        = "zip"
  output_path = "/tmp/approval-processor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const sns = new AWS.SNS();

  try {
    const { action, amount, requester, details, entityId } = event;

    // Check if action requires two-person approval
    const requiresApproval = checkApprovalRequired(action, amount);

    if (!requiresApproval) {
      return {
        requiresApproval: false,
        approved: true,
        message: "Action does not require approval"
      };
    }

    // Create approval request
    const approvalRequest = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      amount: amount || 0,
      requester,
      details,
      entityId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (parseInt(process.env.APPROVAL_TIMEOUT) * 3600000)).toISOString(),
      approvers: [],
      requiredApprovers: parseInt(process.env.REQUIRED_APPROVERS),
      approvalType: getApprovalType(action)
    };

    // Store approval request
    const key = `approvals/${approvalRequest.id}.json`;
    await s3.putObject({
      Bucket: process.env.APPROVAL_BUCKET,
      Key: key,
      Body: JSON.stringify(approvalRequest, null, 2),
      ServerSideEncryption: 'aws:kms',
      Metadata: {
        'approval-id': approvalRequest.id,
        'action': action,
        'requester': requester
      }
    }).promise();

    // Send approval notifications
    await sendApprovalNotifications(approvalRequest, sns);

    return {
      requiresApproval: true,
      approvalId: approvalRequest.id,
      message: "Approval request created and notifications sent"
    };

  } catch (error) {
    console.error('Approval processing failed:', error);
    throw error;
  }
};

function checkApprovalRequired(action, amount) {
  // Wallet credits above $1000
  if (action === 'wallet_credit' && amount > 1000) {
    return true;
  }

  // All refunds require approval
  if (action === 'force_refund') {
    return true;
  }

  // Escrow releases
  if (action === 'escrow_release') {
    return true;
  }

  // Financial overrides
  if (action === 'financial_override') {
    return true;
  }

  return false;
}

function getApprovalType(action) {
  const types = {
    'wallet_credit': 'financial',
    'force_refund': 'financial',
    'escrow_release': 'financial',
    'financial_override': 'compliance'
  };
  return types[action] || 'general';
}

async function sendApprovalNotifications(approvalRequest, sns) {
  const subject = `🚨 Maysar ${approvalRequest.approvalType.toUpperCase()} Approval Required`;
  const message = `A ${approvalRequest.approvalType} action requires your approval:

Action: ${approvalRequest.action}
${approvalRequest.amount ? `Amount: $${approvalRequest.amount}` : ''}
Requester: ${approvalRequest.requester}
Entity ID: ${approvalRequest.entityId}
Details: ${JSON.stringify(approvalRequest.details, null, 2)}

Approval ID: ${approvalRequest.id}
Expires: ${approvalRequest.expiresAt}

Please review and approve via the admin console.`;

  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: subject,
    Message: message
  }).promise();
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "approval_processor" {
  name = "maysar-${var.environment}-approval-processor-role"

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

resource "aws_iam_role_policy" "approval_processor" {
  name = "maysar-${var.environment}-approval-processor-policy"
  role = aws_iam_role.approval_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.approval_requests.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.approval_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-approval-processor"
      }
    ]
  })
}

# Approval Response Handler Lambda
resource "aws_lambda_function" "approval_responder" {
  filename         = data.archive_file.approval_responder.output_path
  function_name    = "maysar-${var.environment}-approval-responder"
  role            = aws_iam_role.approval_responder.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      APPROVAL_BUCKET = aws_s3_bucket.approval_requests.bucket
      EXECUTION_ROLE = aws_iam_role.financial_execution.arn
    }
  }
}

data "archive_file" "approval_responder" {
  type        = "zip"
  output_path = "/tmp/approval-responder.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const lambda = new AWS.Lambda();

  try {
    const { approvalId, approverId, decision, reason } = event;

    // Get approval request
    const approvalKey = `approvals/${approvalId}.json`;
    const approvalResponse = await s3.getObject({
      Bucket: process.env.APPROVAL_BUCKET,
      Key: approvalKey
    }).promise();

    const approvalRequest = JSON.parse(approvalResponse.Body.toString());

    // Check if approval is still valid
    if (new Date() > new Date(approvalRequest.expiresAt)) {
      throw new Error('Approval request has expired');
    }

    // Record approver decision
    approvalRequest.approvers.push({
      approverId,
      decision,
      reason,
      timestamp: new Date().toISOString()
    });

    // Check if we have enough approvals
    const approvals = approvalRequest.approvers.filter(a => a.decision === 'approved').length;
    const rejections = approvalRequest.approvers.filter(a => a.decision === 'rejected').length;

    if (approvals >= approvalRequest.requiredApprovers) {
      // Execute approved action
      await executeApprovedAction(approvalRequest, lambda);
      approvalRequest.status = 'approved';
      approvalRequest.executedAt = new Date().toISOString();
    } else if (rejections > 0) {
      // Action rejected
      approvalRequest.status = 'rejected';
    }

    // Update approval request
    await s3.putObject({
      Bucket: process.env.APPROVAL_BUCKET,
      Key: approvalKey,
      Body: JSON.stringify(approvalRequest, null, 2),
      ServerSideEncryption: 'aws:kms'
    }).promise();

    return {
      statusCode: 200,
      approvalId,
      status: approvalRequest.status,
      message: `Approval ${decision} recorded`
    };

  } catch (error) {
    console.error('Approval response failed:', error);
    throw error;
  }
};

async function executeApprovedAction(approvalRequest, lambda) {
  // Call the appropriate service to execute the action
  const executionPayload = {
    action: approvalRequest.action,
    entityId: approvalRequest.entityId,
    amount: approvalRequest.amount,
    details: approvalRequest.details,
    approvalId: approvalRequest.id,
    approvers: approvalRequest.approvers.map(a => a.approverId)
  };

  // Call financial execution lambda
  await lambda.invoke({
    FunctionName: 'maysar-' + process.env.ENVIRONMENT + '-financial-execution',
    Payload: JSON.stringify(executionPayload),
    InvocationType: 'Event' // Asynchronous execution
  }).promise();
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "approval_responder" {
  name = "maysar-${var.environment}-approval-responder-role"

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

resource "aws_iam_role_policy" "approval_responder" {
  name = "maysar-${var.environment}-approval-responder-policy"
  role = aws_iam_role.approval_responder.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.approval_requests.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_iam_role.financial_execution.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-approval-responder"
      }
    ]
  })
}

# Financial Execution Lambda
resource "aws_lambda_function" "financial_execution" {
  filename         = data.archive_file.financial_execution.output_path
  function_name    = "maysar-${var.environment}-financial-execution"
  role            = aws_iam_role.financial_execution.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      PAYMENT_SERVICE_URL = "http://payment-service.maysar.svc.cluster.local:3000"
      APPROVAL_BUCKET     = aws_s3_bucket.approval_requests.bucket
    }
  }
}

data "archive_file" "financial_execution" {
  type        = "zip"
  output_path = "/tmp/financial-execution.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');
const https = require('https');

exports.handler = async (event) => {
  const s3 = new AWS.S3();

  try {
    const { action, entityId, amount, details, approvalId, approvers } = event;

    // Execute the approved financial action
    const result = await executeFinancialAction(action, entityId, amount, details, approvers);

    // Update approval request with execution result
    const approvalKey = `approvals/${approvalId}.json`;
    const approvalResponse = await s3.getObject({
      Bucket: process.env.APPROVAL_BUCKET,
      Key: approvalKey
    }).promise();

    const approvalRequest = JSON.parse(approvalResponse.Body.toString());
    approvalRequest.executionResult = result;
    approvalRequest.executedAt = new Date().toISOString();
    approvalRequest.status = 'executed';

    await s3.putObject({
      Bucket: process.env.APPROVAL_BUCKET,
      Key: approvalKey,
      Body: JSON.stringify(approvalRequest, null, 2),
      ServerSideEncryption: 'aws:kms'
    }).promise();

    return {
      statusCode: 200,
      approvalId,
      executionResult: result,
      message: 'Financial action executed successfully'
    };

  } catch (error) {
    console.error('Financial execution failed:', error);
    throw error;
  }
};

async function executeFinancialAction(action, entityId, amount, details, approvers) {
  // Call payment service to execute the action
  const payload = {
    action,
    entityId,
    amount,
    details,
    approvers,
    executedBy: 'two-person-approval-system'
  };

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'payment-service.maysar.svc.cluster.local',
      port: 3000,
      path: '/admin/financial-action',
      method: 'POST',
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
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ success: true, message: 'Action executed' });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(JSON.stringify(payload));
    req.end();
  });
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "financial_execution" {
  name = "maysar-${var.environment}-financial-execution-role"

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

resource "aws_iam_role_policy" "financial_execution" {
  name = "maysar-${var.environment}-financial-execution-policy"
  role = aws_iam_role.financial_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.approval_requests.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-financial-execution"
      }
    ]
  })
}

# S3 Bucket for Approval Requests
resource "aws_s3_bucket" "approval_requests" {
  bucket = "maysar-${var.environment}-approval-requests-${random_string.approval_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-approval-requests"
  }
}

resource "random_string" "approval_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "approval_requests" {
  bucket = aws_s3_bucket.approval_requests.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "approval_requests" {
  bucket = aws_s3_bucket.approval_requests.id
  versioning_configuration {
    status = "Enabled"
  }
}

# SNS Topic for Approval Notifications
resource "aws_sns_topic" "approval_notifications" {
  name = "maysar-${var.environment}-approval-notifications"

  tags = {
    Name = "maysar-${var.environment}-approval-notifications"
  }
}

# CloudWatch Alarms for Approval System
resource "aws_cloudwatch_metric_alarm" "pending_approvals" {
  alarm_name          = "maysar-${var.environment}-pending-approvals"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "PendingApprovals"
  namespace           = "Maysar/Approvals"
  period              = "3600"
  statistic           = "Maximum"
  threshold           = "10"
  alarm_description   = "High number of pending approvals"
  alarm_actions       = [aws_sns_topic.approval_notifications.arn]

  dimensions = {
    ServiceName = "approval-processor"
  }
}

resource "aws_cloudwatch_metric_alarm" "expired_approvals" {
  alarm_name          = "maysar-${var.environment}-expired-approvals"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ExpiredApprovals"
  namespace           = "Maysar/Approvals"
  period              = "3600"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Approval requests have expired"
  alarm_actions       = [aws_sns_topic.approval_notifications.arn]

  dimensions = {
    ServiceName = "approval-processor"
  }
}

# Lambda for Cleanup of Expired Approvals
resource "aws_lambda_function" "approval_cleanup" {
  filename         = data.archive_file.approval_cleanup.output_path
  function_name    = "maysar-${var.environment}-approval-cleanup"
  role            = aws_iam_role.approval_cleanup.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      APPROVAL_BUCKET = aws_s3_bucket.approval_requests.bucket
    }
  }
}

data "archive_file" "approval_cleanup" {
  type        = "zip"
  output_path = "/tmp/approval-cleanup.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();

  try {
    // List all approval requests
    const objects = await listAllObjects(process.env.APPROVAL_BUCKET, 'approvals/');
    let expiredCount = 0;

    for (const obj of objects) {
      const approvalData = await s3.getObject({
        Bucket: process.env.APPROVAL_BUCKET,
        Key: obj.Key
      }).promise();

      const approval = JSON.parse(approvalData.Body.toString());

      // Check if expired and still pending
      if (approval.status === 'pending' && new Date() > new Date(approval.expiresAt)) {
        approval.status = 'expired';
        approval.expiredAt = new Date().toISOString();

        // Update expired approval
        await s3.putObject({
          Bucket: process.env.APPROVAL_BUCKET,
          Key: obj.Key,
          Body: JSON.stringify(approval, null, 2),
          ServerSideEncryption: 'aws:kms'
        }).promise();

        expiredCount++;
      }
    }

    return {
      statusCode: 200,
      expiredApprovals: expiredCount,
      message: `Cleaned up ${expiredCount} expired approvals`
    };

  } catch (error) {
    console.error('Approval cleanup failed:', error);
    throw error;
  }
};

async function listAllObjects(bucketName, prefix) {
  const s3 = new AWS.S3();
  const objects = [];
  let continuationToken;

  do {
    const params = {
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken
    };

    const response = await s3.listObjectsV2(params).promise();
    objects.push(...(response.Contents || []));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "approval_cleanup" {
  name = "maysar-${var.environment}-approval-cleanup-role"

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

resource "aws_iam_role_policy" "approval_cleanup" {
  name = "maysar-${var.environment}-approval-cleanup-policy"
  role = aws_iam_role.approval_cleanup.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.approval_requests.arn,
          "${aws_s3_bucket.approval_requests.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-approval-cleanup"
      }
    ]
  })
}

# CloudWatch Event Rule for Daily Cleanup
resource "aws_cloudwatch_event_rule" "daily_approval_cleanup" {
  name                = "maysar-${var.environment}-daily-approval-cleanup"
  description         = "Daily cleanup of expired approval requests"
  schedule_expression = "cron(0 3 * * ? *)" # Daily at 3 AM UTC
}

resource "aws_cloudwatch_event_target" "daily_approval_cleanup" {
  rule      = aws_cloudwatch_event_rule.daily_approval_cleanup.name
  arn       = aws_lambda_function.approval_cleanup.arn
}

resource "aws_lambda_permission" "daily_approval_cleanup" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.approval_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_approval_cleanup.arn
}
