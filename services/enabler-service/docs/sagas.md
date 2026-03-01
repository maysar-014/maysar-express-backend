# Enabler Service - Sagas

## TaskAssignmentSaga
**Purpose**: Assigns task to qualified enabler

**Steps**:
1. Find available enabler with required skills
2. Create task assignment
3. Notify enabler
4. Emit `TaskAssigned` event

**Compensation**: Cancel assignment, refund seller
**Idempotency**: Keyed by `task-{sellerId}-{taskType}`

## TaskCompletionSaga
**Purpose**: Validates and completes task

**Steps**:
1. Validate task deliverables
2. Calculate quality score
3. Update task status
4. Trigger commission payout
5. Emit `TaskCompleted` event

**Compensation**: Revert completion, hold payment
