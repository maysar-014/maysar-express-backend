import { QualityCheckpoint, QualityStatus } from '../QualityCheckpoint.entity';

describe('QualityCheckpoint Entity', () => {
    const createCheckpoint = () => new QualityCheckpoint({
        id: 'qc-1',
        productionOrderId: 'o-1',
        inspectionDate: new Date(),
        stage: 'assembly',
        status: QualityStatus.PENDING,
        defectCount: 0,
        images: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });

    it('should create checkpoint', () => {
        const cp = createCheckpoint();
        expect(cp.status).toBe(QualityStatus.PENDING);
    });

    it('should record result', () => {
        const cp = createCheckpoint();
        cp.recordResult(true, 0, 'All good');
        expect(cp.status).toBe(QualityStatus.PASSED);
        expect(cp.passed).toBe(true);
        expect(cp.defectCount).toBe(0);
        expect(cp.props.notes).toBe('All good');
    });

    it('should record failure', () => {
        const cp = createCheckpoint();
        cp.recordResult(false, 5);
        expect(cp.status).toBe(QualityStatus.FAILED);
        expect(cp.passed).toBe(false);
        expect(cp.defectCount).toBe(5);
    });

    it('should check rework', () => {
        const cp = new QualityCheckpoint({
            id: 'qc-1',
            productionOrderId: 'o-1',
            inspectionDate: new Date(),
            stage: 'end',
            status: QualityStatus.REWORK_REQUIRED,
            defectCount: 1,
            images: [],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        expect(cp.requiresRework()).toBe(true);
    });
});
