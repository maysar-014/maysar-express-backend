export class CourierRegisteredHandler {
    public async handle(event: any): Promise<void> {
        const { courierId } = event;
        console.log(`Initializing training requirements for new courier: ${courierId}`);
        // Initialize training requirements for new courier
    }
}
