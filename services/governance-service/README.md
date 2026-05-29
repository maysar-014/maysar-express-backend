# Governance Service

> Runs constitutional audits, stores immutable inspection reports, and exposes release-readiness APIs for operators and admin dashboards.

## Purpose

The Governance Service is the platform's release authority layer. It executes platform inspections, combines automated audit signals, classifies severity, and publishes read-only report endpoints that can be consumed by CI/CD systems and admin tools.

## First Slice

This initial implementation provides:

- a machine-readable constitution file
- a report runner that wraps the existing constitution audit scripts
- immutable JSON report storage
- read-only API endpoints for the latest report and run history
- a `/health` endpoint for the governance service itself

## API

- `POST /api/governance/runs` — execute a new audit run
- `GET /api/governance/runs` — list stored runs
- `GET /api/governance/runs/:runId` — fetch a run by id
- `GET /api/governance/runs/:runId/evidence/:gateId` — fetch gate evidence
- `GET /api/governance/reports/latest` — fetch the latest report
- `GET /api/governance/summary` — fetch the latest verdict summary
- `GET /api/governance/dashboard` — fetch an operator-friendly dashboard payload
- `GET /api/governance/constitution` — fetch the active constitution
- `GET /health` — governance service health

## Configuration

- `PORT` — service port, defaults to `3020`
- `GOVERNANCE_TARGET_BASE_URL` — platform base URL to inspect, defaults to `http://localhost:3000`
- `GOVERNANCE_REPORT_DIR` — directory for immutable reports, defaults to `reports/governance`
- `GOVERNANCE_CONSTITUTION_PATH` — override path to the active constitution JSON file
- `GOVERNANCE_SERVICE_READINESS_TARGETS_JSON` — JSON array of readiness targets for the service-readiness gate

## Testing

```bash
npm run test:governance-service
```

## Audit CLI

```bash
npm run governance:audit
```

The CLI runs the same bootstrap and inspectors as the API service, then exits non-zero when the verdict is `DENIED`.
