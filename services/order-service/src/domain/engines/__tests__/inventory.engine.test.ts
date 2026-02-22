import { InventoryEngine, InventoryInput } from '../inventory.engine';

describe('InventoryEngine', () => {
    let engine: InventoryEngine;

    beforeEach(() => {
        engine = new InventoryEngine();
    });

    const mockInput: InventoryInput = {
        productId: 'prod-123',
        quantity: 10,
        warehouseId: 'wh-1',
        reservationType: 'order',
        priority: 'high'
    };

    it('should process inventory request successfully', async () => {
        const result = await engine.processInventoryRequest(mockInput);

        expect(result.success).toBe(true);
        expect(result.confidence).toBe(98);
        expect(result.available).toBe(50);
        expect(result.stockStatus.level).toBe('in_stock');
    });

    it('should generate reservation ID for order type', async () => {
        const result = await engine.processInventoryRequest({ ...mockInput, reservationType: 'order' });
        expect(result.reservationId).toBeDefined();
        expect(result.reservationId).toMatch(/^res_/);
    });

    it('should not generate reservation ID for other types', async () => {
        const result = await engine.processInventoryRequest({ ...mockInput, reservationType: 'cart' });
        expect(result.reservationId).toBeUndefined();
    });
});
