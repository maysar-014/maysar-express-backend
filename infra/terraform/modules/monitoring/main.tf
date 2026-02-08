resource "oci_monitoring_alarm" "cpu" {
  # Comment 3: Make conditional on notification topic
  count = var.notification_topic_id != "" ? 1 : 0

  compartment_id        = var.compartment_id
  destinations          = [var.notification_topic_id]
  display_name          = "maysar-${var.environment}-cpu-alarm"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "oci_computeagent"
  query                 = "CpuUtilization[1m].mean() > 80"
  severity              = "CRITICAL"
  
  pending_duration = "PT5M"
  
  body             = "CPU Utilization > 80% for 5 mins"
}

resource "oci_monitoring_alarm" "memory" {
  count = var.notification_topic_id != "" ? 1 : 0

  compartment_id        = var.compartment_id
  destinations          = [var.notification_topic_id]
  display_name          = "maysar-${var.environment}-memory-alarm"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "oci_computeagent"
  query                 = "MemoryUtilization[1m].mean() > 80"
  severity              = "CRITICAL"
  
  pending_duration = "PT5M"
  
  body             = "Memory Utilization > 80% for 5 mins"
}

# Simplified Logging - Creating Log Group
resource "oci_logging_log_group" "main" {
  compartment_id = var.compartment_id
  display_name   = "maysar-${var.environment}-log-group"
}
