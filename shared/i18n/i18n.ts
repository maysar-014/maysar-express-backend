import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

const localesPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'locales/{{lng}}/{{ns}}.json')
  : path.join(__dirname, 'locales/{{lng}}/{{ns}}.json');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    backend: {
      loadPath: localesPath,
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw'],
    ns: ['common', 'payment', 'notification', 'compliance'],
    defaultNS: 'common',
    detection: {
      order: ['header'],
      caches: false,
    },
  });

export { i18next };
export const i18nextMiddleware = middleware;
export const t = (key: string, options?: any) => i18next.t(key, options);
