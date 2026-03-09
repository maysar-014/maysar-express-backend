import type {
  EnablerAnalyticsDto,
  EnablerResponseDto,
  RegisterEnablerDto,
  UpdateEnablerProfileDto
} from './enabler-registration.dto';

describe('enabler-registration DTO contracts', () => {
  it('supports registration and profile update payloads', () => {
    const registerDto: RegisterEnablerDto = {
      userId: 'user-1',
      businessName: 'Amina Supplies',
      contactEmail: 'amina@example.com',
      hasBusinessLicense: true,
      salesExperience: 4
    };
    const updateDto: UpdateEnablerProfileDto = {
      businessDescription: 'Wholesale and retail distributor',
      contactPhone: '+255700000000'
    };

    expect(registerDto.hasBusinessLicense).toBe(true);
    expect(updateDto.contactPhone).toBe('+255700000000');
  });

  it('supports response and analytics payloads', () => {
    const response: EnablerResponseDto = {
      id: 'enabler-1',
      userId: 'user-1',
      businessName: 'Amina Supplies',
      status: 'ACTIVE',
      tier: 'SILVER',
      verificationStatus: 'VERIFIED',
      commissionRate: 0.17,
      createdAt: new Date('2026-01-10T00:00:00.000Z')
    };
    const analytics: EnablerAnalyticsDto = {
      totalSales: 600000,
      totalOrders: 140,
      conversionRate: 0.21,
      totalCommissionEarned: 98000,
      tier: 'SILVER'
    };

    expect(response.status).toBe('ACTIVE');
    expect(analytics.totalOrders).toBe(140);
  });
});
