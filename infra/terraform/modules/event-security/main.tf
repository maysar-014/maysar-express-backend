# Event Security Module for Maysar

# Event Schema Validation
resource "aws_glue_registry" "maysar_events" {
  registry_name = "maysar-event-schemas-${var.environment}"
  description  = "Schema registry for Maysar event contracts"

  tags = {
    Name = "maysar-event-schemas-${var.environment}"
  }
}

# Event Schema Definitions
resource "aws_glue_schema" "user_registered" {
  schema_name       = "UserRegistered.v1"
  registry_arn      = aws_glue_registry.maysar_events.arn
  data_format       = "AVRO"
  compatibility     = "BACKWARD"
  schema_definition = jsonencode({
    type = "record"
    name = "UserRegistered"
    fields = [
      { name = "eventId", type = "string" },
      { name = "userId", type = "string" },
      { name = "email", type = "string" },
      { name = "timestamp", type = "string" },
      { name = "metadata", type = {
        type = "record"
        fields = [
          { name = "source", type = "string" },
          { name = "version", type = "string" }
        ]
      }}
    ]
  })

  tags = {
    Name = "user-registered-schema"
  }
}

resource "aws_glue_schema" "order_created" {
  schema_name       = "OrderCreated.v1"
  registry_arn      = aws_glue_registry.maysar_events.arn
  data_format       = "AVRO"
  compatibility     = "BACKWARD"
  schema_definition = jsonencode({
    type = "record"
    name = "OrderCreated"
    fields = [
      { name = "eventId", type = "string" },
      { name = "orderId", type = "string" },
      { name = "userId", type = "string" },
      { name = "amount", type = "double" },
      { name = "currency", type = "string" },
      { name = "timestamp", type = "string" }
    ]
  })

  tags = {
    Name = "order-created-schema"
  }
}

resource "aws_glue_schema" "payment_succeeded" {
  schema_name       = "PaymentSucceeded.v1"
  registry_arn      = aws_glue_registry.maysar_events.arn
  data_format       = "AVRO"
  compatibility     = "BACKWARD"
  schema_definition = jsonencode({
    type = "record"
    name = "PaymentSucceeded"
    fields = [
      { name = "eventId", type = "string" },
      { name = "paymentId", type = "string" },
      { name = "orderId", type = "string" },
      { name = "amount", type = "double" },
      { name = "currency", type = "string" },
      { name = "timestamp", type = "string" },
      { name = "sensitiveData", type = {
        type = "record"
        fields = [
          { name = "cardLastFour", type = ["string", "null"] },
          { name = "paymentMethod", type = "string" }
        ]
      }}
    ]
  })

  tags = {
    Name = "payment-succeeded-schema"
  }
}

# HMAC Secret for Event Signing
resource "aws_secretsmanager_secret" "event_hmac_key" {
  name                    = "maysar/${var.environment}/events/hmac-key"
  description             = "HMAC key for event signing and verification"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = 30
  }

  tags = {
    Name = "maysar-${var.environment}-event-hmac-key"
  }
}

resource "aws_secretsmanager_secret_version" "event_hmac_key" {
  secret_id = aws_secretsmanager_secret.event_hmac_key.id
  secret_string = jsonencode({
    key = base64encode(random_password.event_hmac_key.result)
    algorithm = "sha256"
    created_at = timestamp()
  })
}

resource "random_password" "event_hmac_key" {
  length  = 64
  special = true
  upper   = true
  lower   = true
  numeric = true

  lifecycle {
    ignore_changes = [length, special, upper, lower, numeric]
  }
}

# Event Encryption Key
resource "aws_secretsmanager_secret" "event_encryption_key" {
  name                    = "maysar/${var.environment}/events/encryption-key"
  description             = "AES key for sensitive event data encryption"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 30

  rotation_rules {
    automatically_after_days = 90
  }

  tags = {
    Name = "maysar-${var.environment}-event-encryption-key"
  }
}

resource "random_password" "event_encryption_key" {
  length  = 32
  special = true
  upper   = true
  lower   = true
  numeric = true

  lifecycle {
    ignore_changes = [length, special, upper, lower, numeric]
  }
}

resource "aws_secretsmanager_secret_version" "event_encryption_key" {
  secret_id = aws_secretsmanager_secret.event_encryption_key.id
  secret_string = jsonencode({
    key = base64encode(random_password.event_encryption_key.result)
    algorithm = "aes256"
    created_at = timestamp()
  })
}

# Event Validation Lambda
resource "aws_lambda_function" "event_validator" {
  filename         = data.archive_file.event_validator.output_path
  function_name    = "maysar-${var.environment}-event-validator"
  role            = aws_iam_role.event_validator.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      SCHEMA_REGISTRY_NAME = aws_glue_registry.maysar_events.registry_name
      HMAC_SECRET_ARN      = aws_secretsmanager_secret.event_hmac_key.arn
      ENCRYPTION_KEY_ARN   = aws_secretsmanager_secret.event_encryption_key.arn
      EVENT_TOPIC_ARN      = var.kafka_cluster_arn
    }
  }
}

data "archive_file" "event_validator" {
  type        = "zip"
  output_path = "/tmp/event-validator.zip"

  source {
    content  = <<-EOF
const crypto = require('crypto');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const secretsManager = new AWS.SecretsManager();
  const glue = new AWS.Glue();

  try {
    // Get HMAC key for signature verification
    const hmacSecret = await secretsManager.getSecretValue({
      SecretId: process.env.HMAC_SECRET_ARN
    }).promise();

    const hmacData = JSON.parse(hmacSecret.SecretString);

    // Validate event signature
    for (const record of event.records) {
      const eventData = JSON.parse(record.value);

      // Verify HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', Buffer.from(hmacData.key, 'base64'))
        .update(JSON.stringify(eventData.payload))
        .digest('hex');

      if (eventData.signature !== expectedSignature) {
        console.error('Invalid event signature:', eventData.eventId);
        // Send to DLQ or alert
        continue;
      }

      // Validate schema
      const schemaName = `${eventData.eventType}.v${eventData.version}`;
      try {
        await glue.getSchema({
          RegistryId: { RegistryName: process.env.SCHEMA_REGISTRY_NAME },
          SchemaId: { SchemaName: schemaName }
        }).promise();
      } catch (error) {
        console.error('Invalid schema:', schemaName);
        // Send to DLQ
        continue;
      }

      // Check for replay attacks
      const eventId = eventData.eventId;
      // Implement idempotency check here

      console.log('Event validated successfully:', eventId);
    }

    return { statusCode: 200, message: 'Events validated' };

  } catch (error) {
    console.error('Event validation failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "event_validator" {
  name = "maysar-${var.environment}-event-validator-role"

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

resource "aws_iam_role_policy" "event_validator" {
  name = "maysar-${var.environment}-event-validator-policy"
  role = aws_iam_role.event_validator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.event_hmac_key.arn,
          aws_secretsmanager_secret.event_encryption_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetSchema"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# Event Encryption Lambda
resource "aws_lambda_function" "event_encryptor" {
  filename         = data.archive_file.event_encryptor.output_path
  function_name    = "maysar-${var.environment}-event-encryptor"
  role            = aws_iam_role.event_encryptor.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      ENCRYPTION_KEY_ARN = aws_secretsmanager_secret.event_encryption_key.arn
    }
  }
}

data "archive_file" "event_encryptor" {
  type        = "zip"
  output_path = "/tmp/event-encryptor.zip"

  source {
    content  = <<-EOF
const crypto = require('crypto');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const secretsManager = new AWS.SecretsManager();

  try {
    // Get encryption key
    const encryptionSecret = await secretsManager.getSecretValue({
      SecretId: process.env.ENCRYPTION_KEY_ARN
    }).promise();

    const encryptionData = JSON.parse(encryptionSecret.SecretString);
    const key = Buffer.from(encryptionData.key, 'base64');

    const processedEvents = event.events.map(eventData => {
      // Encrypt sensitive fields
      if (eventData.sensitiveData) {
        const sensitiveJson = JSON.stringify(eventData.sensitiveData);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(sensitiveJson, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        eventData.sensitiveData = {
          encrypted: encrypted,
          iv: iv.toString('hex'),
          algorithm: 'aes256'
        };
      }

      return eventData;
    });

    return { events: processedEvents };

  } catch (error) {
    console.error('Event encryption failed:', error);
    throw error;
  }
};
EOF
    filename = "index.js"
  }
}

resource "aws_iam_role" "event_encryptor" {
  name = "maysar-${var.environment}-event-encryptor-role"

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

resource "aws_iam_role_policy" "event_encryptor" {
  name = "maysar-${var.environment}-event-encryptor-policy"
  role = aws_iam_role.event_encryptor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.event_encryption_key.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# MSK Serverless Configuration for Event Security
resource "aws_msk_serverless_cluster" "events" {
  count = var.enable_msk_serverless ? 1 : 0

  cluster_name = "maysar-${var.environment}-events"

  vpc_config {
    subnet_ids         = var.private_subnets
    security_group_ids = [var.msk_security_group_id]
  }

  client_authentication {
    sasl {
      iam = true
    }
  }

  tags = {
    Name = "maysar-${var.environment}-msk-serverless"
  }
}

# Event Topics with Security Configurations
resource "aws_msk_topic" "secure_topics" {
  for_each = toset([
    "user-events",
    "order-events",
    "payment-events",
    "inventory-events",
    "notification-events"
  ])

  cluster_arn            = var.kafka_cluster_arn
  topic_name             = "maysar.${var.environment}.${each.key}"
  number_of_partitions   = 6
  replication_factor     = 3

  config = {
    "cleanup.policy"         = "delete"
    "compression.type"       = "lz4"
    "delete.retention.ms"    = "86400000"  # 24 hours
    "file.delete.delay.ms"   = "60000"
    "flush.messages"         = "1"
    "flush.ms"               = "1000"
    "index.interval.bytes"   = "4096"
    "max.message.bytes"      = "1048576"   # 1MB
    "message.timestamp.type" = "CreateTime"
    "min.insync.replicas"    = "2"
    "retention.bytes"        = "-1"        # Unlimited
    "retention.ms"           = "604800000" # 7 days
    "segment.bytes"          = "1073741824" # 1GB
    "segment.ms"             = "604800000"  # 7 days
  }

  tags = {
    Name = "maysar-${var.environment}-${each.key}"
  }
}

# Event Dead Letter Queue with Encryption
resource "aws_s3_bucket" "event_dlq" {
  bucket = "maysar-${var.environment}-event-dlq-${random_string.event_dlq_suffix.result}"

  tags = {
    Name = "maysar-${var.environment}-event-dlq"
  }
}

resource "random_string" "event_dlq_suffix" {
  length  = 8
  lower   = true
  upper   = false
  numeric = true
  special = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "event_dlq" {
  bucket = aws_s3_bucket.event_dlq.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# CloudWatch Alarms for Event Security
resource "aws_cloudwatch_metric_alarm" "event_validation_failures" {
  alarm_name          = "maysar-${var.environment}-event-validation-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "EventValidationErrors"
  namespace           = "Maysar/Events"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "High number of event validation failures detected"
  alarm_actions       = [aws_sns_topic.event_security_alerts.arn]

  dimensions = {
    ServiceName = "event-validator"
  }
}

resource "aws_cloudwatch_metric_alarm" "event_replay_attempts" {
  alarm_name          = "maysar-${var.environment}-event-replay-attempts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EventReplayAttempts"
  namespace           = "Maysar/Events"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Event replay attack detected"
  alarm_actions       = [aws_sns_topic.event_security_alerts.arn]

  dimensions = {
    ServiceName = "event-validator"
  }
}

# SNS Topic for Event Security Alerts
resource "aws_sns_topic" "event_security_alerts" {
  name = "maysar-${var.environment}-event-security-alerts"

  tags = {
    Name = "maysar-${var.environment}-event-security-alerts"
  }
}

# Event Access Control - IAM Policies for Event Producers
resource "aws_iam_policy" "event_producer" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  name        = "maysar-${var.environment}-${each.key}-event-producer"
  description = "IAM policy for ${each.key} to produce events"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeCluster"
        ]
        Resource = var.kafka_cluster_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:WriteData"
        ]
        Resource = [
          for topic in aws_msk_topic.secure_topics :
          "${var.kafka_cluster_arn}/topic/${topic.topic_name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.event_hmac_key.arn,
          aws_secretsmanager_secret.event_encryption_key.arn
        ]
      }
    ]
  })
}

# Event Consumer IAM Policies
resource "aws_iam_policy" "event_consumer" {
  for_each = toset([
    "auth-service",
    "order-service",
    "payment-service",
    "seller-service",
    "catalog-service",
    "notification-service",
    "admin-service",
    "analytics-service"
  ])

  name        = "maysar-${var.environment}-${each.key}-event-consumer"
  description = "IAM policy for ${each.key} to consume events"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeCluster"
        ]
        Resource = var.kafka_cluster_arn
      },
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:ReadData"
        ]
        Resource = [
          for topic in aws_msk_topic.secure_topics :
          "${var.kafka_cluster_arn}/topic/${topic.topic_name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:ReadData"
        ]
        Resource = [
          for topic in aws_msk_topic.secure_topics :
          "${var.kafka_cluster_arn}/topic/${topic.topic_name}"
        ]
      }
    ]
  })
}
