# Terraform variables for Maysar infrastructure on OCI

# OCI Provider Configuration
variable "oci_tenancy_ocid" {
  description = "OCI Tenancy OCID"
  type        = string
}

variable "oci_user_ocid" {
  description = "OCI User OCID"
  type        = string
}

variable "oci_fingerprint" {
  description = "OCI API Key Fingerprint"
  type        = string
}

variable "oci_private_key_path" {
  description = "Path to OCI API Private Key"
  type        = string
}

variable "oci_region" {
  description = "OCI Region"
  type        = string
  default     = "af-johannesburg-1"
}

variable "oci_compartment_id" {
  description = "OCI Compartment OCID"
  type        = string
}

# Environment
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# Network Configuration
variable "vcn_cidr" {
  description = "CIDR block for VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for Public Subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_domain" {
  description = "Availability Domain for Compute Instance (e.g., AD-1)"
  type        = string
}

# Compute Configuration
variable "instance_shape" {
  description = "OCI Instance Shape"
  type        = string
  default     = "VM.Standard.E2.1.Micro" # Always Free Tier
}

variable "ssh_public_key" {
  description = "SSH Public Key for instance access"
  type        = string
}

variable "docker_image" {
  description = "Docker image for the application"
  type        = string
  default     = "maysar-backend:latest"
}

variable "app_port" {
  description = "Application Port"
  type        = number
  default     = 3000
}

# Application Secrets
variable "db_password" {
  description = "PostgreSQL Password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis Password"
  type        = string
  sensitive   = true
}

variable "notification_topic_id" {
  description = "OCID of Notification Topic for Alarms"
  type        = string
  default     = ""
}

