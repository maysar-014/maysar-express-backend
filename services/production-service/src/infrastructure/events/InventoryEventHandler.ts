
export class InventoryEventHandler {
    async handleInventoryReserved(event: any): Promise<void> {
        console.log(`[InventoryEventHandler] Inventory Reserved:`, event);
    }
}
