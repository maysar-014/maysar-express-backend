# Release And Operations

This tutorial explains what to check before and after you ship changes.

## Before Release

- run the relevant tests
- verify schema changes
- inspect contract files
- check service boot logs
- confirm route prefixes

## Deployment Sequence

The safest sequence for additive changes is:

1. database migration
2. backfill if needed
3. application deploy
4. contract sync
5. smoke test

## Example: KYC Rollout

For the KYC work, the rollout steps were:

- add KYC columns and audit log table
- create the KYC service
- update route gates
- update OpenAPI and Postman
- smoke test the endpoints and enforced routes

## Operational Signals To Watch

- startup logs
- database errors
- outbox processor health
- Redis connection warnings
- route 4xx/5xx spikes

## Safe Release Habits

- make one category of change at a time
- keep migrations additive when possible
- do not tie critical state transitions to optional side effects
- prefer explicit rollback plans

## Example Checklist

```text
[ ] Migration applied
[ ] App boots cleanly
[ ] Health endpoint responds
[ ] New route returns expected status
[ ] Gate returns expected 403
[ ] Contract files updated
```

## Exercise

Imagine you are releasing a new policy change.

Write a short release plan that includes:

- the schema change
- the app change
- the smoke test
- the rollback concern
