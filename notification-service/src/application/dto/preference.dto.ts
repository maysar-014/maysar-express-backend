/**
 * Preference DTOs
 */

export type PreferenceChannelDto = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationCategoryDto = 'marketing' | 'transactional' | 'system';

export interface QuietHoursDto {
  start: string; // HH:mm
  end: string;
  timezone?: string;
}

export interface UpdatePreferenceDto {
  enabled?: boolean;
  categories?: Partial<Record<NotificationCategoryDto, boolean>>;
  quietHours?: QuietHoursDto;
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export interface PreferenceResponseDto {
  id: string;
  userId: string;
  channel: PreferenceChannelDto;
  enabled: boolean;
  categories: Record<NotificationCategoryDto, boolean>;
  quietHours?: QuietHoursDto;
  frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  createdAt: Date;
  updatedAt: Date;
}
