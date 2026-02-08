import { IEventBus } from './event-bus.interface';

export class WalletEventPublisher {
    constructor(private readonly eventBus: IEventBus) { }

    async publishWalletCredited(event: any): Promise<void> {
        await this.eventBus.publish('WalletCredited', event);
    }

    async publishWalletDebited(event: any): Promise<void> {
        await this.eventBus.publish('WalletDebited', event);
    }

    async publishHoldPlaced(event: any): Promise<void> {
        await this.eventBus.publish('HoldPlaced', event);
    }

    async publishHoldReleased(event: any): Promise<void> {
        await this.eventBus.publish('HoldReleased', event);
    }

    async publishHoldCaptured(event: any): Promise<void> {
        await this.eventBus.publish('HoldCaptured', event);
    }

    async publishHoldExpired(event: any): Promise<void> {
        await this.eventBus.publish('HoldExpired', event);
    }

    async publishWalletPayoutInitiated(event: any): Promise<void> {
        await this.eventBus.publish('WalletPayoutInitiated', event);
    }
}
