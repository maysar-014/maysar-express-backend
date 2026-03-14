import { NotificationPreference } from '../../domain/entities/notification-preference.entity';

const mockPrisma: Record<string, any> = {};

jest.mock('../database/prisma-client', () => ({
  prisma: mockPrisma
}));

import { PrismaPreferenceRepository } from './prisma-preference.repository';

describe('PrismaPreferenceRepository', () => {
  const makeDelegate = () => ({
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  });

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'pref-1',
    userId: 'user-1',
    channel: 'email',
    enabled: true,
    categories: {
      marketing: true,
      transactional: true,
      system: true
    },
    quietHours: { start: '22:00', end: '06:00' },
    frequency: 'daily',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete mockPrisma.notificationPreference;
    delete mockPrisma.notification_Preference;
    delete mockPrisma.preference;
  });

  it('findById returns mapped domain preference when default delegate exists', async () => {
    const delegate = makeDelegate();
    delegate.findUnique.mockResolvedValue(makeRow());
    mockPrisma.notificationPreference = delegate;
    const repo = new PrismaPreferenceRepository();

    const result = await repo.findById('pref-1');

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 'pref-1' } });
    expect(result).toBeInstanceOf(NotificationPreference);
    expect(result?.userId).toBe('user-1');
  });

  it('falls back to alternative delegate key when default is unavailable', async () => {
    const delegate = makeDelegate();
    delegate.findUnique.mockResolvedValue(makeRow({ id: 'pref-2' }));
    mockPrisma.preference = delegate;
    const repo = new PrismaPreferenceRepository();

    const result = await repo.findByUserAndChannel('user-1', 'email');

    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { userId_channel: { userId: 'user-1', channel: 'email' } }
    });
    expect(result?.id).toBe('pref-2');
  });

  it('creates and updates preferences with mapped persistence payloads', async () => {
    const delegate = makeDelegate();
    mockPrisma.notificationPreference = delegate;
    const repo = new PrismaPreferenceRepository();
    const preference = NotificationPreference.create({
      id: 'pref-3',
      userId: 'user-3',
      channel: 'sms',
      categories: { marketing: false }
    });

    delegate.create.mockResolvedValue(makeRow({ id: 'pref-3', channel: 'sms' }));
    const created = await repo.create(preference);
    expect(delegate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'pref-3',
        userId: 'user-3',
        channel: 'sms'
      })
    });
    expect(created).toBeInstanceOf(NotificationPreference);

    const updatedPreference = preference.updatePreference({
      enabled: false,
      categories: { system: false }
    });
    delegate.update.mockResolvedValue(
      makeRow({
        id: 'pref-3',
        channel: 'sms',
        enabled: false,
        categories: { marketing: false, transactional: true, system: false }
      })
    );
    const updated = await repo.update(updatedPreference);
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 'pref-3' },
      data: expect.objectContaining({
        enabled: false,
        categories: { marketing: false, transactional: true, system: false },
        updatedAt: expect.any(Date)
      })
    });
    expect(updated.enabled).toBe(false);
  });

  it('findByUserId maps rows and delete delegates correctly', async () => {
    const delegate = makeDelegate();
    mockPrisma.notificationPreference = delegate;
    delegate.findMany.mockResolvedValue([makeRow({ id: 'pref-4' }), makeRow({ id: 'pref-5' })]);
    const repo = new PrismaPreferenceRepository();

    const result = await repo.findByUserId('user-1');
    await repo.delete('pref-4');

    expect(delegate.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(NotificationPreference);
    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 'pref-4' } });
  });

  it('throws when no compatible preference delegate is configured', async () => {
    const repo = new PrismaPreferenceRepository();

    await expect(repo.findById('pref-missing')).rejects.toThrow(
      'Notification preference delegate is not configured on prisma client'
    );
  });
});

