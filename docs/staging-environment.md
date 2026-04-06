# Staging Environment Runbook

## Purpose
Staging mirrors production behavior using isolated infrastructure and real integrations (sandbox/test credentials where applicable).

## 1. Prepare Environment File
1. Copy `.env.staging.example` to `.env.staging`.
2. Fill all placeholders from your secret manager.
3. Keep `NODE_ENV=staging`.

## 2. Preflight Validation
Run:

```bash
npm run staging:preflight
```

The preflight fails if:
- Required keys are missing.
- `NODE_ENV` is not `staging`.
- SMS provider is not Africa's Talking.
- Pesapal URL is not a Pesapal endpoint.
- Critical URLs still point to localhost.
- Google OAuth is missing its client credentials or resolves the callback to localhost instead of the staging API base.
- Secrets still look like placeholders.

For Google OAuth, staging should use the API base `https://api-staging.maysar.co.tz` and the callback route `https://api-staging.maysar.co.tz/api/auth/oauth/callback`. If `GOOGLE_OAUTH_CALLBACK_URL` is omitted, the app derives it from `BASE_URL`.

## 3. Start Staging Stack
Run:

```bash
npm run staging:up
```

This uses:
- `docker-compose.yml`
- `docker-compose.staging.yml`
- `.env.staging`

## 4. Observe and Verify
Follow logs:

```bash
npm run staging:logs
```

Health checks:
- `http://localhost:3000/health`
- `http://localhost:3000/ready`

## 5. Stop Staging Stack
Run:

```bash
npm run staging:down
```

## Operational Notes
- Use isolated staging volumes and networks (already defined in `docker-compose.staging.yml`).
- Do not reuse production credentials in staging.
- Rotate staging secrets on a schedule and after any leak suspicion.
