module.exports = {
  port: process.env.NODE_PORT || process.env.PORT || 80,

  priorityLangs: ['en', 'de', 'ru', 'it', 'fr', 'es', 'ja', 'uk'],

  defaultLangs: {
    from: 'en',
    to: 'ru'
  },

  dictitonaryLangs: {
    en: ['urbandictionary']
  }
};
