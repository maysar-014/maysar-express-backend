import { IEventBus } from './event-bus.interface';

export class WalletEventPublisher {
    constructor(private readonly eventBus: IEventBus) { }

    async publishWalletCredited(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'WalletCredited',
            ...event
        });
    }

    async publishWalletDebited(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'WalletDebited',
            ...event
        });
    }

    async publishHoldPlaced(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'HoldPlaced',
            ...event
        });
    }

    async publishHoldReleased(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'HoldReleased',
            ...event
        });
    }

    async publishHoldCaptured(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'HoldCaptured',
            ...event
        });
    }

    async publishHoldExpired(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'HoldExpired',
            ...event
        });
    }

    async publishWalletPayoutInitiated(event: any): Promise<void> {
        await this.eventBus.publish({
            type: 'WalletPayoutInitiated',
            ...event
        });
    }
}
