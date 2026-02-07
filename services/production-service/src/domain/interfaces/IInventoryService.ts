
export interface IInventoryService {
    checkAvailability(productId: string, quantity: number): Promise<boolean>;
    updateStock(productId: string, quantity: number, type: 'IN' | 'OUT'): Promise<void>;
}
