import { Request, Response } from 'express';
import { CreateTemplateUseCase } from '../../application/use-cases/create-template.use-case';
import { INotificationTemplateRepository } from '../../domain/repositories';
import { NotificationMapper } from '../../application/mappers/notification-mapper';
import { NotificationTemplate } from '../../domain/entities/notification-template.entity';
import { NotificationValidationError, TemplateNotFoundError } from '../../domain/errors/notification.errors';

export class TemplateController {
  constructor(
    private createTemplateUseCase: CreateTemplateUseCase,
    private templateRepository: INotificationTemplateRepository
  ) {}

  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const dto = { ...req.body, createdBy: req.headers['x-user-id'] as string || 'system' };
      const template = await this.createTemplateUseCase.execute(dto);
      res.status(201).json({
        success: true,
        data: NotificationMapper.templateToResponseDto(template),
        message: 'Template created'
      });
    } catch (error) {
      if (error instanceof NotificationValidationError) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
        return;
      }
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create template' }
      });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await this.templateRepository.findById(id);
      if (!template) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
        return;
      }
      res.status(200).json({
        success: true,
        data: NotificationMapper.templateToResponseDto(template)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get template' }
      });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body as Partial<{ name: string; subject: string; bodyTemplate: string; variables: string[]; isActive: boolean }>;
      const existing = await this.templateRepository.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
        return;
      }
      const updated = new NotificationTemplate({
        id: existing.id,
        name: updates.name ?? existing.name,
        type: existing.type,
        channel: existing.channel,
        subject: updates.subject ?? existing.subject,
        bodyTemplate: updates.bodyTemplate ?? existing.bodyTemplate,
        variables: updates.variables ?? existing.variables,
        isActive: updates.isActive ?? existing.isActive,
        version: existing.version,
        createdBy: existing.createdBy,
        createdAt: existing.createdAt,
        updatedAt: new Date()
      });
      const saved = await this.templateRepository.update(updated);
      res.status(200).json({
        success: true,
        data: NotificationMapper.templateToResponseDto(saved),
        message: 'Template updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update template' }
      });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await this.templateRepository.findById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
        return;
      }
      await this.templateRepository.delete(id);
      res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete template' }
      });
    }
  }

  async renderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { variables } = req.body as { variables: Record<string, string> };
      const template = await this.templateRepository.findById(id);
      if (!template) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
        return;
      }
      const { subject, body } = template.render(variables ?? {});
      res.status(200).json({
        success: true,
        data: { subject, body }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to render template' }
      });
    }
  }
}
