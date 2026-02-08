output "instance_id" {
  value = oci_core_instance.main.id
}

output "instance_public_ip" {
  value = oci_core_instance.main.public_ip
}

output "instance_private_ip" {
  value = oci_core_instance.main.private_ip
}
