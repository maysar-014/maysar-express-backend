import { QualityCheckpoint, QualityStatus } from './QualityCheckpoint.entity';

describe('QualityCheckpoint', () => {
  const createCheckpoint = (status: QualityStatus = QualityStatus.PENDING) =>
    new QualityCheckpoint({
      id: 'qc-1',
      productionOrderId: 'po-1',
      inspectionDate: new Date('2026-01-01T10:00:00.000Z'),
      stage: 'QUALITY_CONTROL',
      status,
      defectCount: 0,
      images: [],
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
      updatedAt: new Date('2026-01-01T09:00:00.000Z')
    });

  it('records pass and fail outcomes', () => {
    const checkpoint = createCheckpoint();
    checkpoint.recordResult(true, 0, 'all good');
    expect(checkpoint.status).toBe(QualityStatus.PASSED);
    expect(checkpoint.passed).toBe(true);
    expect(checkpoint.defectCount).toBe(0);
    expect(checkpoint.notes).toBe('all good');

    checkpoint.recordResult(false, 3);
    expect(checkpoint.status).toBe(QualityStatus.FAILED);
    expect(checkpoint.passed).toBe(false);
    expect(checkpoint.defectCount).toBe(3);
  });

  it('detects rework status', () => {
    const rework = createCheckpoint(QualityStatus.REWORK_REQUIRED);
    const passed = createCheckpoint(QualityStatus.PASSED);

    expect(rework.requiresRework()).toBe(true);
    expect(passed.requiresRework()).toBe(false);
  });
});
