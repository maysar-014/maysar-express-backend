import { prisma } from '../services/user-service/src/infrastructure/database/prisma-client';
import { PrismaUserRepository } from '../services/user-service/src/infrastructure/repositories/prisma-user.repository';
import { PiiEncryptionService } from '../shared/encryption/pii-encryption.service';
import { UpdateUserUseCase } from '../services/user-service/src/application/use-cases/update-user.use-case';
import { UserEventPublisher } from '../services/user-service/src/infrastructure/messaging/user-event-publisher';
import { UserOutboxRepository } from '../services/user-service/src/infrastructure/messaging/user-outbox.repository';

async function main() {
  try {
    const pii = new PiiEncryptionService();
    const repo = new PrismaUserRepository(prisma, pii);
    const outbox = new UserOutboxRepository(prisma);
    const publisher = new UserEventPublisher(outbox);
    const useCase = new UpdateUserUseCase(repo, publisher);

    const userId = 'usr_01KRFXQZC36NK3CDEWJJS21RP8'; // buyer
    console.log('Testing update user for:', userId);

    const result = await useCase.execute({
      userId,
      updatedBy: userId,
      updates: {
        addresses: [
          {
            type: 'home',
            isPrimary: true,
            street: 'Mikocheni A',
            city: 'Dar es Salaam',
            state: 'Dar es Salaam',
            postalCode: '11101',
            country: 'Tanzania'
          }
        ]
      }
    });

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('EXPLICIT ERROR STACK:', err.stack || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
