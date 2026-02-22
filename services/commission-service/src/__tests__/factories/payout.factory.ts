import { Payout } from '../../domain/entities/payout.entity';
import { PayoutId, RecipientId } from '../../domain/value-objects/ids.value-object';
import { PayoutAmount } from '../../domain/value-objects/monetary.value-object';
import { RecipientType } from '../../domain/value-objects/recipient-types.value-object';
import { PayoutStatus } from '../../domain/value-objects/payout-types.value-object';

export class PayoutFactory {
    static create(overrides: Partial<any> = {}): Payout {
        return new Payout(
            overrides.id || PayoutId.create(),
            overrides.recipientId || RecipientId.create(),
            overrides.recipientType || RecipientType.SELLER,
            overrides.amount || PayoutAmount.fromNumber(500),
            overrides.status || PayoutStatus.PENDING,
            overrides.createdAt || new Date(),
            overrides.scheduledDate,
            overrides.processedDate,
            overrides.reference,
            overrides.metadata || {}
        );
    }

    static createScheduled(overrides: Partial<any> = {}): Payout {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        return this.create({
            ...overrides,
            status: PayoutStatus.SCHEDULED,
            scheduledDate: overrides.scheduledDate || scheduledDate
        });
    }

    static createProcessed(overrides: Partial<any> = {}): Payout {
        return this.create({
            ...overrides,
            status: PayoutStatus.PROCESSED,
            processedDate: new Date()
        });
    }
}
