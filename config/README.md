# config/

Platform-level configuration files for SLO definitions and APM integration.

## Files

### `slo-config.json`

Service Level Objective definitions for critical platform endpoints. Each entry defines:

| Field | Description |
|-------|-------------|
| `serviceName` | The service module this SLO applies to |
| `endpoint` | The specific API endpoint being measured |
| `sloType` | `latency` or `availability` |
| `target` | Target percentage (e.g., `99.9` = 99.9%) |
| `window` | Measurement window (`7d`, `30d`) |
| `currentValue` | Last measured value |
| `status` | `healthy`, `warning`, or `breach` |
| `lastUpdated` | ISO 8601 timestamp of last measurement |

Current SLOs are defined for: `order-service`, `payment-service`, `inventory-service`.

To add a new SLO, append an entry following the same schema. SLO breach alerts are configured in [infra/prometheus/alert-rules.yml](../infra/prometheus/alert-rules.yml).

### `apm-config.json`

Application Performance Monitoring integration configuration.

| Field | Description |
|-------|-------------|
| `provider` | APM provider (currently `datadog`) |
| `apiKey` | APM provider API key (use env var in production) |
| `applicationId` | Application identifier in the APM dashboard |
| `environment` | Deployment environment |
| `serviceName` | Service name reported to APM |
| `customTags` | Additional tags for filtering in APM dashboards |

> **Note**: The `apiKey` in this file is a placeholder. In production, inject the real key via the `DATADOG_API_KEY` environment variable and reference it from the application startup code rather than reading this file directly.

## Related

- [infra/prometheus/](../infra/prometheus/) — Prometheus alert rules and scrape config
- [docs/load-testing-results.md](../docs/load-testing-results.md) — Historical performance data
- [docs/incident-playbook.md](../docs/incident-playbook.md) — SLO breach response procedures
