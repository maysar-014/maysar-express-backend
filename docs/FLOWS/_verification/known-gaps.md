| Ref | Item | Status | Reality |
|---|---|---|---|

|---|---|---|---|

| Support | `GET /api/support/admin/tickets` | `GET /api/support/tickets` → 404 (legacy) | Legacy path; real inbox is `GET /api/support/tickets` (agent sees all tickets) |
| Support | `POST /api/support/disputes/:id/resolve` | `POST /api/support/disputes/:id/resolve` → 404 (legacy) | Legacy path; real dispute resolution is `POST /api/support/disputes/:id/resolve` — same path resolves now; legacy `admin/...` prefix was removed |
| Support | ticket auto-escalation | `POST /api/support/tickets/:id/escalate` | Live escalation via saga; admin-flows.md documents `POST /.../escalate` |
| Enabler | `docs/enabler/ENABLER_SERVICE_SYSTEM.md` | Phantom — no such file | Truth in `services/enabler-service/README.md` + `services/enabler-service/src/api/routes/*` |
| Enabler | `docs/training/TRAINING_SERVICE_SYSTEM.md` | Phantom — no such file | Truth in `services/training-service/src/` |
| Enabler | `docs/enabler/ENABLER_SERVICE_FRONTEND_GUIDE.md` | Phantom — no such file | Real guide: `docs/enabler/frontend-guide/enabler-guide.md` |
| Enabler | `GET /api/enabler/enablers/{id}` → 500 | **Resolved (DEF-002)** — 404 now | Verified: accurate 404 for missing profiles |
| Enabler | `GET /api/commission/sellers/:sellerId` | **Resolved (DEF-006)** — mounted at `/api/commission/*` | Surface live; locked by contract tests |
| Support | `GET /api/support/admin/tickets` in agent inbox | Legacy; real endpoint `GET /api/support/tickets` | Agent view: no ownership filter; admin view: same route, optional `scope=all` |
