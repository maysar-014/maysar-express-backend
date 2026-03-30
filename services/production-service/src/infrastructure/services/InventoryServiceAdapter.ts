
import { IInventoryService } from '../../domain/interfaces/IInventoryService';

export class InventoryServiceAdapter implements IInventoryService {
    async checkAvailability(productId: string, quantity: number): Promise<boolean> {
        console.log(`[InventoryAdapter] Checking availability for ${productId}: ${quantity}`);

        if (process.env.NODE_ENV === 'test') {
            return true;
        }

        throw new Error('Inventory service integration is not configured.');
    }

    async updateStock(productId: string, quantity: number, type: 'IN' | 'OUT'): Promise<void> {
        console.log(`[InventoryAdapter] Updating stock for ${productId}: ${type} ${quantity}`);

        if (process.env.NODE_ENV === 'test') {
            return;
        }

        throw new Error('Inventory service integration is not configured.');
    }
}
