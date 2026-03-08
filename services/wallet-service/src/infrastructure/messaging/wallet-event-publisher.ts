import { IEventBus } from './event-bus.interface';

export class WalletEventPublisher {
    constructor(private readonly eventBus: IEventBus) { }

    async publishWalletCredited(event: unknown): Promise<void> {
        await this.eventBus.publish('WalletCredited', event);
    }

    async publishWalletDebited(event: unknown): Promise<void> {
        await this.eventBus.publish('WalletDebited', event);
    }

    async publishHoldPlaced(event: unknown): Promise<void> {
        await this.eventBus.publish('HoldPlaced', event);
    }

    async publishHoldReleased(event: unknown): Promise<void> {
        await this.eventBus.publish('HoldReleased', event);
    }

    async publishHoldCaptured(event: unknown): Promise<void> {
        await this.eventBus.publish('HoldCaptured', event);
    }

    async publishHoldExpired(event: unknown): Promise<void> {
        await this.eventBus.publish('HoldExpired', event);
    }

    async publishWalletPayoutInitiated(event: unknown): Promise<void> {
        await this.eventBus.publish('WalletPayoutInitiated', event);
    }

    async publishWalletPaymentProcessed(event: unknown): Promise<void> {
        await this.eventBus.publish('WalletPaymentProcessed', event);
    }

    async publishWalletPaymentFailed(event: unknown): Promise<void> {
        await this.eventBus.publish('WalletPaymentFailed', event);
    }
}
