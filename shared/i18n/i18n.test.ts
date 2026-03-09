import { i18next, i18nextMiddleware, t } from './i18n';

describe('i18n setup', () => {
  it('exports initialized i18next instances and translator', () => {
    expect(i18next).toBeDefined();
    expect(i18nextMiddleware).toBeDefined();
    expect(typeof t('common:missing_key')).toBe('string');
  });

  it('keeps configured fallback language and namespaces', () => {
    const options = i18next.options;
    const fallback = options.fallbackLng;
    const fallbackArray = Array.isArray(fallback) ? fallback : [fallback];

    expect(fallbackArray).toContain('en');
    expect(options.supportedLngs).toEqual(expect.arrayContaining(['en', 'sw']));
    expect(options.ns).toEqual(expect.arrayContaining(['common', 'payment', 'notification', 'compliance']));
    expect(options.defaultNS).toBe('common');
  });
});
