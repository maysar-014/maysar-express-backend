import { NotificationTemplate } from '../../domain/entities/notification-template.entity';

const mockPrisma: Record<string, any> = {
  notificationTemplate: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn()
  }
};

jest.mock('../database/prisma-client', () => ({
  prisma: mockPrisma
}));

import { PrismaTemplateRepository } from './prisma-template.repository';

describe('PrismaTemplateRepository', () => {
  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'tpl-1',
    name: 'order-confirmed',
    type: 'ORDER',
    channel: 'email',
    subject: 'Order {{orderId}}',
    bodyTemplate: 'Hello {{name}}, order {{orderId}} is confirmed.',
    variables: ['name', 'orderId'],
    isActive: true,
    version: 1,
    createdBy: 'system',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findById and findByName return mapped domain template or null', async () => {
    const repo = new PrismaTemplateRepository();
    mockPrisma.notificationTemplate.findUnique
      .mockResolvedValueOnce(makeRow())
      .mockResolvedValueOnce(makeRow({ id: 'tpl-2', name: 'shipment-created' }))
      .mockResolvedValueOnce(null);

    const byId = await repo.findById('tpl-1');
    const byName = await repo.findByName('shipment-created');
    const missing = await repo.findById('missing');

    expect(mockPrisma.notificationTemplate.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 'tpl-1' }
    });
    expect(mockPrisma.notificationTemplate.findUnique).toHaveBeenNthCalledWith(2, {
      where: { name: 'shipment-created' }
    });
    expect(byId).toBeInstanceOf(NotificationTemplate);
    expect(byName?.id).toBe('tpl-2');
    expect(missing).toBeNull();
  });

  it('creates and updates template with expected persistence payload', async () => {
    const repo = new PrismaTemplateRepository();
    const template = NotificationTemplate.create({
      id: 'tpl-3',
      name: 'welcome',
      type: 'USER',
      channel: 'email',
      subject: 'Welcome {{name}}',
      bodyTemplate: 'Hi {{name}}!',
      createdBy: 'admin'
    });

    mockPrisma.notificationTemplate.create.mockResolvedValue(makeRow({ id: 'tpl-3', name: 'welcome' }));
    const created = await repo.create(template);

    expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'tpl-3',
        name: 'welcome',
        createdBy: 'admin'
      })
    });
    expect(created).toBeInstanceOf(NotificationTemplate);

    const updatedTemplate = template.createVersion('Updated body for {{name}}');
    mockPrisma.notificationTemplate.update.mockResolvedValue(makeRow({ id: 'tpl-3', version: 2 }));
    const updated = await repo.update(updatedTemplate);

    expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl-3' },
      data: expect.objectContaining({
        version: 2,
        updatedAt: expect.any(Date)
      })
    });
    expect(updated.version).toBe(2);
  });

  it('deletes template and returns mapped active/channel-filtered lists', async () => {
    const repo = new PrismaTemplateRepository();
    mockPrisma.notificationTemplate.findMany
      .mockResolvedValueOnce([makeRow({ id: 'tpl-4' })])
      .mockResolvedValueOnce([makeRow({ id: 'tpl-5' }), makeRow({ id: 'tpl-6' })]);

    const byChannel = await repo.findByChannel('email');
    const active = await repo.findActive();
    await repo.delete('tpl-4');

    expect(mockPrisma.notificationTemplate.findMany).toHaveBeenNthCalledWith(1, {
      where: { channel: 'email', isActive: true }
    });
    expect(mockPrisma.notificationTemplate.findMany).toHaveBeenNthCalledWith(2, {
      where: { isActive: true }
    });
    expect(byChannel).toHaveLength(1);
    expect(active).toHaveLength(2);
    expect(active[0]).toBeInstanceOf(NotificationTemplate);
    expect(mockPrisma.notificationTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl-4' } });
  });
});

