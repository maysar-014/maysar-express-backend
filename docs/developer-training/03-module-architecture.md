# Module Architecture

Every domain module follows the same broad structure:

```text
domain -> application -> infrastructure -> api
```

## Typical Module Layout

```text
services/example-service/
  index.ts
  src/
    domain/
    application/
    infrastructure/
    api/
```

## Responsibilities By Layer

### Domain

Domain code holds rules that should not depend on HTTP, Prisma, or Express.

Examples:

- value objects
- domain policies
- pure evaluation services
- domain events

### Application

Application code coordinates actions.

Examples:

- submit KYC
- approve KYC
- start training
- place order

### Infrastructure

Infrastructure code talks to the outside world.

Examples:

- Prisma repositories
- cache clients
- logger adapters
- external API clients

### API

API code translates HTTP into use case calls.

Examples:

- route registration
- request validation
- controllers
- middleware

## Example: New KYC Service

The KYC module demonstrates the pattern clearly:

- [services/kyc-service/index.ts](../../services/kyc-service/index.ts) wires the module
- [services/kyc-service/src/domain/services/kyc-evaluation.service.ts](../../services/kyc-service/src/domain/services/kyc-evaluation.service.ts) holds pure milestone logic
- [services/kyc-service/src/application/use-cases/submit-kyc.use-case.ts](../../services/kyc-service/src/application/use-cases/submit-kyc.use-case.ts) performs the submission flow
- [services/kyc-service/src/infrastructure/repositories/prisma-kyc.repository.ts](../../services/kyc-service/src/infrastructure/repositories/prisma-kyc.repository.ts) reads and writes Prisma
- [services/kyc-service/src/api/routes/kyc.routes.ts](../../services/kyc-service/src/api/routes/kyc.routes.ts) exposes the HTTP API

## Example: A Good Use Case

```ts
export class SubmitKycUseCase {
  constructor(private readonly repository: PrismaKycRepository) {}

  async execute(userId: string, payload: KycSubmissionPayload) {
    const current = await this.repository.findUserSnapshot(userId);
    if (!current) throw new Error('User not found');

    if (current.kycStatus === KycStatus.PENDING) {
      throw new Error('KYC submission already pending review');
    }

    await this.repository.submitKyc(userId, payload);
    return { success: true, status: KycStatus.PENDING };
  }
}
```

Notice what is missing:

- no Express imports
- no route parsing
- no direct SQL
- no response object

That is the goal.

## Exercise

Pick one service you know well, then map these four files:

- route
- controller
- use case
- repository

Write one sentence for what each layer owns.
