import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BRAND_NAME } from '../constants/brand';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es }
    },
    lng: 'es', // default language
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
      defaultVariables: {
        brand: BRAND_NAME
      }
    }
  });

export default i18n;
