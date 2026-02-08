output "instance_public_ip" {
  description = "Public IP of the OCI Compute Instance"
  value       = module.compute.instance_public_ip
}

output "instance_private_ip" {
  description = "Private IP of the OCI Compute Instance"
  value       = module.compute.instance_private_ip
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = module.vcn.vcn_id
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${module.compute.instance_public_ip}:${var.app_port}"
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i ~/.ssh/id_rsa opc@${module.compute.instance_public_ip}"
}
