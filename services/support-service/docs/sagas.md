# Support Service - Sagas

## TicketResolutionSaga
**Purpose**: Routes and resolves support tickets

**Steps**:
1. Create ticket
2. Assign to agent
3. Track resolution
4. Collect satisfaction feedback
5. Emit `TicketResolved` event

**Compensation**: Reopen ticket
**Idempotency**: Keyed by `ticket-{userId}-{issue}`
