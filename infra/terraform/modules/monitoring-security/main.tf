# Monitoring Security Module for Maysar

# Auth Failure Monitoring Lambda
resource "aws_lambda_function" "auth_failure_monitor" {
  filename         = data.archive_file.auth_failure_monitor.output_path
  function_name    = "maysar-${var.environment}-auth-failure-monitor"
  role            = aws_iam_role.monitoring_security.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      ALERT_TOPIC = aws_sns_topic.monitoring_security_alerts.arn
      LOG_GROUP   = "/aws/lambda/maysar-${var.environment}-auth-service"
      TIME_WINDOW = "300" # 5 minutes
    }
  }
}

data "archive_file" "auth_failure_monitor" {
  type        = "zip"
  output_path = "/tmp/auth-failure-monitor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const cloudwatch = new AWS.CloudWatchLogs();
  const sns = new AWS.SNS();

  try {
    // Analyze auth service logs for failure patterns
    const logGroupName = process.env.LOG_GROUP;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (parseInt(process.env.TIME_WINDOW) * 1000));

    // Query for auth failures
    const authFailures = await queryCloudWatchLogs(logGroupName, startTime, endTime, [
      '"LOGIN_FAILED"',
      '"INVALID_CREDENTIALS"',
      '"ACCOUNT_LOCKED"',
      '"SUSPICIOUS_ACTIVITY"'
    ]);

    const failureCount = authFailures.length;

    if (failureCount > 10) { // Threshold for alerts
      await sns.publish({
        TopicArn: process.env.ALERT_TOPIC,
        Subject: '🚨 Maysar Auth Security Alert',
        Message: `High number of authentication failures detected: ${failureCount} failures in ${process.env.TIME_WINDOW} seconds

Recent failures:
${authFailures.slice(0, 5).join('\n')}

This may indicate a brute force attack or system compromise.`
      }).promise();
    }

    // Check for geographic anomalies
    const ipAddresses = authFailures.map(log => extractIPAddress(log)).filter(ip => ip);
    const uniqueIPs = [...new Set(ipAddresses)];

    if (uniqueIPs.length > 20) { // Many different IPs
      await sns.publish({
        TopicArn: process.env.ALERT_TOPIC,
        Subject: '🚨 Maysar Auth Geographic Anomaly',
        Message: `Authentication attempts from ${uniqueIPs.length} different IP addresses in ${process.env.TIME_WINDOW} seconds.

This may indicate a distributed attack.`
      }).promise();
    }

    return { statusCode: 200, monitoredFailures: failureCount };

  } catch (error) {
    console.error('Auth failure monitoring failed:', error);
    throw error;
  }
};

async function queryCloudWatchLogs(logGroupName, startTime, endTime, patterns) {
  const cloudwatch = new AWS.CloudWatchLogs();
  const logStreams = await cloudwatch.describeLogStreams({
    logGroupName,
    orderBy: 'LastEventTime',
    descending: true,
    limit: 10
  }).promise();

  const failures = [];

  for (const stream of logStreams.logStreams) {
    const events = await cloudwatch.getLogEvents({
      logGroupName,
      logStreamName: stream.logStreamName,
      startTime: Math.floor(startTime.getTime() / 1000),
      endTime: Math.floor(endTime.getTime() / 1000)
    }).promise();

    for (const event of events.events) {
      const message = event.message;
      if (patterns.some(pattern => message.includes(pattern))) {
        failures.push(message);
      }
    }
  }

  return failures;
}

function extractIPAddress(logMessage) {
  const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  const match = logMessage.match(ipRegex);
  return match ? match[0] : null;
}
EOF
    filename = "index.js"
  }
}

# Payout Anomaly Detection Lambda
resource "aws_lambda_function" "payout_anomaly_detector" {
  filename         = data.archive_file.payout_anomaly_detector.output_path
  function_name    = "maysar-${var.environment}-payout-anomaly-detector"
  role            = aws_iam_role.monitoring_security.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 120

  environment {
    variables = {
      ALERT_TOPIC     = aws_sns_topic.monitoring_security_alerts.arn
      PAYMENT_DB_ARN  = var.payment_db_arn
      NORMAL_THRESHOLD = "10000" # $10,000 normal daily payout
      SPIKE_THRESHOLD  = "50000" # $50,000 spike alert
    }
  }
}

data "archive_file" "payout_anomaly_detector" {
  type        = "zip"
  output_path = "/tmp/payout-anomaly-detector.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const sns = new AWS.SNS();

  try {
    // Query payout data from payment database
    const payoutQuery = `
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        SUM(amount) as total_payout,
        COUNT(*) as payout_count
      FROM payouts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status = 'completed'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `;

    const payoutData = await executeQuery(payoutQuery);

    // Analyze for anomalies
    const anomalies = [];
    const normalThreshold = parseFloat(process.env.NORMAL_THRESHOLD);
    const spikeThreshold = parseFloat(process.env.SPIKE_THRESHOLD);

    for (const record of payoutData) {
      const payoutAmount = parseFloat(record.total_payout);
      const payoutCount = parseInt(record.payout_count);

      // Check for unusual payout amounts
      if (payoutAmount > spikeThreshold) {
        anomalies.push({
          type: 'SPIKE',
          hour: record.hour,
          amount: payoutAmount,
          count: payoutCount,
          message: `Unusual payout spike: $${payoutAmount} in one hour`
        });
      }

      // Check for high frequency payouts
      if (payoutCount > 50) { // More than 50 payouts per hour
        anomalies.push({
          type: 'FREQUENCY',
          hour: record.hour,
          amount: payoutAmount,
          count: payoutCount,
          message: `High frequency payouts: ${payoutCount} payouts in one hour`
        });
      }
    }

    // Check for geographic distribution anomalies
    const geoQuery = `
      SELECT
        country,
        COUNT(*) as payout_count,
        SUM(amount) as total_amount
      FROM payouts p
      JOIN users u ON p.user_id = u.id
      WHERE p.created_at >= NOW() - INTERVAL '1 hour'
        AND p.status = 'completed'
      GROUP BY country
      ORDER BY total_amount DESC
    `;

    const geoData = await executeQuery(geoQuery);
    const topCountry = geoData[0];

    if (topCountry && parseFloat(topCountry.total_amount) > normalThreshold * 2) {
      anomalies.push({
        type: 'GEOGRAPHIC',
        country: topCountry.country,
        amount: topCountry.total_amount,
        count: topCountry.payout_count,
        message: `Unusual geographic concentration: $${topCountry.total_amount} from ${topCountry.country}`
      });
    }

    // Alert on anomalies
    if (anomalies.length > 0) {
      const alertMessage = anomalies.map(a => `• ${a.message}`).join('\n');

      await sns.publish({
        TopicArn: process.env.ALERT_TOPIC,
        Subject: '🚨 Maysar Payout Anomaly Alert',
        Message: `Potential payout anomalies detected:

${alertMessage}

Please review payout activity immediately for potential fraud or system issues.`
      }).promise();
    }

    return {
      statusCode: 200,
      anomaliesDetected: anomalies.length,
      monitoredHours: payoutData.length
    };

  } catch (error) {
    console.error('Payout anomaly detection failed:', error);
    throw error;
  }
};

async function executeQuery(sql) {
  const params = {
    resourceArn: process.env.PAYMENT_DB_ARN,
    secretArn: process.env.PAYMENT_DB_SECRET_ARN,
    sql,
    database: 'payment_db'
  };

  const result = await rds.executeStatement(params).promise();
  return result.records || [];
}
EOF
    filename = "index.js"
  }
}

# Order Backlog Monitor Lambda
resource "aws_lambda_function" "order_backlog_monitor" {
  filename         = data.archive_file.order_backlog_monitor.output_path
  function_name    = "maysar-${var.environment}-order-backlog-monitor"
  role            = aws_iam_role.monitoring_security.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60

  environment {
    variables = {
      ALERT_TOPIC      = aws_sns_topic.monitoring_security_alerts.arn
      ORDER_DB_ARN     = var.order_db_arn
      BACKLOG_THRESHOLD = "100" # Orders in backlog
      AGE_THRESHOLD    = "3600" # 1 hour old
    }
  }
}

data "archive_file" "order_backlog_monitor" {
  type        = "zip"
  output_path = "/tmp/order-backlog-monitor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const rds = new AWS.RDSDataService();
  const sns = new AWS.SNS();

  try {
    // Query for orders stuck in processing
    const backlogQuery = `
      SELECT
        status,
        COUNT(*) as order_count,
        MIN(created_at) as oldest_order,
        MAX(created_at) as newest_order,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
      FROM orders
      WHERE status IN ('pending', 'processing', 'payment_pending')
        AND created_at < NOW() - INTERVAL '${process.env.AGE_THRESHOLD} seconds'
      GROUP BY status
    `;

    const backlogData = await executeQuery(backlogQuery);

    let totalBacklog = 0;
    const alerts = [];

    for (const record of backlogData) {
      const count = parseInt(record.order_count);
      totalBacklog += count;

      if (count > parseInt(process.env.BACKLOG_THRESHOLD)) {
        alerts.push(`${count} orders stuck in ${record.status} status (oldest: ${record.oldest_order})`);
      }
    }

    // Check order processing rate
    const rateQuery = `
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as orders_created,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as orders_completed
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
      LIMIT 6
    `;

    const rateData = await executeQuery(rateQuery);
    const recentHour = rateData[0];

    if (recentHour) {
      const completionRate = (parseInt(recentHour.orders_completed) / parseInt(recentHour.orders_created)) * 100;

      if (completionRate < 80) { // Less than 80% completion rate
        alerts.push(`Low order completion rate: ${completionRate.toFixed(1)}% in the last hour`);
      }
    }

    // Alert if there are issues
    if (alerts.length > 0 || totalBacklog > parseInt(process.env.BACKLOG_THRESHOLD)) {
      await sns.publish({
        TopicArn: process.env.ALERT_TOPIC,
        Subject: '🚨 Maysar Order Backlog Alert',
        Message: `Order processing backlog detected:

Total backlog: ${totalBacklog} orders

Issues:
${alerts.join('\n')}

Please check order processing pipeline and resolve any blockages.`
      }).promise();
    }

    return {
      statusCode: 200,
      totalBacklog,
      alertsGenerated: alerts.length
    };

  } catch (error) {
    console.error('Order backlog monitoring failed:', error);
    throw error;
  }
};

async function executeQuery(sql) {
  const params = {
    resourceArn: process.env.ORDER_DB_ARN,
    secretArn: process.env.ORDER_DB_SECRET_ARN,
    sql,
    database: 'order_db'
  };

  const result = await rds.executeStatement(params).promise();
  return result.records || [];
}
EOF
    filename = "index.js"
  }
}

# DLQ Growth Monitor Lambda
resource "aws_lambda_function" "dlq_growth_monitor" {
  filename         = data.archive_file.dlq_growth_monitor.output_path
  function_name    = "maysar-${var.environment}-dlq-growth-monitor"
  role            = aws_iam_role.monitoring_security.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 90

  environment {
    variables = {
      ALERT_TOPIC    = aws_sns_topic.monitoring_security_alerts.arn
      DLQ_BUCKET     = var.dlq_bucket_name
      GROWTH_THRESHOLD = "50" # 50% growth in DLQ size
      ABSOLUTE_THRESHOLD = "100" # 100 messages in DLQ
    }
  }
}

data "archive_file" "dlq_growth_monitor" {
  type        = "zip"
  output_path = "/tmp/dlq-growth-monitor.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const sns = new AWS.SNS();

  try {
    // Get current DLQ size
    const bucketName = process.env.DLQ_BUCKET;
    const currentObjects = await listAllObjects(bucketName);

    const currentCount = currentObjects.length;
    console.log(`Current DLQ size: ${currentCount} messages`);

    // Get previous count from DynamoDB (if available)
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const previousData = await dynamodb.get({
      TableName: 'maysar-${process.env.ENVIRONMENT}-dlq-metrics',
      Key: { metric: 'dlq_size' }
    }).promise();

    const previousCount = previousData.Item ? previousData.Item.count : 0;

    // Calculate growth
    const growthRate = previousCount > 0 ?
      ((currentCount - previousCount) / previousCount) * 100 : 0;

    const alerts = [];

    // Check absolute threshold
    if (currentCount > parseInt(process.env.ABSOLUTE_THRESHOLD)) {
      alerts.push(`DLQ size exceeded threshold: ${currentCount} messages (threshold: ${process.env.ABSOLUTE_THRESHOLD})`);
    }

    // Check growth rate
    if (growthRate > parseInt(process.env.GROWTH_THRESHOLD)) {
      alerts.push(`DLQ growth rate exceeded threshold: ${growthRate.toFixed(1)}% increase (threshold: ${process.env.GROWTH_THRESHOLD}%)`);
    }

    // Check for error patterns
    const errorPatterns = analyzeErrorPatterns(currentObjects);

    if (errorPatterns.length > 0) {
      alerts.push(`Recurring errors detected: ${errorPatterns.join(', ')}`);
    }

    // Alert if there are issues
    if (alerts.length > 0) {
      await sns.publish({
        TopicArn: process.env.ALERT_TOPIC,
        Subject: '🚨 Maysar DLQ Growth Alert',
        Message: `Dead Letter Queue growth detected:

${alerts.join('\n')}

Previous count: ${previousCount}
Current count: ${currentCount}
Growth rate: ${growthRate.toFixed(1)}%

Please investigate message processing failures and resolve underlying issues.`
      }).promise();
    }

    // Update metrics in DynamoDB
    await dynamodb.put({
      TableName: 'maysar-${process.env.ENVIRONMENT}-dlq-metrics',
      Item: {
        metric: 'dlq_size',
        count: currentCount,
        timestamp: new Date().toISOString(),
        growth_rate: growthRate
      }
    }).promise();

    return {
      statusCode: 200,
      currentCount,
      previousCount,
      growthRate,
      alertsGenerated: alerts.length
    };

  } catch (error) {
    console.error('DLQ growth monitoring failed:', error);
    throw error;
  }
};

async function listAllObjects(bucketName) {
  const s3 = new AWS.S3();
  const objects = [];
  let continuationToken;

  do {
    const params = {
      Bucket: bucketName,
      ContinuationToken: continuationToken
    };

    const response = await s3.listObjectsV2(params).promise();
    objects.push(...(response.Contents || []));
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

function analyzeErrorPatterns(objects) {
  const errorCounts = {};
  const patterns = [];

  for (const obj of objects.slice(-100)) { // Analyze last 100 messages
    // Extract error type from object key or content
    const errorType = extractErrorType(obj.Key);
    errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
  }

  // Find patterns with more than 10 occurrences
  for (const [errorType, count] of Object.entries(errorCounts)) {
    if (count > 10) {
      patterns.push(`${errorType} (${count} times)`);
    }
  }

  return patterns;
}

function extractErrorType(key) {
  // Extract error type from S3 key
  const parts = key.split('/');
  return parts[parts.length - 1].split('-')[0] || 'unknown';
}
EOF
    filename = "index.js"
  }
}

# IAM Role for Monitoring Security Functions
resource "aws_iam_role" "monitoring_security" {
  name = "maysar-${var.environment}-monitoring-security-role"

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

resource "aws_iam_role_policy" "monitoring_security" {
  name = "maysar-${var.environment}-monitoring-security-policy"
  role = aws_iam_role.monitoring_security.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement"
        ]
        Resource = [
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
          var.payment_db_secret_arn,
          var.order_db_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.dlq_bucket_name}",
          "arn:aws:s3:::${var.dlq_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.monitoring_security_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ]
        Resource = aws_dynamodb_table.dlq_metrics.arn
      }
    ]
  })
}

# DynamoDB Table for DLQ Metrics
resource "aws_dynamodb_table" "dlq_metrics" {
  name         = "maysar-${var.environment}-dlq-metrics"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "metric"

  attribute {
    name = "metric"
    type = "S"
  }

  tags = {
    Name = "maysar-${var.environment}-dlq-metrics"
  }
}

# SNS Topic for Monitoring Security Alerts
resource "aws_sns_topic" "monitoring_security_alerts" {
  name = "maysar-${var.environment}-monitoring-security-alerts"

  tags = {
    Name = "maysar-${var.environment}-monitoring-security-alerts"
  }
}

# CloudWatch Events for Scheduled Monitoring
resource "aws_cloudwatch_event_rule" "auth_monitoring" {
  name                = "maysar-${var.environment}-auth-monitoring"
  description         = "Monitor authentication failures every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "auth_monitoring" {
  rule      = aws_cloudwatch_event_rule.auth_monitoring.name
  arn       = aws_lambda_function.auth_failure_monitor.arn
}

resource "aws_lambda_permission" "auth_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_failure_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.auth_monitoring.arn
}

resource "aws_cloudwatch_event_rule" "payout_monitoring" {
  name                = "maysar-${var.environment}-payout-monitoring"
  description         = "Monitor payout anomalies hourly"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "payout_monitoring" {
  rule      = aws_cloudwatch_event_rule.payout_monitoring.name
  arn       = aws_lambda_function.payout_anomaly_detector.arn
}

resource "aws_lambda_permission" "payout_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.payout_anomaly_detector.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.payout_monitoring.arn
}

resource "aws_cloudwatch_event_rule" "order_backlog_monitoring" {
  name                = "maysar-${var.environment}-order-backlog-monitoring"
  description         = "Monitor order backlog every 15 minutes"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "order_backlog_monitoring" {
  rule      = aws_cloudwatch_event_rule.order_backlog_monitoring.name
  arn       = aws_lambda_function.order_backlog_monitor.arn
}

resource "aws_lambda_permission" "order_backlog_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.order_backlog_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.order_backlog_monitoring.arn
}

resource "aws_cloudwatch_event_rule" "dlq_monitoring" {
  name                = "maysar-${var.environment}-dlq-monitoring"
  description         = "Monitor DLQ growth every 10 minutes"
  schedule_expression = "rate(10 minutes)"
}

resource "aws_cloudwatch_event_target" "dlq_monitoring" {
  rule      = aws_cloudwatch_event_rule.dlq_monitoring.name
  arn       = aws_lambda_function.dlq_growth_monitor.arn
}

resource "aws_lambda_permission" "dlq_monitoring" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dlq_growth_monitor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.dlq_monitoring.arn
}
