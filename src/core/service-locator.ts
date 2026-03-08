export class ServiceLocator {
    private static services = new Map<string, unknown>();

    static register(name: string, service: unknown) {
        this.services.set(name, service);
        console.log(`[ServiceLocator] Registered service: ${name}`);
    }

    static get<T>(name: string): T {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found in Service Locator`);
        }
        return service as T;
    }

    static reset() {
        this.services.clear();
    }
}
