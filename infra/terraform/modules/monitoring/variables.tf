variable "compartment_id" {
  type = string
}

variable "instance_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "notification_topic_id" {
  type        = string
  description = "OCID of Notification Topic for Alarms"
  default     = "" 
}
