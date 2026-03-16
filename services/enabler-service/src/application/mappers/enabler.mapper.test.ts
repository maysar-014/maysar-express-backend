import { EnablerMapper } from './enabler.mapper';
import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../domain/types/enabler.types';

const createEnabler = (): EnablerEntity =>
  EnablerEntity.create({
    id: 'enabler-1',
    userId: 'user-1',
    enablerCode: 'ENB-8F3K29',
    enablerCodeShort: 'E8F3K29',
    businessName: 'Amina Distribution',
    contactEmail: 'amina@example.com',
    status: Enabler_Status.ACTIVE,
    verificationStatus: 'VERIFIED',
    tier: Enabler_Tier.SILVER,
    commissionRate: 0.17,
    totalSales: 500000,
    totalOrders: 120,
    conversionRate: 0.2,
    customerRating: 4.6,
    totalCommissionEarned: 85000,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z')
  });

describe('EnablerMapper', () => {
  it('maps enabler entity to response dto', () => {
    const dto = EnablerMapper.toResponseDto(createEnabler());

    expect(dto).toEqual({
      id: 'enabler-1',
      userId: 'user-1',
      enablerCode: 'ENB-8F3K29',
      enablerCodeShort: 'E8F3K29',
      businessName: 'Amina Distribution',
      status: Enabler_Status.ACTIVE,
      tier: Enabler_Tier.SILVER,
      verificationStatus: 'VERIFIED',
      commissionRate: 0.17,
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    });
  });

  it('maps enabler entity to analytics dto', () => {
    const dto = EnablerMapper.toAnalyticsDto(createEnabler());
    expect(dto).toEqual({
      totalSales: 500000,
      totalOrders: 120,
      conversionRate: 0.2,
      customerRating: 4.6,
      totalCommissionEarned: 85000,
      tier: Enabler_Tier.SILVER
    });
  });
});
