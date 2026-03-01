# Training Service - Events

## Events Emitted

### TrainingStarted
- **Topic**: `training.started`
- **Payload**: `{ trainingId, enablerId, courseId, startedAt }`
- **Consumers**: enabler-service, analytics-service

### TrainingCompleted
- **Topic**: `training.completed`
- **Payload**: `{ trainingId, enablerId, completedAt, score }`
- **Consumers**: enabler-service (update skills), commission-service

### CertificationAwarded
- **Topic**: `training.certification.awarded`
- **Payload**: `{ certificationId, enablerId, certificationType }`
- **Consumers**: enabler-service, notification-service

## Events Consumed

### EnablerRegistered
- **Topic**: `enabler.registered`
- **Source**: enabler-service
- **Handler**: Enrolls in mandatory training
