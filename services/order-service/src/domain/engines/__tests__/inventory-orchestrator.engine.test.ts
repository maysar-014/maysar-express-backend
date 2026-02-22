import { InventoryOrchestrator, InventoryRequest } from '../inventory-orchestrator.engine';

describe('InventoryOrchestrator', () => {
    let orchestrator: InventoryOrchestrator;

    beforeEach(() => {
        orchestrator = new InventoryOrchestrator();
    });

    const validRequest: InventoryRequest = {
        operation: 'check',
        productId: 'prod-123',
        quantity: 10,
        warehouseId: 'wh-1'
    };

    describe('processInventoryRequest', () => {
        it('should process valid request successfully', async () => {
            const result = await orchestrator.processInventoryRequest(validRequest);

            expect(result.success).toBe(true);
            expect(result.inventory).toBeDefined();
            expect(result.validation.passed).toBe(true);
            expect(result.monitoring).toBeDefined();
        });

        it('should fail on invalid operation', async () => {
            const result = await orchestrator.processInventoryRequest({
                ...validRequest,
                operation: 'invalid' as any
            });

            // Should fail pre-validation
            expect(result.success).toBe(false);
            expect(result.validation.criticalIssues).toContainEqual(expect.stringContaining('Invalid operation type'));
        });

        it('should fail on invalid quantity', async () => {
            const result = await orchestrator.processInventoryRequest({
                ...validRequest,
                quantity: -1
            });

            expect(result.success).toBe(false);
            expect(result.validation.criticalIssues).toContainEqual(expect.stringContaining('Quantity must be between'));
        });

        it('should fail on missing product ID', async () => {
            const result = await orchestrator.processInventoryRequest({
                ...validRequest,
                productId: ''
            });

            expect(result.success).toBe(false);
            expect(result.validation.criticalIssues).toContainEqual(expect.stringContaining('Invalid or missing product ID'));
        });

        it('should validate output consistency', async () => {
            // We can't easily force the internal engine to be inconsistent without mocking it.
            // But we can verify that a successful run produces consistent stock check.
            const result = await orchestrator.processInventoryRequest(validRequest);
            const stockCheck = result.validation.checks.find(c => c.name === 'Stock Consistency Validation');
            expect(stockCheck?.passed).toBe(true);
        });

        it('should generate recommendations for low stock', async () => {
            // Need to mock inventory engine response to return low stock
            // Access private property or mock prototype?
            // Easier might be to rely on default which returns 'in_stock'.
            // Let's assume we can't easily force 'low_stock' without mocking.
            // Since InventoryOrchestrator instantiates InventoryEngine internally,
            // we have to spy on InventoryEngine.prototype.processInventoryRequest.

            const mockInventoryOutput = {
                success: true,
                confidence: 98,
                available: 5,
                reserved: 0,
                allocated: 0,
                stockStatus: { level: 'low_stock', lastUpdated: new Date() }
            };

            // Using require to get the class to spy on prototype?
            // Or just mocking the private member if we cast to any.
            const mockEngine = {
                processInventoryRequest: jest.fn().mockResolvedValue(mockInventoryOutput)
            };
            (orchestrator as any).inventoryEngine = mockEngine;

            const result = await orchestrator.processInventoryRequest(validRequest);

            expect(result.recommendations).toContain('Initiate emergency reorder process');
        });
    });
});
