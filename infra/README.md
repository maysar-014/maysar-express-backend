# Maysar Infrastructure

This directory contains infrastructure-as-code for multiple deployment targets:

- `infra/terraform/` for the legacy OCI-focused environment
- `infra/terraform/aws/` for a production-oriented AWS environment

## Architecture Overview

- **Compute**: Single `VM.Standard.E2.1.Micro` instance (or `VM.Standard.A1.Flex`)
- **Containerization**: Docker & Docker Compose for orchestration
- **Database**: PostgreSQL (containerized, persistent volume)
- **Cache**: Redis (containerized)
- **Networking**: OCI VCN with Public Subnet
- **Security**: Network Security Groups (NSG) and SSH key access

## Directory Structure

```
infra/
├── terraform/                    # Terraform infrastructure
│   ├── main.tf                   # Main OCI configuration
│   ├── variables.tf              # OCI-specific variables
│   ├── outputs.tf                # Outputs (e.g., Instance IP)
│   ├── terraform.tfvars          # Environment variables (gitignored)
│   ├── secrets.tfvars            # Secrets (gitignored)
│   └── modules/                  # Reusable Modules
│       ├── vpc/                  # VCN, Subnets, Gateways
│       ├── security/             # NSGs, Security Rules
│       ├── compute/              # Compute Instance, Cloud-Init
│       ├── monitoring/           # OCI Monitoring & Alarms
│       ├── storage/              # Block Volume Management
│       └── dns/                  # DNS Zone Management
```

## Prerequisites

1. **OCI Account** (Free Tier eligible)
2. **Terraform** v1.5+ installed
3. **OCI CLI** (optional, for debugging)
4. **SSH Key Pair** for instance access

## Quick Start

### 1. Setup Configuration
Copy the template variable files and fill in your OCI details:

```bash
cd infra/terraform
cp terraform.tfvars.template terraform.tfvars
cp secrets.tfvars.template secrets.tfvars
# Edit terraform.tfvars and secrets.tfvars with your Tenancy OCID, User OCID, etc.
```

### 2. Initialize & Apply
```bash
terraform init
terraform plan -var-file=terraform.tfvars -var-file=secrets.tfvars
terraform apply -var-file=terraform.tfvars -var-file=secrets.tfvars
```

### 3. Access the Application
After successful application:
```bash
# Get Instance IP
terraform output instance_public_ip

# SSH into the instance
ssh -i ~/.ssh/id_rsa opc@<INSTANCE_PUBLIC_IP>

# Verify Docker Containers
sudo docker ps
```

The application should be accessible at `http://<INSTANCE_PUBLIC_IP>:3000`.

## Deployment Details
The compute instance is bootstrapped using `cloud-init` which:
1. Installs Docker & Docker Compose
2. Sets up the application directory `/opt/maysar`
3. Creates `.env` and `docker-compose.yml`
4. Starts the application services

## Monitoring
Basic monitoring is configured via OCI Monitoring service:
- CPU Utilization > 80% (Critical)
- Memory Utilization > 80% (Critical)

## Backup & Recovery
- **Database**: Data is stored on OCI Block Storage (boot volume or separate attached volume)
- **Snapshots**: Configure OCI Block Volume Backups for data protection
