import { ProductionPlan, ProductionStatus, ProductionPriority } from '../ProductionPlan.entity';
import { ProductionSchedule } from '../../value-objects/production-schedule.value-object';

describe('ProductionPlan Entity', () => {
    const validSchedule = new ProductionSchedule({
        startTime: new Date(Date.now() + 86400000), // tomorrow
        endTime: new Date(Date.now() + 172800000) // day after tomorrow
    });

    const createValidPlan = () => new ProductionPlan({
        id: 'plan-1',
        supplierId: 'sup-1',
        name: 'Test Plan',
        status: ProductionStatus.DRAFT,
        priority: ProductionPriority.MEDIUM,
        schedule: validSchedule,
        targetQuantity: 100,
        actualQuantity: 0,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    it('should create a valid production plan', () => {
        const plan = createValidPlan();
        expect(plan.id).toBe('plan-1');
        expect(plan.status).toBe(ProductionStatus.DRAFT);
        expect(plan.targetQuantity).toBe(100);
    });

    describe('updateStatus', () => {
        it('should allow valid status transition', () => {
            const plan = createValidPlan();
            plan.updateStatus(ProductionStatus.SCHEDULED);
            expect(plan.status).toBe(ProductionStatus.SCHEDULED);
        });

        it('should prevent changing status of completed plan', () => {
            const plan = createValidPlan();
            plan.updateStatus(ProductionStatus.COMPLETED);

            expect(() => {
                plan.updateStatus(ProductionStatus.IN_PROGRESS);
            }).toThrow('Cannot change status of completed plan');
        });
    });

    describe('updateProgress', () => {
        it('should update progress when in progress', () => {
            const plan = createValidPlan();
            plan.updateStatus(ProductionStatus.IN_PROGRESS);

            plan.updateProgress(50);
            expect(plan.actualQuantity).toBe(50);
        });

        it('should throw if not in progress', () => {
            const plan = createValidPlan();
            // Status is DRAFT

            expect(() => {
                plan.updateProgress(50);
            }).toThrow('Cannot update progress if plan is not in progress');
        });
    });

    describe('isCompleted', () => {
        it('should return true if status is COMPLETED', () => {
            const plan = createValidPlan();
            plan.updateStatus(ProductionStatus.COMPLETED);
            expect(plan.isCompleted()).toBe(true);
        });

        it('should return false otherwise', () => {
            const plan = createValidPlan();
            expect(plan.isCompleted()).toBe(false);
        });
    });
});
