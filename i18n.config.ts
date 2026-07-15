import en from './i18n/locales/en.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'en',
  messages: { en },
  missingWarn: false,
  fallbackWarn: false,
}))
