# Incident Playbook

This playbook provides standard procedures for responding to production incidents.

> Note: the current runtime does not use Kafka. Section 3.3 is retained as a historical external-broker runbook and should only be applied if a brokered transport is reintroduced.

## 1. Severity Levels

| Severity | Definition | Response SLA |
|---|---|---|
| P0 – Critical | Full service outage / data loss | 15 min |
| P1 – High | Core feature degraded (orders, payments) | 30 min |
| P2 – Medium | Non-critical feature impacted | 2 hours |
| P3 – Low | Minor issue / cosmetic | Next business day |

## 2. Escalation Matrix

| Role | Responsibility | Contact Method |
|---|---|---|
| On-Call Engineer | First responder, triage | PagerDuty / phone |
| Tech Lead | P0/P1 escalation, architectural decisions | Phone |
| Engineering Manager | Business impact, stakeholder comms | Phone / Slack |
| CTO | P0 prolonged (>1h), data breach | Phone |

## 3. Runbooks

### 3.1 Database Loss (PostgreSQL)

- **Detection signals**: Prometheus alert `pg_up == 0`.
- **Immediate actions**: 
    1. Stop write traffic to the backend.
    2. Notify stakeholders via Slack #incidents.
- **Recovery steps**: Reference [Disaster Recovery Guide §3.1](disaster-recovery.md#31-postgresql-restore).
- **Post-incident actions**: Perform RCA (Root Cause Analysis), verify backup integrity.

### 3.2 Redis Failure

- **Detection signals**: `redis_connected_clients == 0`, rate-limit bypass alerts.
- **Immediate actions**: Observe if services degrade gracefully via in-memory fallback.
- **Recovery steps**: Restart container, restore from RDB snapshot if data persistence is required for critical state.
- **Impact**: Session loss, rate-limit state reset, Redlock availability issues.

### 3.3 Event Bus / Broker Failure

- **Detection signals**: Consumer lag metric spike or event transport outage.
- **Immediate actions**: Outbox processor pauses; outbox rows remain safe in DB.
- **Recovery steps**: Restart broker, verify consumer group offsets, replay from outbox if necessary.
- **Reference**: `shared/outbox/outbox.processor.ts` and the current event bus adapter.

### 3.4 Saga Stuck / Dead-Letter Growth

- **Detection signals**: Prometheus `saga_stuck_count > 0`, DLQ size alert.
- **Recovery steps**: Trigger `SagaRecoveryWorker` manually, inspect `SagaDeadLetterRepository`.

## 4. On-Call Rotation Template

- Weekly rotation starts every Monday at 09:00 UTC.
- Handoff meeting required between outgoing and incoming engineers.
- Runbook updates are the responsibility of the on-call engineer for any gaps discovered during the shift.

## 5. Post-Incident Review Template

- **Timeline Reconstruction**: What happened and when?
- **Root Cause Analysis**: 5-Whys analysis.
- **Action Items**: Owners and due dates for preventative measures.
- **Lessons Learned**: What went well? What didn't?
