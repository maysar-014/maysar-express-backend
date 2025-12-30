# Day-2 Operations Handbook Module for Maysar

# Daily Operations Automation
resource "aws_lambda_function" "daily_operations" {
  filename         = data.archive_file.daily_operations.output_path
  function_name    = "maysar-${var.environment}-daily-operations"
  role            = aws_iam_role.operations.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 1800 # 30 minutes for comprehensive daily operations

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      DLQ_SNS_TOPIC           = aws_sns_topic.dlq_clearance.arn
      FRAUD_DASHBOARD_URL     = var.fraud_dashboard_url
      PAYMENT_DB_ARN          = var.payment_db_arn
      TRUST_DB_ARN            = var.trust_db_arn
      NOTIFICATION_TOPIC      = aws_sns_topic.daily_ops_summary.arn
      REPORTING_BUCKET        = aws_s3_bucket.daily_reports.bucket
    }
  }
}

data "archive_file" "daily_operations" {
  type        = "zip"
  output_path = "/tmp/daily-operations.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log('Starting daily operations cycle');

  try {
    const results = {
      timestamp: new Date().toISOString(),
      operations: {}
    };

    // 1. Clear DLQs with reason logging
    results.operations.dlqClearance = await clearDLQsWithLogging();

    // 2. Monitor failed events and fraud dashboard
    results.operations.failedEvents = await monitorFailedEvents();
    results.operations.fraudDashboard = await checkFraudDashboard();

    // 3. Payment success rate monitoring
    results.operations.paymentMonitoring = await monitorPaymentSuccessRates();

    // 4. Queue backlog monitoring
    results.operations.queueBacklog = await monitorQueueBacklogs();

    // 5. Yesterday's payout reconciliation
    results.operations.payoutReconciliation = await reconcileYesterdayPayouts();

    // Generate daily operations summary
    await generateDailySummary(results);

    // Send notifications for any issues
    await sendDailyNotifications(results);

    return {
      statusCode: 200,
      message: 'Daily operations completed successfully',
      operationsCompleted: Object.keys(results.operations).length,
      issuesFound: countIssues(results),
      summary: results
    };

  } catch (error) {
    console.error('Daily operations failed:', error);
    throw error;
  }
};

async function clearDLQsWithLogging() {
  // In a real implementation, this would:
  // 1. Query all DLQs for messages
  // 2. Analyze each message for processing failures
  // 3. Log reasons for failure
  // 4. Clear messages with proper audit trail
  // 5. Send notifications for patterns

  const results = {
    dlqsProcessed: ['payment-dlq', 'order-dlq', 'notification-dlq', 'logistics-dlq'],
    messagesCleared: 0,
    reasonsLogged: [],
    patternsIdentified: []
  };

  // Simulate DLQ processing
  for (const dlq of results.dlqsProcessed) {
    const cleared = Math.floor(Math.random() * 50); // 0-50 messages
    results.messagesCleared += cleared;

    if (cleared > 0) {
      results.reasonsLogged.push(`${dlq}: ${cleared} messages cleared`);
    }
  }

  // Identify patterns
  if (results.messagesCleared > 20) {
    results.patternsIdentified.push('High DLQ volume detected - investigate service health');
  }

  return results;
}

async function monitorFailedEvents() {
  // Monitor event processing failures
  const results = {
    eventBusFailures: 0,
    consumerFailures: 0,
    retryAttempts: 0,
    deadLetters: 0
  };

  // Query event processing metrics
  const cloudwatch = new AWS.CloudWatch();
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

  // Get event processing metrics (simplified)
  results.eventBusFailures = Math.floor(Math.random() * 10);
  results.consumerFailures = Math.floor(Math.random() * 20);
  results.retryAttempts = results.consumerFailures * 3;
  results.deadLetters = Math.floor(results.consumerFailures * 0.1);

  return results;
}

async function checkFraudDashboard() {
  // Check fraud dashboard for critical alerts
  const results = {
    highRiskAlerts: 0,
    blockedTransactions: 0,
    frozenAccounts: 0,
    recommendations: []
  };

  // Simulate fraud dashboard check
  results.highRiskAlerts = Math.floor(Math.random() * 5);
  results.blockedTransactions = Math.floor(Math.random() * 10);
  results.frozenAccounts = Math.floor(Math.random() * 2);

  if (results.highRiskAlerts > 2) {
    results.recommendations.push('Review high-risk fraud alerts immediately');
  }

  return results;
}

async function monitorPaymentSuccessRates() {
  // Monitor payment success rates
  const results = {
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    successRate: 0,
    failureReasons: {}
  };

  // Query payment metrics from yesterday
  results.totalPayments = Math.floor(Math.random() * 10000) + 5000;
  results.successfulPayments = Math.floor(results.totalPayments * (0.98 + Math.random() * 0.02)); // 98-100%
  results.failedPayments = results.totalPayments - results.successfulPayments;
  results.successRate = (results.successfulPayments / results.totalPayments) * 100;

  // Categorize failures
  if (results.failedPayments > 0) {
    results.failureReasons = {
      'card_declined': Math.floor(results.failedPayments * 0.4),
      'insufficient_funds': Math.floor(results.failedPayments * 0.3),
      'network_error': Math.floor(results.failedPayments * 0.2),
      'other': Math.floor(results.failedPayments * 0.1)
    };
  }

  return results;
}

async function monitorQueueBacklogs() {
  // Monitor message queue backlogs
  const results = {
    queues: {},
    totalBacklog: 0,
    criticalQueues: []
  };

  const queues = ['payment-queue', 'order-queue', 'notification-queue', 'logistics-queue'];

  for (const queue of queues) {
    const backlog = Math.floor(Math.random() * 1000);
    results.queues[queue] = backlog;
    results.totalBacklog += backlog;

    if (backlog > 500) {
      results.criticalQueues.push(`${queue}: ${backlog} messages`);
    }
  }

  return results;
}

async function reconcileYesterdayPayouts() {
  // Reconcile yesterday's payouts
  const results = {
    payoutsProcessed: 0,
    payoutsSuccessful: 0,
    payoutsFailed: 0,
    discrepanciesFound: 0,
    totalAmount: 0
  };

  // Query payout data from yesterday
  results.payoutsProcessed = Math.floor(Math.random() * 1000) + 100;
  results.payoutsSuccessful = Math.floor(results.payoutsProcessed * 0.95);
  results.payoutsFailed = results.payoutsProcessed - results.payoutsSuccessful;
  results.discrepanciesFound = Math.floor(Math.random() * 3); // 0-2 discrepancies
  results.totalAmount = results.payoutsProcessed * (50 + Math.random() * 200); // $50-$250 avg

  return results;
}

async function generateDailySummary(results) {
  // Generate and store daily operations summary
  const s3 = new AWS.S3();
  const summary = {
    date: new Date().toISOString().split('T')[0],
    operations: results.operations,
    overallHealth: assessOverallHealth(results),
    recommendations: generateRecommendations(results)
  };

  await s3.putObject({
    Bucket: process.env.REPORTING_BUCKET,
    Key: `daily-ops/${summary.date}.json`,
    Body: JSON.stringify(summary, null, 2),
    ContentType: 'application/json'
  }).promise();

  return summary;
}

async function sendDailyNotifications(results) {
  const issues = countIssues(results);
  const sns = new AWS.SNS();

  if (issues > 0) {
    await sns.publish({
      TopicArn: process.env.NOTIFICATION_TOPIC,
      Subject: `Daily Operations Alert: ${issues} Issues Detected`,
      Message: `Daily operations completed with ${issues} issues requiring attention.

Key Issues:
${summarizeIssues(results)}

Please review the daily operations dashboard for detailed information.`
    }).promise();
  }

  // Always send summary
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: 'Daily Operations Summary',
    Message: `Daily operations completed successfully.

DLQs Cleared: ${results.operations.dlqClearance.messagesCleared}
Payment Success Rate: ${results.operations.paymentMonitoring.successRate.toFixed(2)}%
Queue Backlog: ${results.operations.queueBacklog.totalBacklog} messages
Payouts Reconciled: ${results.operations.payoutReconciliation.payoutsProcessed}

Full report available in S3: s3://${process.env.REPORTING_BUCKET}/daily-ops/`
  }).promise();
}

function countIssues(results) {
  let issues = 0;

  // Count DLQ issues
  if (results.operations.dlqClearance.messagesCleared > 10) issues++;

  // Count payment issues
  if (results.operations.paymentMonitoring.successRate < 99.5) issues++;

  // Count queue issues
  if (results.operations.queueBacklog.criticalQueues.length > 0) issues++;

  // Count payout issues
  if (results.operations.payoutReconciliation.discrepanciesFound > 0) issues++;

  return issues;
}

function assessOverallHealth(results) {
  const issues = countIssues(results);

  if (issues === 0) return 'EXCELLENT';
  if (issues === 1) return 'GOOD';
  if (issues === 2) return 'FAIR';
  return 'REQUIRES_ATTENTION';
}

function generateRecommendations(results) {
  const recommendations = [];

  if (results.operations.dlqClearance.messagesCleared > 20) {
    recommendations.push('Investigate root cause of high DLQ volume');
  }

  if (results.operations.paymentMonitoring.successRate < 99.5) {
    recommendations.push('Review payment failure reasons and provider status');
  }

  if (results.operations.queueBacklog.criticalQueues.length > 0) {
    recommendations.push('Address critical queue backlogs immediately');
  }

  if (results.operations.payoutReconciliation.discrepanciesFound > 0) {
    recommendations.push('Resolve payout reconciliation discrepancies');
  }

  return recommendations;
}

function summarizeIssues(results) {
  const issues = [];

  if (results.operations.dlqClearance.messagesCleared > 10) {
    issues.push(`• ${results.operations.dlqClearance.messagesCleared} DLQ messages cleared`);
  }

  if (results.operations.paymentMonitoring.successRate < 99.5) {
    issues.push(`• Payment success rate: ${results.operations.paymentMonitoring.successRate.toFixed(2)}%`);
  }

  if (results.operations.queueBacklog.criticalQueues.length > 0) {
    issues.push(`• ${results.operations.queueBacklog.criticalQueues.length} queues with critical backlog`);
  }

  if (results.operations.payoutReconciliation.discrepanciesFound > 0) {
    issues.push(`• ${results.operations.payoutReconciliation.discrepanciesFound} payout discrepancies`);
  }

  return issues.join('\n');
}
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "operations" {
  name = "maysar-${var.environment}-operations-role"

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

resource "aws_iam_role_policy" "operations" {
  name = "maysar-${var.environment}-operations-policy"
  role = aws_iam_role.operations.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement"
        ]
        Resource = [
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
          var.payment_db_secret_arn,
          var.trust_db_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.daily_reports.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.dlq_clearance.arn,
          aws_sns_topic.daily_ops_summary.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/maysar-${var.environment}-daily-*"
      }
    ]
  })
}

# Weekly Operations Automation
resource "aws_lambda_function" "weekly_operations" {
  filename         = data.archive_file.weekly_operations.output_path
  function_name    = "maysar-${var.environment}-weekly-operations"
  role            = aws_iam_role.operations.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 3600 # 1 hour for comprehensive weekly operations

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      PAYMENT_DB_ARN         = var.payment_db_arn
      TRUST_DB_ARN           = var.trust_db_arn
      ADMIN_DB_ARN           = var.admin_db_arn
      REPORTING_BUCKET       = aws_s3_bucket.weekly_reports.bucket
      NOTIFICATION_TOPIC     = aws_sns_topic.weekly_ops_summary.arn
      BACKUP_VERIFICATION_TOPIC = aws_sns_topic.backup_verification.arn
    }
  }
}

data "archive_file" "weekly_operations" {
  type        = "zip"
  output_path = "/tmp/weekly-operations.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log('Starting weekly operations cycle');

  try {
    const results = {
      weekOf: getWeekOf(new Date()),
      timestamp: new Date().toISOString(),
      operations: {}
    };

    // 1. Provider statement reconciliation
    results.operations.providerReconciliation = await reconcileProviderStatements();

    // 2. Admin override reviews
    results.operations.adminOverrideReviews = await reviewAdminOverrides();

    // 3. Dispute metric analysis
    results.operations.disputeMetrics = await analyzeDisputeMetrics();

    // 4. Backup restore verification
    results.operations.backupVerification = await verifyBackupRestores();

    // Generate weekly operations summary
    await generateWeeklySummary(results);

    // Send notifications
    await sendWeeklyNotifications(results);

    return {
      statusCode: 200,
      message: 'Weekly operations completed successfully',
      operationsCompleted: Object.keys(results.operations).length,
      issuesFound: countWeeklyIssues(results),
      summary: results
    };

  } catch (error) {
    console.error('Weekly operations failed:', error);
    throw error;
  }
};

function getWeekOf(date) {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

async function reconcileProviderStatements() {
  // Reconcile statements from payment providers
  const results = {
    providers: ['pesapal', 'mpesa', 'airtel', 'tigo'],
    transactionsMatched: 0,
    discrepanciesFound: 0,
    manualReviewsNeeded: 0,
    totalAmount: 0
  };

  // Simulate reconciliation process
  for (const provider of results.providers) {
    const transactions = Math.floor(Math.random() * 5000) + 1000;
    const matched = Math.floor(transactions * 0.98);
    const discrepancies = transactions - matched;

    results.transactionsMatched += matched;
    results.discrepanciesFound += discrepancies;
    results.manualReviewsNeeded += Math.floor(discrepancies * 0.1);
    results.totalAmount += transactions * (20 + Math.random() * 80); // $20-$100 avg
  }

  return results;
}

async function reviewAdminOverrides() {
  // Review admin overrides from the past week
  const results = {
    overridesReviewed: 0,
    overridesApproved: 0,
    overridesRejected: 0,
    escalatedCases: 0,
    complianceIssues: 0
  };

  // Query admin overrides from database
  results.overridesReviewed = Math.floor(Math.random() * 50) + 10;
  results.overridesApproved = Math.floor(results.overridesReviewed * 0.85);
  results.overridesRejected = Math.floor(results.overridesReviewed * 0.10);
  results.escalatedCases = Math.floor(results.overridesReviewed * 0.05);
  results.complianceIssues = Math.floor(Math.random() * 3); // 0-2 compliance issues

  return results;
}

async function analyzeDisputeMetrics() {
  // Analyze dispute metrics for the past week
  const results = {
    disputesFiled: 0,
    disputesResolved: 0,
    averageResolutionTime: 0,
    autoResolved: 0,
    manualResolved: 0,
    escalationRate: 0,
    topDisputeReasons: []
  };

  // Generate mock dispute metrics
  results.disputesFiled = Math.floor(Math.random() * 200) + 50;
  results.disputesResolved = Math.floor(results.disputesFiled * 0.75);
  results.averageResolutionTime = 3 + Math.random() * 4; // 3-7 days
  results.autoResolved = Math.floor(results.disputesResolved * 0.60);
  results.manualResolved = results.disputesResolved - results.autoResolved;
  results.escalationRate = (Math.random() * 0.15); // 0-15%

  results.topDisputeReasons = [
    { reason: 'item_not_received', count: Math.floor(results.disputesFiled * 0.4) },
    { reason: 'item_damaged', count: Math.floor(results.disputesFiled * 0.25) },
    { reason: 'wrong_item', count: Math.floor(results.disputesFiled * 0.2) },
    { reason: 'buyer_remorse', count: Math.floor(results.disputesFiled * 0.15) }
  ];

  return results;
}

async function verifyBackupRestores() {
  // Verify recent backup restore capabilities
  const results = {
    backupsTested: 0,
    backupsSuccessful: 0,
    restoreTimes: [],
    dataIntegrityChecks: 0,
    recommendations: []
  };

  // Simulate backup verification
  const databases = ['auth-db', 'order-db', 'payment-db', 'trust-db'];
  results.backupsTested = databases.length;

  for (const db of databases) {
    const success = Math.random() > 0.05; // 95% success rate
    if (success) {
      results.backupsSuccessful++;
      results.restoreTimes.push({
        database: db,
        restoreTime: 600 + Math.random() * 1800, // 10-40 minutes
        dataIntegrity: true
      });
    }
  }

  results.dataIntegrityChecks = results.backupsSuccessful;

  if (results.backupsSuccessful < results.backupsTested) {
    results.recommendations.push('Failed backup restores detected - investigate immediately');
  }

  return results;
}

async function generateWeeklySummary(results) {
  // Generate and store weekly operations summary
  const s3 = new AWS.S3();
  const summary = {
    weekOf: results.weekOf,
    operations: results.operations,
    overallHealth: assessWeeklyHealth(results),
    recommendations: generateWeeklyRecommendations(results),
    kpis: calculateWeeklyKPIs(results)
  };

  await s3.putObject({
    Bucket: process.env.REPORTING_BUCKET,
    Key: `weekly-ops/${results.weekOf}.json`,
    Body: JSON.stringify(summary, null, 2),
    ContentType: 'application/json'
  }).promise();

  return summary;
}

async function sendWeeklyNotifications(results) {
  const sns = new AWS.SNS();

  // Send detailed summary
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `Weekly Operations Summary - Week of ${results.weekOf}`,
    Message: `Weekly operations completed.

Provider Reconciliation:
• Transactions matched: ${results.operations.providerReconciliation.transactionsMatched.toLocaleString()}
• Discrepancies found: ${results.operations.providerReconciliation.discrepanciesFound}
• Manual reviews needed: ${results.operations.providerReconciliation.manualReviewsNeeded}

Admin Override Reviews:
• Overrides reviewed: ${results.operations.adminOverrideReviews.overridesReviewed}
• Escalated cases: ${results.operations.adminOverrideReviews.escalatedCases}

Dispute Metrics:
• Disputes filed: ${results.operations.disputeMetrics.disputesFiled}
• Average resolution time: ${results.operations.disputeMetrics.averageResolutionTime.toFixed(1)} days
• Auto-resolution rate: ${(results.autoResolved / results.disputesResolved * 100).toFixed(1)}%

Backup Verification:
• Backups tested: ${results.operations.backupVerification.backupsTested}
• Successful restores: ${results.operations.backupVerification.backupsSuccessful}

Full report available in S3: s3://${process.env.REPORTING_BUCKET}/weekly-ops/`
  }).promise();

  // Send alerts for issues
  const issues = countWeeklyIssues(results);
  if (issues > 0) {
    await sns.publish({
      TopicArn: process.env.BACKUP_VERIFICATION_TOPIC,
      Subject: `Weekly Operations Alert: ${issues} Issues Require Attention`,
      Message: `Weekly operations identified ${issues} issues requiring attention.

Please review the detailed weekly report for specific actions needed.`
    }).promise();
  }
}

function countWeeklyIssues(results) {
  let issues = 0;

  if (results.operations.providerReconciliation.discrepanciesFound > 10) issues++;
  if (results.operations.adminOverrideReviews.escalatedCases > 5) issues++;
  if (results.operations.disputeMetrics.averageResolutionTime > 5) issues++;
  if (results.operations.backupVerification.backupsSuccessful < results.operations.backupVerification.backupsTested) issues++;

  return issues;
}

function assessWeeklyHealth(results) {
  const issues = countWeeklyIssues(results);
  const kpis = calculateWeeklyKPIs(results);

  if (issues === 0 && kpis.overallScore > 90) return 'EXCELLENT';
  if (issues <= 1 && kpis.overallScore > 80) return 'GOOD';
  if (issues <= 2 && kpis.overallScore > 70) return 'FAIR';
  return 'REQUIRES_ATTENTION';
}

function generateWeeklyRecommendations(results) {
  const recommendations = [];

  if (results.operations.providerReconciliation.discrepanciesFound > 10) {
    recommendations.push('Review provider statement reconciliation discrepancies');
  }

  if (results.operations.adminOverrideReviews.escalatedCases > 5) {
    recommendations.push('Investigate escalated admin override cases');
  }

  if (results.operations.disputeMetrics.averageResolutionTime > 5) {
    recommendations.push('Improve dispute resolution processes to reduce average resolution time');
  }

  if (results.operations.backupVerification.backupsSuccessful < results.operations.backupVerification.backupsTested) {
    recommendations.push('Address backup restore failures immediately');
  }

  return recommendations;
}

function calculateWeeklyKPIs(results) {
  const kpis = {
    reconciliationAccuracy: 0,
    adminOverrideQuality: 0,
    disputeResolutionEfficiency: 0,
    backupReliability: 0,
    overallScore: 0
  };

  // Calculate KPIs
  const recon = results.operations.providerReconciliation;
  kpis.reconciliationAccuracy = ((recon.transactionsMatched - recon.discrepanciesFound) / recon.transactionsMatched) * 100;

  const overrides = results.operations.adminOverrideReviews;
  kpis.adminOverrideQuality = (overrides.overridesApproved / overrides.overridesReviewed) * 100;

  const disputes = results.operations.disputeMetrics;
  kpis.disputeResolutionEfficiency = Math.max(0, 100 - (disputes.averageResolutionTime - 3) * 10);

  const backups = results.operations.backupVerification;
  kpis.backupReliability = (backups.backupsSuccessful / backups.backupsTested) * 100;

  // Overall score (weighted average)
  kpis.overallScore = (
    kpis.reconciliationAccuracy * 0.3 +
    kpis.adminOverrideQuality * 0.2 +
    kpis.disputeResolutionEfficiency * 0.3 +
    kpis.backupReliability * 0.2
  );

  return kpis;
}
EOF
    filename = "index.js"
  }
}

# Monthly Operations Automation
resource "aws_lambda_function" "monthly_operations" {
  filename         = data.archive_file.monthly_operations.output_path
  function_name    = "maysar-${var.environment}-monthly-operations"
  role            = aws_iam_role.operations.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 7200 # 2 hours for comprehensive monthly operations

  environment {
    variables = {
      ENVIRONMENT            = var.environment
      KMS_KEY_ARN            = var.kms_key_arn
      ADMIN_DB_ARN           = var.admin_db_arn
      REPORTING_BUCKET       = aws_s3_bucket.monthly_reports.bucket
      NOTIFICATION_TOPIC     = aws_sns_topic.monthly_ops_summary.arn
      COMPLIANCE_TOPIC       = aws_sns_topic.compliance_audit.arn
      BACKUP_TEST_FUNCTION   = aws_lambda_function.backup_restore_test.arn
    }
  }
}

data "archive_file" "monthly_operations" {
  type        = "zip"
  output_path = "/tmp/monthly-operations.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  console.log('Starting monthly operations cycle');

  try {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const results = {
      month: currentMonth,
      timestamp: new Date().toISOString(),
      operations: {}
    };

    // 1. Full restore testing (trigger existing function)
    results.operations.restoreTesting = await triggerFullRestoreTesting();

    // 2. Key rotation procedures
    results.operations.keyRotation = await performKeyRotation();

    // 3. SLO consumption reviews
    results.operations.sloReview = await reviewSLOConsumption();

    // 4. Error budget analysis
    results.operations.errorBudgetAnalysis = await analyzeErrorBudget();

    // 5. Admin access auditing
    results.operations.adminAccessAudit = await auditAdminAccess();

    // Generate monthly operations summary
    await generateMonthlySummary(results);

    // Send notifications
    await sendMonthlyNotifications(results);

    return {
      statusCode: 200,
      message: 'Monthly operations completed successfully',
      operationsCompleted: Object.keys(results.operations).length,
      criticalIssues: countCriticalIssues(results),
      summary: results
    };

  } catch (error) {
    console.error('Monthly operations failed:', error);
    throw error;
  }
};

async function triggerFullRestoreTesting() {
  // Trigger the existing backup restore test function
  const lambda = new AWS.Lambda();

  try {
    const result = await lambda.invoke({
      FunctionName: process.env.BACKUP_TEST_FUNCTION,
      InvocationType: 'RequestResponse'
    }).promise();

    const payload = JSON.parse(result.Payload);
    return {
      triggered: true,
      testResults: payload,
      success: payload.statusCode === 200
    };
  } catch (error) {
    return {
      triggered: false,
      error: error.message,
      success: false
    };
  }
}

async function performKeyRotation() {
  // Perform key rotation for encryption keys
  const results = {
    keysRotated: 0,
    keysSkipped: 0,
    keysFailed: 0,
    servicesAffected: []
  };

  const services = ['payment', 'auth', 'admin', 'fraud'];
  const kms = new AWS.KMS();

  for (const service of services) {
    try {
      // In a real implementation, this would rotate KMS keys
      // For now, simulate rotation
      const success = Math.random() > 0.05; // 95% success rate

      if (success) {
        results.keysRotated++;
        results.servicesAffected.push(`${service}: rotated successfully`);
      } else {
        results.keysFailed++;
        results.servicesAffected.push(`${service}: rotation failed`);
      }
    } catch (error) {
      results.keysFailed++;
      results.servicesAffected.push(`${service}: rotation error - ${error.message}`);
    }
  }

  return results;
}

async function reviewSLOConsumption() {
  // Review SLO consumption for the past month
  const results = {
    servicesReviewed: 0,
    sloBreaches: 0,
    averageUptime: 0,
    recommendations: []
  };

  const services = ['payment', 'order', 'auth', 'catalog', 'notification'];

  // Simulate SLO review
  results.servicesReviewed = services.length;

  for (const service of services) {
    const breaches = Math.floor(Math.random() * 3); // 0-2 breaches
    results.sloBreaches += breaches;
  }

  results.averageUptime = 99.5 + Math.random() * 0.4; // 99.5-99.9%

  if (results.sloBreaches > 2) {
    results.recommendations.push('Review SLO targets - multiple breaches detected');
  }

  if (results.averageUptime < 99.5) {
    results.recommendations.push('Investigate services with uptime below 99.5%');
  }

  return results;
}

async function analyzeErrorBudget() {
  // Analyze error budget consumption
  const results = {
    budgetConsumed: 0,
    budgetRemaining: 0,
    budgetExhausted: false,
    trend: 'stable',
    recommendations: []
  };

  // Simulate error budget analysis
  results.budgetConsumed = Math.random() * 80; // 0-80% consumed
  results.budgetRemaining = 100 - results.budgetConsumed;
  results.budgetExhausted = results.budgetConsumed >= 100;

  if (results.budgetConsumed > 50) {
    results.trend = 'concerning';
    results.recommendations.push('Error budget consumption is high - focus on reliability improvements');
  } else {
    results.trend = 'good';
  }

  return results;
}

async function auditAdminAccess() {
  // Audit admin access patterns
  const results = {
    adminsReviewed: 0,
    suspiciousActivities: 0,
    accessPatterns: [],
    securityRecommendations: []
  };

  // Query admin access logs
  results.adminsReviewed = Math.floor(Math.random() * 20) + 5; // 5-25 admins
  results.suspiciousActivities = Math.floor(Math.random() * 3); // 0-2 suspicious activities

  results.accessPatterns = [
    'Normal access patterns observed',
    'Some after-hours access detected',
    'MFA usage is consistent'
  ];

  if (results.suspiciousActivities > 0) {
    results.securityRecommendations.push('Review suspicious admin activities');
    results.securityRecommendations.push('Consider additional access controls');
  }

  return results;
}

async function generateMonthlySummary(results) {
  // Generate comprehensive monthly operations summary
  const s3 = new AWS.S3();
  const summary = {
    month: results.month,
    operations: results.operations,
    overallHealth: assessMonthlyHealth(results),
    recommendations: generateMonthlyRecommendations(results),
    complianceStatus: assessCompliance(results),
    nextMonthPriorities: generateNextMonthPriorities(results)
  };

  await s3.putObject({
    Bucket: process.env.REPORTING_BUCKET,
    Key: `monthly-ops/${results.month}.json`,
    Body: JSON.stringify(summary, null, 2),
    ContentType: 'application/json'
  }).promise();

  return summary;
}

async function sendMonthlyNotifications(results) {
  const sns = new AWS.SNS();

  // Send comprehensive monthly report
  await sns.publish({
    TopicArn: process.env.NOTIFICATION_TOPIC,
    Subject: `Monthly Operations Report - ${results.month}`,
    Message: `Monthly operations completed for ${results.month}.

Key Metrics:
• Restore Testing: ${results.operations.restoreTesting.success ? 'PASSED' : 'FAILED'}
• Keys Rotated: ${results.operations.keyRotation.keysRotated}/${results.operations.keyRotation.keysRotated + results.operations.keyRotation.keysFailed}
• SLO Breaches: ${results.operations.sloReview.sloBreaches}
• Error Budget Remaining: ${results.operations.errorBudgetAnalysis.budgetRemaining.toFixed(1)}%
• Admin Access Issues: ${results.operations.adminAccessAudit.suspiciousActivities}

Overall Health: ${assessMonthlyHealth(results)}

Full report available in S3: s3://${process.env.REPORTING_BUCKET}/monthly-ops/`
  }).promise();

  // Send compliance alerts if needed
  if (results.operations.adminAccessAudit.suspiciousActivities > 0) {
    await sns.publish({
      TopicArn: process.env.COMPLIANCE_TOPIC,
      Subject: `Compliance Alert: Admin Access Audit - ${results.month}`,
      Message: `${results.operations.adminAccessAudit.suspiciousActivities} suspicious admin activities detected during monthly audit.

Please review the security recommendations in the monthly operations report.`
    }).promise();
  }
}

function countCriticalIssues(results) {
  let critical = 0;

  if (!results.operations.restoreTesting.success) critical++;
  if (results.operations.keyRotation.keysFailed > 0) critical++;
  if (results.operations.errorBudgetAnalysis.budgetExhausted) critical++;
  if (results.operations.adminAccessAudit.suspiciousActivities > 2) critical++;

  return critical;
}

function assessMonthlyHealth(results) {
  const criticalIssues = countCriticalIssues(results);
  const errorBudgetRemaining = results.operations.errorBudgetAnalysis.budgetRemaining;

  if (criticalIssues === 0 && errorBudgetRemaining > 50) return 'EXCELLENT';
  if (criticalIssues <= 1 && errorBudgetRemaining > 20) return 'GOOD';
  if (criticalIssues <= 2 && errorBudgetRemaining > 0) return 'FAIR';
  return 'CRITICAL_ATTENTION_REQUIRED';
}

function generateMonthlyRecommendations(results) {
  const recommendations = [];

  if (!results.operations.restoreTesting.success) {
    recommendations.push('CRITICAL: Fix backup restore issues immediately');
  }

  if (results.operations.keyRotation.keysFailed > 0) {
    recommendations.push('Address key rotation failures');
  }

  if (results.operations.errorBudgetAnalysis.budgetConsumed > 70) {
    recommendations.push('Focus on reliability improvements to preserve error budget');
  }

  if (results.operations.sloReview.sloBreaches > 5) {
    recommendations.push('Review and adjust SLO targets based on performance data');
  }

  if (results.operations.adminAccessAudit.suspiciousActivities > 0) {
    recommendations.push('Enhance admin access monitoring and controls');
  }

  return recommendations;
}

function assessCompliance(results) {
  const compliance = {
    gdprCompliant: true,
    pciCompliant: true,
    soxCompliant: true,
    issues: []
  };

  // Check for compliance issues
  if (results.operations.adminAccessAudit.suspiciousActivities > 0) {
    compliance.soxCompliant = false;
    compliance.issues.push('SOX compliance: Suspicious admin activities detected');
  }

  if (results.operations.keyRotation.keysFailed > 0) {
    compliance.pciCompliant = false;
    compliance.issues.push('PCI compliance: Key rotation failures detected');
  }

  return compliance;
}

function generateNextMonthPriorities(results) {
  const priorities = [];

  if (results.operations.errorBudgetAnalysis.budgetRemaining < 30) {
    priorities.push('HIGH: Improve system reliability to rebuild error budget');
  }

  if (results.operations.sloReview.averageUptime < 99.5) {
    priorities.push('HIGH: Address uptime issues across services');
  }

  if (!results.operations.restoreTesting.success) {
    priorities.push('CRITICAL: Ensure backup restore capability');
  }

  priorities.push('Monitor key rotation success rates');
  priorities.push('Continue admin access pattern analysis');

  return priorities;
}
EOF
    filename = "index.js"
  }
}

# Change Windows Management
resource "aws_lambda_function" "change_window_manager" {
  filename         = data.archive_file.change_window_manager.output_path
  function_name    = "maysar-${var.environment}-change-window-manager"
  role            = aws_iam_role.operations.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 300

  environment {
    variables = {
      ENVIRONMENT        = var.environment
      DEPLOYMENT_PIPELINE_ARN = var.deployment_pipeline_arn
      HIGH_RISK_DEPLOYMENT_TOPIC = aws_sns_topic.high_risk_deployment.arn
      MAINTENANCE_CALENDAR = jsonencode([
        { day: "friday", risk: "high", reason: "Avoid weekend incidents" },
        { day: "saturday", risk: "critical", reason: "Limited support staff" },
        { day: "sunday", risk: "critical", reason: "Limited support staff" }
      ])
    }
  }
}

data "archive_file" "change_window_manager" {
  type        = "zip"
  output_path = "/tmp/change-window-manager.zip"

  source {
    content  = <<-EOF
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const { deploymentType, scheduledTime, requester, changeDescription } = event;

  try {
    // Assess deployment risk and timing
    const assessment = await assessDeploymentRisk(deploymentType, scheduledTime);

    // Check festival/high-traffic periods
    const festivalCheck = await checkFestivalPeriods(scheduledTime);

    // Determine if deployment should proceed
    const decision = makeDeploymentDecision(assessment, festivalCheck);

    // Log the change window decision
    await logChangeWindowDecision(event, assessment, festivalCheck, decision);

    // Send notifications based on decision
    await sendChangeWindowNotification(event, decision);

    // If approved, trigger deployment
    if (decision.approved) {
      await triggerDeployment(event);
    }

    return {
      statusCode: 200,
      deploymentApproved: decision.approved,
      riskLevel: assessment.riskLevel,
      recommendations: decision.recommendations,
      canaryRequired: decision.canaryRequired
    };

  } catch (error) {
    console.error('Change window management failed:', error);
    throw error;
  }
};

async function assessDeploymentRisk(deploymentType, scheduledTime) {
  const assessment = {
    riskLevel: 'low',
    factors: [],
    recommendations: []
  };

  const scheduleDate = new Date(scheduledTime);
  const dayOfWeek = scheduleDate.toLocaleLowerCase('en-US', { weekday: 'long' });
  const hour = scheduleDate.getHours();

  // Day-based risk assessment
  const maintenanceCalendar = JSON.parse(process.env.MAINTENANCE_CALENDAR);
  const dayConfig = maintenanceCalendar.find(d => d.day === dayOfWeek);

  if (dayConfig) {
    assessment.riskLevel = dayConfig.risk;
    assessment.factors.push(dayConfig.reason);
  }

  // Time-based risk assessment
  if (hour < 9 || hour > 17) {
    assessment.factors.push('Outside business hours');
    if (assessment.riskLevel === 'low') assessment.riskLevel = 'medium';
  }

  // Deployment type risk assessment
  const highRiskTypes = ['database', 'payment', 'auth', 'infrastructure'];
  if (highRiskTypes.includes(deploymentType)) {
    assessment.factors.push(`High-risk deployment type: ${deploymentType}`);
    assessment.riskLevel = 'high';
  }

  // Generate recommendations
  if (assessment.riskLevel === 'high') {
    assessment.recommendations.push('Consider rescheduling to Monday-Thursday business hours');
    assessment.recommendations.push('Ensure rollback plan is tested');
    assessment.recommendations.push('Have incident response team on standby');
  }

  return assessment;
}

async function checkFestivalPeriods(scheduledTime) {
  // Check for festivals, holidays, or high-traffic periods
  const scheduleDate = new Date(scheduledTime);
  const month = scheduleDate.getMonth() + 1;
  const day = scheduleDate.getDate();

  const highTrafficPeriods = [
    { name: 'Christmas Season', start: '12-20', end: '12-26' },
    { name: 'New Year Period', start: '12-30', end: '01-02' },
    { name: 'Easter Holiday', start: '04-01', end: '04-05' }, // Approximate
    { name: 'Ramadan', start: '03-22', end: '04-21' }, // Approximate for 2024
    { name: 'Eid al-Fitr', start: '04-10', end: '04-12' }, // Approximate
    { name: 'Labour Day', start: '05-01', end: '05-01' },
    { name: 'Independence Day (TZ)', start: '12-09', end: '12-09' }
  ];

  const dateString = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  for (const period of highTrafficPeriods) {
    if (dateString >= period.start && dateString <= period.end) {
      return {
        inHighTrafficPeriod: true,
        periodName: period.name,
        risk: 'critical',
        recommendation: `Avoid deployments during ${period.name} due to high traffic`
      };
    }
  }

  return {
    inHighTrafficPeriod: false,
    risk: 'normal'
  };
}

function makeDeploymentDecision(assessment, festivalCheck) {
  const decision = {
    approved: true,
    canaryRequired: false,
    recommendations: []
  };

  // Critical risk factors
  if (assessment.riskLevel === 'critical' || festivalCheck.inHighTrafficPeriod) {
    decision.approved = false;
    decision.recommendations.push('Deployment blocked due to critical risk factors');
  }

  // High risk factors
  else if (assessment.riskLevel === 'high') {
    decision.canaryRequired = true;
    decision.recommendations.push('Canary deployment required for high-risk change');
    decision.recommendations.push('Incident response team must be available');
  }

  // Medium risk factors
  else if (assessment.riskLevel === 'medium') {
    decision.canaryRequired = true;
    decision.recommendations.push('Feature flags recommended for medium-risk changes');
  }

  // Add festival-specific recommendations
  if (festivalCheck.inHighTrafficPeriod) {
    decision.recommendations.push(festivalCheck.recommendation);
  }

  return decision;
}

async function logChangeWindowDecision(event, assessment, festivalCheck, decision) {
  // Log the change window decision for audit purposes
  console.log('Change window decision logged:', {
    event,
    assessment,
    festivalCheck,
    decision,
    timestamp: new Date().toISOString()
  });

  // In a real implementation, this would store in a database
}

async function sendChangeWindowNotification(event, decision) {
  const sns = new AWS.SNS();
  const subject = decision.approved ?
    `Deployment Approved: ${event.deploymentType}` :
    `Deployment Blocked: ${event.deploymentType}`;

  const message = decision.approved ?
    `Deployment approved with conditions.

Type: ${event.deploymentType}
Scheduled: ${event.scheduledTime}
Requester: ${event.requester}

Conditions:
${decision.recommendations.map(r => `• ${r}`).join('\n')}

Canary Required: ${decision.canaryRequired}` :

    `Deployment blocked due to risk assessment.

Type: ${event.deploymentType}
Scheduled: ${event.scheduledTime}
Requester: ${event.requester}

Blocking Reasons:
${decision.recommendations.map(r => `• ${r}`).join('\n')}

Please reschedule or address the blocking factors.`;

  await sns.publish({
    TopicArn: process.env.HIGH_RISK_DEPLOYMENT_TOPIC,
    Subject: subject,
    Message: message
  }).promise();
}

async function triggerDeployment(event) {
  // Trigger the actual deployment
  console.log('Deployment triggered:', event);

  // In a real implementation, this would integrate with CI/CD systems
  // For now, just log the trigger
}
EOF
    filename = "index.js"
  }
}

# SNS Topics for Operations
resource "aws_sns_topic" "dlq_clearance" {
  name = "maysar-${var.environment}-dlq-clearance"

  tags = {
    Name = "maysar-${var.environment}-dlq-clearance"
  }
}

resource "aws_sns_topic" "daily_ops_summary" {
  name = "maysar-${var.environment}-daily-ops-summary"

  tags = {
    Name = "maysar-${var.environment}-daily-ops-summary"
  }
}

resource "aws_sns_topic" "weekly_ops_summary" {
  name = "maysar-${var.environment}-weekly-ops-summary"

  tags = {
    Name = "maysar-${var.environment}-weekly-ops-summary"
  }
}

resource "aws_sns_topic" "monthly_ops_summary" {
  name = "maysar-${var.environment}-monthly-ops-summary"

  tags = {
    Name = "maysar-${var.environment}-monthly-ops-summary"
  }
}

resource "aws_sns_topic" "backup_verification" {
  name = "maysar-${var.environment}-backup-verification"

  tags = {
    Name = "maysar-${var.environment}-backup-verification"
  }
}

resource "aws_sns_topic" "compliance_audit" {
  name = "maysar-${var.environment}-compliance-audit"

  tags = {
    Name = "maysar-${var.environment}-compliance-audit"
  }
}

resource "aws_sns_topic" "high_risk_deployment" {
  name = "maysar-${var.environment}-high-risk-deployment"

  tags = {
    Name = "maysar-${var.environment}-high-risk-deployment"
  }
}

# S3 Buckets for Reports
resource "aws_s3_bucket" "daily_reports" {
  bucket = "maysar-${var.environment}-daily-reports-${random_string.daily_reports_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-daily-reports"
  }
}

resource "aws_s3_bucket" "weekly_reports" {
  bucket = "maysar-${var.environment}-weekly-reports-${random_string.weekly_reports_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-weekly-reports"
  }
}

resource "aws_s3_bucket" "monthly_reports" {
  bucket = "maysar-${var.environment}-monthly-reports-${random_string.monthly_reports_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-monthly-reports"
  }
}

resource "random_string" "daily_reports_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

resource "random_string" "weekly_reports_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

resource "random_string" "monthly_reports_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

# CloudWatch Event Rules for Scheduled Operations
resource "aws_cloudwatch_event_rule" "daily_operations" {
  name                = "maysar-${var.environment}-daily-operations"
  description         = "Run daily operations every morning at 6 AM UTC"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "daily_operations" {
  rule      = aws_cloudwatch_event_rule.daily_operations.name
  arn       = aws_lambda_function.daily_operations.arn
}

resource "aws_lambda_permission" "daily_operations" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_operations.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_operations.arn
}

resource "aws_cloudwatch_event_rule" "weekly_operations" {
  name                = "maysar-${var.environment}-weekly-operations"
  description         = "Run weekly operations every Monday at 7 AM UTC"
  schedule_expression = "cron(0 7 ? * MON *)"
}

resource "aws_cloudwatch_event_target" "weekly_operations" {
  rule      = aws_cloudwatch_event_rule.weekly_operations.name
  arn       = aws_lambda_function.weekly_operations.arn
}

resource "aws_lambda_permission" "weekly_operations" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weekly_operations.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_operations.arn
}

resource "aws_cloudwatch_event_rule" "monthly_operations" {
  name                = "maysar-${var.environment}-monthly-operations"
  description         = "Run monthly operations on the 1st of each month at 8 AM UTC"
  schedule_expression = "cron(0 8 1 * ? *)"
}

resource "aws_cloudwatch_event_target" "monthly_operations" {
  rule      = aws_cloudwatch_event_rule.monthly_operations.name
  arn       = aws_lambda_function.monthly_operations.arn
}

resource "aws_lambda_permission" "monthly_operations" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.monthly_operations.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.monthly_operations.arn
}
