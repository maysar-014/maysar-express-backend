resource "random_string" "bucket_suffix" {
  length  = 6
  upper   = false
  lower   = true
  numeric = true
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-db-subnets"
  })
}

resource "aws_db_instance" "this" {
  identifier                     = "${var.name_prefix}-postgres"
  engine                         = "postgres"
  engine_version                 = var.db_engine_version
  instance_class                 = var.db_instance_class
  allocated_storage              = var.db_allocated_storage
  max_allocated_storage          = var.db_max_allocated_storage
  storage_type                   = "gp3"
  storage_encrypted              = true
  db_name                        = var.db_name
  username                       = var.db_username
  password                       = var.db_password
  port                           = 5432
  multi_az                       = var.db_multi_az
  backup_retention_period        = var.db_backup_retention_days
  deletion_protection            = true
  skip_final_snapshot            = false
  final_snapshot_identifier      = "${var.name_prefix}-postgres-final-${random_string.bucket_suffix.result}"
  performance_insights_enabled   = true
  performance_insights_retention_period = 7
  publicly_accessible            = false
  db_subnet_group_name           = aws_db_subnet_group.this.name
  vpc_security_group_ids         = [var.db_security_group_id]
  auto_minor_version_upgrade     = true
  apply_immediately              = false
  copy_tags_to_snapshot          = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-postgres"
  })
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name_prefix}-redis-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${replace(var.name_prefix, "_", "-")}-redis"
  description                = "Redis replication group for ${var.name_prefix}"
  engine                     = "redis"
  engine_version             = var.redis_engine_version
  node_type                  = var.redis_node_type
  port                       = 6379
  automatic_failover_enabled = true
  multi_az_enabled           = true
  num_cache_clusters         = var.redis_num_cache_clusters
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [var.redis_security_group_id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  auto_minor_version_upgrade = true
  apply_immediately          = true
}

resource "aws_efs_file_system" "meilisearch" {
  creation_token   = "${var.name_prefix}-meili"
  encrypted        = true
  throughput_mode  = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-meili-efs"
  })
}

resource "aws_efs_mount_target" "meilisearch" {
  for_each = toset(var.private_subnet_ids)

  file_system_id  = aws_efs_file_system.meilisearch.id
  subnet_id       = each.value
  security_groups = [var.efs_security_group_id]
}

resource "aws_efs_backup_policy" "meilisearch" {
  file_system_id = aws_efs_file_system.meilisearch.id

  backup_policy {
    status = "ENABLED"
  }
}

resource "aws_efs_access_point" "meilisearch" {
  file_system_id = aws_efs_file_system.meilisearch.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/meili"

    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "0775"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-meili-ap"
  })
}

resource "aws_s3_bucket" "app" {
  bucket = "${replace(var.name_prefix, "_", "-")}-app-files-${random_string.bucket_suffix.result}"
}

resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app" {
  bucket                  = aws_s3_bucket.app.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "backup" {
  bucket = "${replace(var.name_prefix, "_", "-")}-backups-${random_string.bucket_suffix.result}"
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket                  = aws_s3_bucket.backup.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
