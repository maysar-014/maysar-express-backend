# Business Registry - Events

## Events Emitted

### BusinessRegistered
- **Topic**: `business.registered`
- **Payload**: `{ businessId, ownerId, businessName, registrationNumber }`
- **Consumers**: user-service, compliance-service

### KYCVerified
- **Topic**: `business.kyc.verified`
- **Payload**: `{ businessId, verificationType, verifiedAt }`
- **Consumers**: user-service, catalog-service

### DocumentUploaded
- **Topic**: `business.document.uploaded`
- **Payload**: `{ businessId, documentType, documentUrl }`
- **Consumers**: compliance-service

## Events Consumed

### UserRegistered
- **Topic**: `user.registered`
- **Source**: user-service
- **Handler**: Initiates business registration flow for sellers
