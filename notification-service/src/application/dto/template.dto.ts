/**
 * Template DTOs
 */

export type TemplateChannelDto = 'email' | 'sms' | 'push' | 'in-app';

export interface CreateTemplateDto {
  name: string;
  type: string;
  channel: TemplateChannelDto;
  subject: string;
  bodyTemplate: string;
  variables?: string[];
  createdBy: string;
}

export interface UpdateTemplateDto {
  name?: string;
  subject?: string;
  bodyTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface TemplateResponseDto {
  id: string;
  name: string;
  type: string;
  channel: TemplateChannelDto;
  subject: string;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderTemplateDto {
  templateId: string;
  variables: Record<string, string>;
}

export interface RenderTemplateResponseDto {
  subject: string;
  body: string;
}
