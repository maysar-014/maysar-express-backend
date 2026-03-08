export interface IInventoryService { updateStock(id: string, qty: number): Promise<void>; } 
