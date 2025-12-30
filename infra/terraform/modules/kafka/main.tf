# Kafka (Amazon MSK) Module for Maysar Event Bus

resource "aws_msk_cluster" "main" {
  cluster_name           = "maysar-${var.environment}"
  kafka_version         = var.kafka_version
  number_of_broker_nodes = var.number_of_broker_nodes

  broker_node_group_info {
    instance_type   = var.broker_instance_type
    ebs_volume_size = var.ebs_volume_size
    client_subnets  = var.private_subnets
    security_groups = [aws_security_group.kafka.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = aws_kms_key.kafka.arn
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka.arn
    revision = aws_msk_configuration.kafka.latest_revision
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
      firehose {
        enabled = false
      }
      s3 {
        enabled = false
      }
    }
  }

  tags = {
    Name = "maysar-${var.environment}-msk"
  }
}

# MSK Configuration
resource "aws_msk_configuration" "kafka" {
  kafka_versions = [var.kafka_version]
  name           = "maysar-${var.environment}-config"

  server_properties = <<PROPERTIES
auto.create.topics.enable=true
default.replication.factor=3
min.insync.replicas=2
num.partitions=12
log.retention.hours=168
log.segment.bytes=536870912
message.max.bytes=10485760
compression.type=snappy
PROPERTIES
}

# KMS Key for MSK encryption
resource "aws_kms_key" "kafka" {
  description             = "KMS key for MSK cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "maysar-${var.environment}-msk-kms"
  }
}

# CloudWatch Log Group for MSK
resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/aws/msk/maysar-${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "maysar-${var.environment}-msk-logs"
  }
}

# Security Group for MSK
resource "aws_security_group" "kafka" {
  name_prefix = "maysar-${var.environment}-msk-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Plaintext access from VPC"
  }

  ingress {
    from_port   = 9094
    to_port     = 9094
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "TLS access from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "maysar-${var.environment}-msk-sg"
  }
}

# IAM Policy for MSK access
resource "aws_iam_policy" "msk_access" {
  name        = "maysar-${var.environment}-msk-access"
  description = "IAM policy for accessing MSK cluster"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kafka:*",
          "kafka-cluster:*"
        ]
        Resource = [
          aws_msk_cluster.main.arn,
          "${aws_msk_cluster.main.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.kafka.arn
      }
    ]
  })
}

# Create topics for core events
resource "null_resource" "create_topics" {
  depends_on = [aws_msk_cluster.main]

  provisioner "local-exec" {
    command = <<-EOT
      # Wait for MSK cluster to be ready
      aws kafka wait cluster-operational --cluster-arn ${aws_msk_cluster.main.arn}

      # Get bootstrap brokers
      BOOTSTRAP_BROKERS=$(aws kafka get-bootstrap-brokers --cluster-arn ${aws_msk_cluster.main.arn} --query 'BootstrapBrokerStringTls' --output text)

      # Create core event topics
      kafka-topics.sh --create --topic user-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 6 --replication-factor 3 --config retention.ms=604800000
      kafka-topics.sh --create --topic order-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 12 --replication-factor 3 --config retention.ms=2592000000
      kafka-topics.sh --create --topic payment-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 12 --replication-factor 3 --config retention.ms=2592000000
      kafka-topics.sh --create --topic logistics-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 8 --replication-factor 3 --config retention.ms=604800000
      kafka-topics.sh --create --topic notification-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 6 --replication-factor 3 --config retention.ms=604800000
      kafka-topics.sh --create --topic admin-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 3 --replication-factor 3 --config retention.ms=2592000000
      kafka-topics.sh --create --topic analytics-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 6 --replication-factor 3 --config retention.ms=2592000000
      kafka-topics.sh --create --topic dlq-events --bootstrap-server $BOOTSTRAP_BROKERS --partitions 3 --replication-factor 3 --config retention.ms=2592000000
    EOT
  }

  triggers = {
    cluster_arn = aws_msk_cluster.main.arn
  }
}
