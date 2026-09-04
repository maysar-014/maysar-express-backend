import { Wallet, WalletStatus } from '../../domain/entities/wallet.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { EventEnvelope } from '@shared-events/eventBus';
import { EventIdempotency } from '@shared/middleware/idempotency';
import { makeId, getModelPrefix } from '@shared/ids/id';

interface UserRegisteredEventData {
    userId: string;
}

export class UserRegisteredHandler {
    constructor(
        private readonly walletRepository: IWalletRepository,
        private readonly eventIdempotency: EventIdempotency
    ) {}

    async handle(event: EventEnvelope): Promise<void> {
        const data = event.data as Partial<UserRegisteredEventData>;

        if (typeof data?.userId !== 'string' || !data.userId) {
            console.warn('[UserRegisteredHandler] Received UserRegistered.v1 with missing or invalid userId — skipping');
            return;
        }

        const { userId } = data;

        const idempotencyKey = event.eventId ?? `user-registered:${userId}`;

        await this.eventIdempotency.withIdempotency(
            idempotencyKey,
            'UserRegisteredHandler',
            async () => {
                const existing = await this.walletRepository.findByUserId(userId);
                if (existing) {
                    console.log(`[UserRegisteredHandler] Wallet already exists for user ${userId} — skipping`);
                    return;
                }

                const wallet = new Wallet({
                    id: makeId(getModelPrefix('Wallet_Wallet')),
                    userId,
                    balance: 0,
                    currency: 'TZS',
                    status: WalletStatus.ACTIVE,
                    frozenAmount: 0,
                    codCommitmentLimit: 0,
                    codCommitmentUsed: 0,
                    codCommitmentCount: 0,
                    version: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                await this.walletRepository.save(wallet);
                console.log(`[UserRegisteredHandler] Wallet created for user ${userId}`);
            }
        ).catch(async (idempotencyError) => {
            // Idempotency infrastructure failed — attempt wallet creation directly as fallback
            console.warn(`[UserRegisteredHandler] Idempotency error for user ${userId}, attempting direct wallet creation:`, idempotencyError?.message);
            try {
                const existing = await this.walletRepository.findByUserId(userId);
                if (!existing) {
                    const wallet = new Wallet({
                        id: makeId(getModelPrefix('Wallet_Wallet')),
                        userId,
                        balance: 0,
                        currency: 'TZS',
                        status: WalletStatus.ACTIVE,
                        frozenAmount: 0,
                        codCommitmentLimit: 0,
                        codCommitmentUsed: 0,
                        codCommitmentCount: 0,
                        version: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    await this.walletRepository.save(wallet);
                    console.log(`[UserRegisteredHandler] Wallet created via fallback for user ${userId}`);
                }
            } catch (fallbackError) {
                console.error(`[UserRegisteredHandler] Fallback wallet creation also failed for user ${userId}:`, fallbackError);
            }
        });
    }
}
