import type { CreateProductionOrderDto, ProductionOrderResponseDto } from './production-order.dto';

describe('production-order.dto', () => {
  it('supports create and response dto shapes', () => {
    const createDto: CreateProductionOrderDto = {
      planId: 'plan-2',
      productId: 'product-1',
      quantity: 50,
      scheduleStart: '2026-03-10T00:00:00.000Z',
      scheduleEnd: '2026-03-11T00:00:00.000Z'
    };
    const responseDto: ProductionOrderResponseDto = {
      id: 'po-2',
      planId: 'plan-2',
      productId: 'product-1',
      status: 'IN_PROGRESS' as never,
      phase: 'ASSEMBLY' as never,
      quantity: 50,
      producedQty: 10,
      defectedQty: 1
    };

    expect(createDto.quantity).toBe(50);
    expect(responseDto.producedQty).toBe(10);
  });
});
