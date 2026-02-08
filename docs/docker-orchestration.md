# Docker Orchestration Guide

This project uses a tiered Docker Compose strategy to separate production concerns from development needs.

## Files

- `docker-compose.yml`: The production-ready base configuration. It includes resource limits, security hardening, and internal network isolation.
- `docker-compose.override.yml`: Local development overrides. It maps ports to the host and mounts the source code for hot-reloading.

## Usage

### Local Development
To start the environment for development:
```bash
docker compose up
```
This automatically merges `docker-compose.yml` and `docker-compose.override.yml`.

### Production Simulation
To see how it would look in production (no host port mappings for DBs, resource limits active):
```bash
docker compose -f docker-compose.yml up
```

## Network Design

- `backend-network`: Public-facing network for the application.
- `database-network`: Internal-only network for data persistence. Databases are isolated from the host and other external networks by default.

## Security Features

- **Resource Limits**: Prevents containers from consuming all host resources.
- **Logging**: Rotating log files to prevent disk exhaustion.
- **Graceful Shutdown**: 1-minute grace period for the backend to finish processing requests.
- **Healthchecks**: Integrated healthchecks for all services.
- **Non-Root**: The backend runs as a non-privileged user (enforced in `Dockerfile`).
- **Capabilities**: All Linux capabilities are dropped from the backend container.
