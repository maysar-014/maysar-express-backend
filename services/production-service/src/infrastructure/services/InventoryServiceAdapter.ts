
import { IInventoryService } from '../../domain/interfaces/IInventoryService';

export class InventoryServiceAdapter implements IInventoryService {
    async checkAvailability(productId: string, quantity: number): Promise<boolean> {
        throw new Error('Inventory service integration is not configured.');
    }

    async updateStock(productId: string, quantity: number, type: 'IN' | 'OUT'): Promise<void> {
        throw new Error('Inventory service integration is not configured.');
    }
}
