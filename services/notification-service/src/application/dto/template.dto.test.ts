import type {
  CreateTemplateDto,
  RenderTemplateDto,
  RenderTemplateResponseDto,
  TemplateResponseDto,
  UpdateTemplateDto
} from './template.dto';

describe('template DTO contracts', () => {
  it('supports create and update template payloads', () => {
    const createDto: CreateTemplateDto = {
      name: 'order-confirmation-email',
      type: 'ORDER_CONFIRMATION',
      channel: 'email',
      subject: 'Your order is confirmed',
      bodyTemplate: 'Hello {{name}}, your order {{orderId}} is confirmed.',
      variables: ['name', 'orderId'],
      createdBy: 'admin-1'
    };
    const updateDto: UpdateTemplateDto = {
      subject: 'Order confirmed successfully',
      isActive: true
    };

    expect(createDto.channel).toBe('email');
    expect(updateDto.isActive).toBe(true);
  });

  it('supports response and render payloads', () => {
    const response: TemplateResponseDto = {
      id: 'tpl-1',
      name: 'order-confirmation-email',
      type: 'ORDER_CONFIRMATION',
      channel: 'email',
      subject: 'Your order is confirmed',
      bodyTemplate: 'Hello {{name}}',
      variables: ['name'],
      isActive: true,
      version: 3,
      createdBy: 'admin-1',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-02T00:00:00.000Z')
    };
    const renderRequest: RenderTemplateDto = {
      templateId: 'tpl-1',
      variables: { name: 'Amina' }
    };
    const renderResponse: RenderTemplateResponseDto = {
      subject: 'Your order is confirmed',
      body: 'Hello Amina'
    };

    expect(response.version).toBe(3);
    expect(renderRequest.variables.name).toBe('Amina');
    expect(renderResponse.body).toContain('Amina');
  });
});
