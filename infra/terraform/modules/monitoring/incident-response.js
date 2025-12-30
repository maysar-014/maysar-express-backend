// Incident Response Automation Lambda Function
// Handles automated incident response for SLO breaches and system alerts

const AWS = require('aws-sdk');
const https = require('https');

exports.handler = async (event) => {
  console.log('🚨 Incident Response Triggered:', JSON.stringify(event, null, 2));

  try {
    const incident = parseIncident(event);
    const severity = determineSeverity(incident);
    const responseActions = await determineResponseActions(incident, severity);

    // Execute response actions in parallel
    const results = await Promise.allSettled([
      escalateToPagerDuty(incident, severity),
      notifySlackChannels(incident, severity),
      triggerAutoRemediation(incident, responseActions),
      logIncidentDetails(incident, severity)
    ]);

    // Log results
    results.forEach((result, index) => {
      const action = ['PagerDuty', 'Slack', 'Auto-remediation', 'Logging'][index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${action} completed successfully`);
      } else {
        console.error(`❌ ${action} failed:`, result.reason);
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Incident response completed',
        incidentId: incident.id,
        severity,
        actionsTaken: results.filter(r => r.status === 'fulfilled').length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Incident response failed:', error);

    // Send failure alert
    await sendFailureAlert(error, event);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Incident response failed',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function parseIncident(event) {
  // Parse CloudWatch alarm or SNS message
  const message = JSON.parse(event.Records[0].Sns.Message);
  const alarm = JSON.parse(message);

  return {
    id: `incident-${Date.now()}`,
    source: 'cloudwatch',
    alarmName: alarm.AlarmName,
    description: alarm.AlarmDescription,
    state: alarm.NewStateValue,
    reason: alarm.NewStateReason,
    timestamp: alarm.StateChangeTime,
    metricName: alarm.Trigger?.MetricName,
    namespace: alarm.Trigger?.Namespace,
    dimensions: alarm.Trigger?.Dimensions || [],
    service: extractServiceFromAlarm(alarm.AlarmName),
    severity: determineAlarmSeverity(alarm)
  };
}

function extractServiceFromAlarm(alarmName) {
  // Extract service name from alarm name (e.g., "maysar-api-gateway-slo-availability-breach")
  const match = alarmName.match(/maysar-([a-z-]+)-slo/);
  return match ? match[1] : 'unknown';
}

function determineSeverity(incident) {
  // Determine incident severity based on alarm type and service
  const criticalPatterns = [
    /slo-availability-breach/,
    /error-budget-exhaustion/,
    /database.*down/,
    /payment.*failure/
  ];

  const warningPatterns = [
    /slo-latency-breach/,
    /high.*error.*rate/,
    /connection.*pool.*exhausted/
  ];

  const alarmName = incident.alarmName.toLowerCase();

  if (criticalPatterns.some(pattern => pattern.test(alarmName))) {
    return 'critical';
  } else if (warningPatterns.some(pattern => pattern.test(alarmName))) {
    return 'warning';
  }

  return 'info';
}

function determineAlarmSeverity(alarm) {
  // Map CloudWatch alarm state to severity
  if (alarm.NewStateValue === 'ALARM') {
    if (alarm.AlarmName.includes('slo-availability') || alarm.AlarmName.includes('error-budget')) {
      return 'critical';
    }
    return 'warning';
  }
  return 'info';
}

async function determineResponseActions(incident, severity) {
  const actions = [];

  // Critical incidents get immediate automated responses
  if (severity === 'critical') {
    switch (incident.service) {
      case 'payment-service':
        actions.push('scale_payment_service', 'enable_circuit_breaker');
        break;
      case 'database':
        actions.push('failover_to_read_replica', 'scale_connection_pool');
        break;
      case 'api-gateway':
        actions.push('enable_rate_limiting', 'scale_api_gateway');
        break;
      default:
        actions.push('restart_service', 'scale_up_instances');
    }
  }

  // Warning incidents get monitoring escalation
  if (severity === 'warning') {
    actions.push('increase_monitoring_frequency', 'notify_on_call');
  }

  return actions;
}

async function escalateToPagerDuty(incident, severity) {
  const pagerDutyEvent = {
    routing_key: process.env.PAGERDUTY_ROUTING_KEY,
    event_action: 'trigger',
    payload: {
      summary: `${severity.toUpperCase()}: ${incident.alarmName}`,
      source: 'cloudwatch',
      severity: severity,
      component: incident.service,
      group: 'maysar-platform',
      class: 'availability',
      custom_details: {
        alarmName: incident.alarmName,
        description: incident.description,
        metricName: incident.metricName,
        namespace: incident.namespace,
        dimensions: incident.dimensions
      },
      timestamp: incident.timestamp
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(pagerDutyEvent);

    const options = {
      hostname: 'events.pagerduty.com',
      port: 443,
      path: '/v2/enqueue',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 202) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`PagerDuty API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function notifySlackChannels(incident, severity) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) {
    console.log('⚠️  Slack webhook not configured, skipping Slack notification');
    return;
  }

  const color = severity === 'critical' ? '#FF0000' : severity === 'warning' ? '#FFA500' : '#808080';

  const slackMessage = {
    attachments: [{
      color,
      title: `🚨 ${severity.toUpperCase()}: ${incident.alarmName}`,
      text: incident.description,
      fields: [
        {
          title: 'Service',
          value: incident.service,
          short: true
        },
        {
          title: 'State',
          value: incident.state,
          short: true
        },
        {
          title: 'Time',
          value: new Date(incident.timestamp).toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' }),
          short: true
        },
        {
          title: 'Reason',
          value: incident.reason,
          short: false
        }
      ],
      footer: 'Maysar Incident Response System',
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(slackMessage);

    const url = new URL(slackWebhook);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Slack API returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function triggerAutoRemediation(incident, actions) {
  const remediationResults = [];

  for (const action of actions) {
    try {
      switch (action) {
        case 'scale_payment_service':
          await scaleService('payment-service', 2);
          remediationResults.push({ action, status: 'success' });
          break;

        case 'enable_circuit_breaker':
          await updateCircuitBreaker('payment-service', true);
          remediationResults.push({ action, status: 'success' });
          break;

        case 'scale_api_gateway':
          await scaleService('api-gateway', 1.5);
          remediationResults.push({ action, status: 'success' });
          break;

        case 'restart_service':
          await restartService(incident.service);
          remediationResults.push({ action, status: 'success' });
          break;

        default:
          console.log(`⚠️  Unknown remediation action: ${action}`);
          remediationResults.push({ action, status: 'unknown' });
      }
    } catch (error) {
      console.error(`❌ Remediation action ${action} failed:`, error);
      remediationResults.push({ action, status: 'failed', error: error.message });
    }
  }

  return remediationResults;
}

async function scaleService(serviceName, scaleFactor) {
  // Implement service scaling logic (e.g., via ECS, Kubernetes API)
  console.log(`🔄 Scaling ${serviceName} by factor ${scaleFactor}`);

  // This would integrate with your container orchestration platform
  // For now, just log the action
  return { service: serviceName, scaleFactor, timestamp: new Date().toISOString() };
}

async function updateCircuitBreaker(serviceName, enabled) {
  // Implement circuit breaker configuration
  console.log(`${enabled ? '🔌 Enabling' : '🔌 Disabling'} circuit breaker for ${serviceName}`);

  // This would update configuration in your service mesh or configuration service
  return { service: serviceName, circuitBreakerEnabled: enabled };
}

async function restartService(serviceName) {
  // Implement service restart logic
  console.log(`🔄 Restarting ${serviceName}`);

  // This would trigger a rolling restart of the service
  return { service: serviceName, action: 'restart', timestamp: new Date().toISOString() };
}

async function logIncidentDetails(incident, severity) {
  // Log incident details to CloudWatch or your logging system
  const cloudwatch = new AWS.CloudWatchLogs();

  const logMessage = {
    incidentId: incident.id,
    severity,
    service: incident.service,
    alarmName: incident.alarmName,
    description: incident.description,
    state: incident.state,
    reason: incident.reason,
    timestamp: incident.timestamp,
    metricName: incident.metricName,
    namespace: incident.namespace,
    dimensions: incident.dimensions,
    loggedAt: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'unknown'
  };

  const logGroupName = `/maysar/incidents/${process.env.ENVIRONMENT || 'dev'}`;
  const logStreamName = `incident-${incident.id}`;

  try {
    // Create log stream if it doesn't exist
    await cloudwatch.createLogStream({
      logGroupName,
      logStreamName
    }).promise().catch(() => {}); // Ignore if already exists

    // Log the incident
    await cloudwatch.putLogEvents({
      logGroupName,
      logStreamName,
      logEvents: [{
        message: JSON.stringify(logMessage),
        timestamp: Date.now()
      }]
    }).promise();

    console.log(`📝 Incident logged to CloudWatch: ${logGroupName}/${logStreamName}`);
  } catch (error) {
    console.error('❌ Failed to log incident to CloudWatch:', error);
  }

  return logMessage;
}

async function sendFailureAlert(error, originalEvent) {
  // Send alert when incident response itself fails
  const failureMessage = {
    text: `🚨 CRITICAL: Incident Response System Failure\n\nError: ${error.message}\n\nOriginal Event: ${JSON.stringify(originalEvent, null, 2)}`
  };

  // Send to critical failure channel
  // Implementation would go here...
  console.error('🚨 Incident Response System Failure:', error);
}
