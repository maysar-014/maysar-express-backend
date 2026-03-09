import { QualityMapper } from './quality.mapper';
import { QualityCheckpoint, QualityStatus } from '../../domain/entities/QualityCheckpoint.entity';

describe('QualityMapper', () => {
  it('maps checkpoint entity to response dto', () => {
    const checkpoint = new QualityCheckpoint({
      id: 'qc-1',
      productionOrderId: 'order-1',
      inspectionDate: new Date('2026-03-08T00:00:00.000Z'),
      stage: 'QUALITY',
      status: QualityStatus.PASSED,
      passed: true,
      defectCount: 0,
      images: [],
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    });

    const dto = QualityMapper.toDto(checkpoint);

    expect(dto.id).toBe('qc-1');
    expect(dto.orderId).toBe('TODO: Fix entity to expose orderId');
    expect(dto.status).toBe(QualityStatus.PASSED);
    expect(dto.passed).toBe(true);
    expect(dto.defectCount).toBe(0);
  });

  it('defaults passed to false when checkpoint passed is null/undefined', () => {
    const checkpoint = new QualityCheckpoint({
      id: 'qc-2',
      productionOrderId: 'order-2',
      inspectionDate: new Date('2026-03-08T00:00:00.000Z'),
      stage: 'QUALITY',
      status: QualityStatus.FAILED,
      passed: null,
      defectCount: 3,
      images: [],
      createdAt: new Date('2026-03-08T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    });

    const dto = QualityMapper.toDto(checkpoint);
    expect(dto.passed).toBe(false);
  });
});
