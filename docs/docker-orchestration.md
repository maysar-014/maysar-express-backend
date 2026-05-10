# Docker Orchestration Guide

This project uses a tiered Docker Compose strategy to separate production concerns from development needs.

## Files

- `docker-compose.yml`: The default local/full-stack configuration. It brings up the monolith, PostgreSQL, Redis, MeiliSearch, Mailpit, Prometheus, and Jaeger with safe development defaults.
- `docker-compose.override.yml`: Local development overrides. It maps ports to the host and runs the backend from compiled image artifacts for a faster startup path.

## Usage

### Local Development
To start the environment for development:
```bash
npm run docker:up
```
This starts the full stack in detached mode and automatically merges `docker-compose.yml` and `docker-compose.override.yml`.
The override now uses the built application artifacts from the image, which makes port `3000` available much faster than booting the whole monolith through `tsx` inside the container.
`npm run docker:up` also fingerprints the source tree now, so code changes trigger a rebuild automatically.

The stack is self-contained:
- Application: `http://localhost:3000`
- Mail inbox: `http://localhost:8025`
- MeiliSearch: `http://localhost:7700`
- Prometheus: `http://localhost:9090`
- Jaeger: `http://localhost:16686`

To stop the stack:
```bash
npm run docker:down
```

To follow logs:
```bash
npm run docker:logs
```

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
