
###############################################################################
# IMPORTANT: This Terraform module is an EXAMPLE for Oracle Cloud (OCI).
#
# Provider names appear here ONLY as an example. Maysar Express Backend is
# infrastructure-agnostic — you can replace the OCI provider with any other
# cloud provider by swapping the required_providers block and resource types.
# No provider is mandated in system code.
###############################################################################

resource "oci_core_instance" "main" {
  availability_domain = var.availability_domain
  compartment_id      = var.compartment_id
  display_name        = "maysar-${var.environment}-instance"
  shape               = var.instance_shape

  shape_config {
    ocpus         = 1
    memory_in_gbs = 1
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    display_name     = "primaryvnic"
    assign_public_ip = true
    nsg_ids          = var.nsg_ids
  }

  source_details {
    source_type = "image"
    # Comment 2: Fallback logic for source image
    source_id   = coalesce(var.source_image_id, data.oci_core_images.oracle_linux.images[0].id)
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    # Comment 1: Pass explicit variables to template
    user_data           = base64encode(templatefile("${path.module}/cloud-init.sh", {
      NODE_ENV      = var.env_vars["NODE_ENV"]
      DATABASE_URL  = var.database_url_template # Now we pass interpolated URL or component parts if needed? 
      # Actually, plan was to avoid parsing. 
      # "include DB_PASSWORD, REDIS_PASSWORD, PORT, and DOCKER_IMAGE"
      # The cloud-init.sh expects: NODE_ENV, DATABASE_URL, REDIS_URL, DB_PASSWORD, REDIS_PASSWORD, PORT
      
      # We construct URLs here or outside? The comment said "stop hacky parsing".
      # So we should reconstruct usage in cloud-init or pass raw values.
      # Let's pass raw values and let cloud-init construct or just pass separate env vars?
      # Cloud-init writes .env. 
      # It writes: DATABASE_URL=${DATABASE_URL}
      # So we need to pass a valid URL.
      # If we pass db_password explicitly, we can construct the URL here safely:
      DATABASE_URL  = "postgresql://postgres:${var.db_password}@localhost:5432/maysar_db"
      REDIS_URL     = "redis://:${var.redis_password}@localhost:6379"
      
      DB_PASSWORD   = var.db_password
      REDIS_PASSWORD = var.redis_password
      PORT           = var.app_port
      DOCKER_IMAGE   = var.docker_image
    }))
  }

  preserve_boot_volume = false
}

# Data source for Oracle Linux 8 Image (canonical) if we want to automate
data "oci_core_images" "oracle_linux" {
  compartment_id           = var.compartment_id
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}
