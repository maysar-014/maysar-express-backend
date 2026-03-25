# GitHub Actions CI/CD Runbook (dev / staging / prod)

This runbook defines the branch strategy and GitHub Actions pipelines for controlled promotion from testing to production.

## 1. Branch Strategy

Environment branches:
- `dev`
- `staging`
- `prod`

Promotion flow:
1. Push feature work to `dev` (or PR into `dev`).
2. After validation, merge `dev` -> `staging`.
3. After staging verification, merge `staging` -> `prod`.

Recommended branch protections:
- Require pull requests for `staging` and `prod`.
- Require status checks to pass before merge.
- Require at least one reviewer on `staging`.
- Require at least two reviewers on `prod`.

## 2. Workflows Added

### `CI` workflow
Path: `.github/workflows/ci.yml`

Triggers:
- `push` on `dev`, `staging`, `prod`
- `pull_request` targeting `dev`, `staging`, `prod`
- manual dispatch

Main checks:
- Install dependencies
- Lint
- Typecheck
- Build
- Test (Postgres + Redis service containers)
- OpenAPI validation
- Contract examples (only on push to `dev`)

### `Deploy Staging` workflow
Path: `.github/workflows/deploy-staging.yml`

Triggers:
- `push` on `staging`
- manual dispatch

Behavior:
- Runs staging preflight using `.env.staging` content from secret.
- Syncs repository to staging server over SSH.
- Writes `.env.staging` on server.
- Deploys using Docker Compose:
  - `docker-compose.yml`
  - `docker-compose.staging.yml`
- Optional health check using `HEALTHCHECK_URL` secret.

### `Deploy Production` workflow
Path: `.github/workflows/deploy-production.yml`

Triggers:
- `push` on `prod`
- manual dispatch

Behavior:
- Runs production preflight using `.env.production` content from secret.
- Syncs repository to production server over SSH.
- Writes `.env.production` on server.
- Deploys using Docker Compose:
  - `docker-compose.prod.yml`
- Optional health check using `HEALTHCHECK_URL` secret.

Safety recommendation:
- Configure GitHub Environment `production` with required reviewer approvals before job execution.

## 3. Required GitHub Environments And Secrets

Create two GitHub Environments:
- `staging`
- `production`

For each environment, configure these secrets:

| Secret Name | Description | Example |
|---|---|---|
| `SSH_HOST` | Deployment server hostname/IP | `203.0.113.10` |
| `SSH_PORT` | SSH port (optional, default 22) | `22` |
| `SSH_USER` | SSH login user | `ubuntu` |
| `SSH_PRIVATE_KEY` | Private key used by runner for SSH | OpenSSH private key |
| `DEPLOY_PATH` | Absolute path where app will be synced | `/opt/maysar-express-backend` |
| `ENV_FILE` | Full multi-line env content for target environment | `.env.staging` or `.env.production` content |
| `HEALTHCHECK_URL` | Optional post-deploy health endpoint | `https://staging.example.com/health` |

Notes:
- Use different secret values between staging and production.
- Do not reuse staging credentials in production.

## 4. Remote Host Requirements

Each target host must have:
- Docker Engine
- Docker Compose plugin (`docker compose`)
- Bash shell
- Network/firewall rules allowing required inbound traffic

The workflow sync excludes:
- `.git/`
- `.github/`
- `node_modules/`
- coverage/reports/log directories
- local `.env*` files

## 5. First-Time Setup Checklist

1. Create and protect branches: `dev`, `staging`, `prod`.
2. Configure GitHub environments and secrets.
3. On each server, ensure `DEPLOY_PATH` parent exists and has proper permissions.
4. Merge a small change into `staging` to test `Deploy Staging`.
5. Validate health endpoint and service availability.
6. Promote to `prod` and verify `Deploy Production`.

## 6. Operational Notes

- Deployment script used on remote host:
  - `scripts/deploy/remote-compose-deploy.sh`
- Staging preflight script:
  - `scripts/staging/preflight-env.js`
- Production preflight script:
  - `scripts/production/preflight-env.js`

If deployment fails:
1. Check workflow logs in Actions.
2. SSH to target server and inspect:
   - `docker compose ... ps`
   - `docker compose ... logs --tail=200`
3. Verify `ENV_FILE` values and required variables.
