import type {
  QualityCheckpointDto,
  QualityCheckpointResponseDto
} from './quality-checkpoint.dto';

describe('quality-checkpoint.dto', () => {
  it('supports input and response dto contracts', () => {
    const input: QualityCheckpointDto = {
      orderId: 'order-10',
      passed: false,
      defectCount: 2,
      notes: 'minor issue',
      images: ['https://cdn.example/q1.jpg'],
      inspectorId: 'inspector-1'
    };
    const response: QualityCheckpointResponseDto = {
      id: 'qc-10',
      orderId: 'order-10',
      status: 'FAILED',
      passed: false,
      defectCount: 2,
      inspectionDate: '2026-03-08T00:00:00.000Z'
    };

    expect(input.images?.[0]).toContain('https://');
    expect(response.status).toBe('FAILED');
  });
});
