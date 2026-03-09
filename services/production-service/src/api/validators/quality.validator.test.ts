import { recordQualityCheckpointSchema } from './quality.validator';

describe('recordQualityCheckpointSchema', () => {
  it('accepts valid quality checkpoint payload', () => {
    const payload = {
      body: {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        passed: true,
        defectCount: 0,
        notes: 'ok',
        images: ['https://cdn.example/image.jpg']
      }
    };

    const parsed = recordQualityCheckpointSchema.parse(payload);
    expect(parsed.body.passed).toBe(true);
    expect(parsed.body.images).toHaveLength(1);
  });

  it('rejects invalid order id and negative defect count', () => {
    expect(() =>
      recordQualityCheckpointSchema.parse({
        body: { orderId: 'bad-id', passed: false, defectCount: -1 }
      })
    ).toThrow();
  });
});
