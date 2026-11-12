###############################################################################
# IMPORTANT: This Terraform configuration is an EXAMPLE for Oracle Cloud (OCI).
#
# Provider names appear here ONLY as an example. Maysar Express Backend is
# infrastructure-agnostic — you can replace the OCI provider with any other
# cloud provider (AWS, Azure, GCP, Hetzner, DigitalOcean, self-hosted, etc.)
# by swapping the required_providers block and resource types. No provider is
# mandated in system code.
###############################################################################

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.oci_tenancy_ocid
  user_ocid        = var.oci_user_ocid
  fingerprint      = var.oci_fingerprint
  private_key_path = var.oci_private_key_path
  region           = var.oci_region
}

# VCN Module
module "vcn" {
  source = "./modules/vcn"
  
  compartment_id     = var.oci_compartment_id
  environment        = var.environment
  vcn_cidr           = var.vcn_cidr
  public_subnet_cidr = var.public_subnet_cidr
  display_name       = "maysar-${var.environment}-vcn"
}

# Security Module
module "security" {
  source = "./modules/security"
  
  compartment_id = var.oci_compartment_id
  vcn_id         = module.vcn.vcn_id
  environment    = var.environment
  
  depends_on = [module.vcn]
}

# Compute Module
module "compute" {
  source = "./modules/compute"
  
  compartment_id      = var.oci_compartment_id
  availability_domain = var.availability_domain
  subnet_id           = module.vcn.public_subnet_id
  nsg_ids             = [module.security.nsg_id]
  
  instance_shape      = var.instance_shape
  ssh_public_key      = var.ssh_public_key
  docker_image        = var.docker_image
  app_port            = var.app_port
  environment         = var.environment
  
  # Secrets passed explicitly
  db_password           = var.db_password
  redis_password        = var.redis_password
  database_url_template = "" # Unused now as we construct inside module, but variable might be required if I didn't remove it or make it optional. 
  # Actually I added database_url_template as variable in compute/variables.tf but didn't set default.
  # But in main.tf of compute I used "postgresql://postgres:${var.db_password}..." directly.
  # So I should pass dummy string or nothing if validation allows.
  # Best to remove that variable from compute/variables.tf if I don't use it, BUT I cannot go back and edit variables.tf again easily without another step.
  # I will pass empty string and updating variables.tf to be cleaner in next step if possible or mostly, 
  # just pass it to satisfy standard HCL if strict.
  # Actually, `variable "database_url_template"` has no default, so it IS required.
  # I will pass "unused" or similar.
  # Wait, I should have removed it or set default.
  # Since I can write files, I will re-write compute/variables.tf in next step to remove it if I am smart.
  # But for now let's construct main.tf to pass everything we updated.

  env_vars = {
    NODE_ENV     = var.environment
    # DATABASE_URL = ... (now constructed in module)
    # REDIS_URL    = ... (now constructed in module)
  }
  
  depends_on = [module.vcn, module.security]
}

# Monitoring Module (Simplified)
module "monitoring" {
  source = "./modules/monitoring"
  
  compartment_id        = var.oci_compartment_id
  instance_id           = module.compute.instance_id
  environment           = var.environment
  notification_topic_id = var.notification_topic_id
  
  depends_on = [module.compute]
}
