import type {
  PreferenceResponseDto,
  QuietHoursDto,
  UpdatePreferenceDto
} from './preference.dto';

describe('preference DTO contracts', () => {
  it('supports update preference payloads', () => {
    const quietHours: QuietHoursDto = {
      start: '22:00',
      end: '07:00',
      timezone: 'Africa/Dar_es_Salaam'
    };
    const updateDto: UpdatePreferenceDto = {
      enabled: true,
      categories: {
        marketing: false,
        transactional: true
      },
      quietHours,
      frequency: 'daily'
    };

    expect(updateDto.quietHours?.start).toBe('22:00');
    expect(updateDto.categories?.transactional).toBe(true);
  });

  it('supports preference response payloads', () => {
    const response: PreferenceResponseDto = {
      id: 'pref-1',
      userId: 'user-1',
      channel: 'email',
      enabled: true,
      categories: {
        marketing: false,
        transactional: true,
        system: true
      },
      frequency: 'daily',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T01:00:00.000Z')
    };

    expect(response.channel).toBe('email');
    expect(response.categories.system).toBe(true);
  });
});
