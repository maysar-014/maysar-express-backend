import { Entity } from '../interfaces';

export type TemplateChannel = 'email' | 'sms' | 'push' | 'in-app';

/**
 * NotificationTemplate Entity
 * Template for notifications with variable substitution
 */
export class NotificationTemplate implements Entity {
  public readonly id: string;
  public readonly name: string;
  public readonly type: string;
  public readonly channel: TemplateChannel;
  public readonly subject: string;
  public readonly bodyTemplate: string;
  public readonly variables: string[];
  public readonly isActive: boolean;
  public readonly version: number;
  public readonly createdBy: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: {
    id: string;
    name: string;
    type: string;
    channel: TemplateChannel;
    subject: string;
    bodyTemplate: string;
    variables: string[];
    isActive: boolean;
    version: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.channel = props.channel;
    this.subject = props.subject;
    this.bodyTemplate = props.bodyTemplate;
    this.variables = props.variables;
    this.isActive = props.isActive;
    this.version = props.version;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    name: string;
    type: string;
    channel: TemplateChannel;
    subject: string;
    bodyTemplate: string;
    variables?: string[];
    createdBy: string;
  }): NotificationTemplate {
    const now = new Date();
    const variables = props.variables ?? NotificationTemplate.extractVariables(props.bodyTemplate);
    return new NotificationTemplate({
      ...props,
      variables,
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now
    });
  }

  private static extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const vars = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(template)) !== null) {
      vars.add(m[1]!);
    }
    return Array.from(vars);
  }

  render(variables: Record<string, string>): { subject: string; body: string } {
    let subject = this.subject;
    let body = this.bodyTemplate;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value ?? '');
      body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value ?? '');
    }
    return { subject, body };
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.id?.trim()) errors.push('Template ID is required');
    if (!this.name?.trim()) errors.push('Template name is required');
    if (!this.bodyTemplate?.trim()) errors.push('Body template is required');
    if (this.version < 1) errors.push('Version must be at least 1');
    return { isValid: errors.length === 0, errors };
  }

  activate(): NotificationTemplate {
    return new NotificationTemplate({
      ...this,
      isActive: true,
      updatedAt: new Date()
    });
  }

  deactivate(): NotificationTemplate {
    return new NotificationTemplate({
      ...this,
      isActive: false,
      updatedAt: new Date()
    });
  }

  createVersion(newBodyTemplate: string, newSubject?: string): NotificationTemplate {
    const variables = NotificationTemplate.extractVariables(newBodyTemplate);
    return new NotificationTemplate({
      ...this,
      bodyTemplate: newBodyTemplate,
      subject: newSubject ?? this.subject,
      variables,
      version: this.version + 1,
      updatedAt: new Date()
    });
  }
}
