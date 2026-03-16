const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

export const getPlatformBaseUrl = (): string => {
  const baseUrl = process.env.PLATFORM_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  return normalizeBaseUrl(baseUrl);
};

export const getServiceBaseUrl = (serviceName: string): string => {
  return `${getPlatformBaseUrl()}/api/${serviceName}`;
};
