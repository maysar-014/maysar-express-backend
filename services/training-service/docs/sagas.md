# Training Service - Sagas

## TrainingEnrollmentSaga
**Purpose**: Enrolls and tracks enabler training

**Steps**:
1. Enroll enabler in course
2. Track progress
3. Validate completion
4. Award certification
5. Emit `TrainingCompleted` event

**Compensation**: Cancel enrollment
**Idempotency**: Keyed by `training-{enablerId}-{courseId}`
