import { ProductionOrder, ProductionOrderStatus, ProductionPhase } from '../ProductionOrder.entity';
import { ProductionSchedule } from '../../value-objects/production-schedule.value-object';

describe('ProductionOrder Entity', () => {
    const mockSchedule = new ProductionSchedule({
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000)
    });

    const createOrder = (props: Partial<any> = {}) => new ProductionOrder({
        id: 'order-1',
        planId: 'plan-1',
        productId: 'prod-1',
        quantity: 100,
        producedQty: 0,
        defectedQty: 0,
        status: ProductionOrderStatus.SCHEDULED,
        phase: ProductionPhase.PLANNING,
        schedule: mockSchedule,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...props
    });

    it('should create valid order', () => {
        const order = createOrder();
        expect(order.id).toBe('order-1');
        expect(order.status).toBe(ProductionOrderStatus.SCHEDULED);
    });

    describe('startProduction', () => {
        it('should start scheduled order', () => {
            const order = createOrder({ status: ProductionOrderStatus.SCHEDULED });
            order.startProduction();
            expect(order.status).toBe(ProductionOrderStatus.IN_PROGRESS);
            expect(order.phase).toBe(ProductionPhase.PREPARATION);
            expect(order.actualStart).toBeDefined();
        });

        it('should throw if order not ready', () => {
            const order = createOrder({ status: ProductionOrderStatus.COMPLETED });
            expect(() => order.startProduction()).toThrow('Order must be scheduled or pending');
        });
    });

    describe('completeProduction', () => {
        it('should complete order', () => {
            const order = createOrder({ status: ProductionOrderStatus.IN_PROGRESS });
            order.completeProduction(98, 2);
            expect(order.status).toBe(ProductionOrderStatus.COMPLETED);
            expect(order.phase).toBe(ProductionPhase.COMPLETED);
            expect(order.producedQty).toBe(98);
            expect(order.defectedQty).toBe(2);
            expect(order.actualEnd).toBeDefined();
        });
    });

    describe('failProduction', () => {
        it('should mark as failed', () => {
            const order = createOrder();
            order.failProduction('Machine broke');
            expect(order.status).toBe(ProductionOrderStatus.FAILED);
        });
    });
});
