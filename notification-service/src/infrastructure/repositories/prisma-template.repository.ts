import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import { INotificationTemplateRepository } from '../../domain/repositories';
import { prisma } from '../database/prisma-client';

function toDomain(row: any): NotificationTemplate {
  const variables = Array.isArray(row.variables) ? row.variables : (row.variables as any) ?? [];
  return new NotificationTemplate({
    id: row.id,
    name: row.name,
    type: row.type,
    channel: row.channel,
    subject: row.subject,
    bodyTemplate: row.bodyTemplate,
    variables,
    isActive: row.isActive,
    version: row.version,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  });
}

export class PrismaTemplateRepository implements INotificationTemplateRepository {
  async findById(id: string): Promise<NotificationTemplate | null> {
    const row = await prisma.notificationTemplate.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByName(name: string): Promise<NotificationTemplate | null> {
    const row = await prisma.notificationTemplate.findUnique({ where: { name } });
    return row ? toDomain(row) : null;
  }

  async create(template: NotificationTemplate): Promise<NotificationTemplate> {
    const row = await prisma.notificationTemplate.create({
      data: {
        id: template.id,
        name: template.name,
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        bodyTemplate: template.bodyTemplate,
        variables: template.variables,
        isActive: template.isActive,
        version: template.version,
        createdBy: template.createdBy
      }
    });
    return toDomain(row);
  }

  async update(template: NotificationTemplate): Promise<NotificationTemplate> {
    const row = await prisma.notificationTemplate.update({
      where: { id: template.id },
      data: {
        name: template.name,
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        bodyTemplate: template.bodyTemplate,
        variables: template.variables,
        isActive: template.isActive,
        version: template.version,
        updatedAt: new Date()
      }
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.notificationTemplate.delete({ where: { id } });
  }

  async findByChannel(channel: string): Promise<NotificationTemplate[]> {
    const rows = await prisma.notificationTemplate.findMany({
      where: { channel, isActive: true }
    });
    return rows.map(toDomain);
  }

  async findActive(): Promise<NotificationTemplate[]> {
    const rows = await prisma.notificationTemplate.findMany({
      where: { isActive: true }
    });
    return rows.map(toDomain);
  }
}
