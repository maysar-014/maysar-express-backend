variable "compartment_id" {
  type = string
}

variable "availability_domain" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "nsg_ids" {
  type = list(string)
}

variable "instance_shape" {
  type    = string
  default = "VM.Standard.E2.1.Micro"
}

variable "ssh_public_key" {
  type = string
}

variable "docker_image" {
  type = string
}

variable "app_port" {
  type = number
}

variable "environment" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "redis_password" {
  type      = string
  sensitive = true
}

variable "env_vars" {
  type        = map(string)
  description = "Environment variables for the application"
}

variable "source_image_id" {
  type        = string
  description = "OCID of the image to use. If empty, uses latest Oracle Linux 8"
  default     = ""
}
