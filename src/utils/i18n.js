const fs = require('fs');
const path = require('path');

const locales = {};

// Load all translation files
const i18nDir = path.join(__dirname, '../bot/i18n');
fs.readdirSync(i18nDir).forEach(file => {
  if (file.endsWith('.json')) {
    const lang = file.replace('.json', '');
    locales[lang] = require(path.join(i18nDir, file));
  }
});

/**
 * Get translation based on Discord locale
 * Discord locales: en-US, en-GB, ro, es-ES, etc.
 */
function t(locale, key, replacements = {}) {
  // Normalize locale (en-US → en, ro → ro)
  let lang = 'en';
  if (locale) {
    const short = locale.split('-')[0].toLowerCase();
    if (locales[short]) lang = short;
    else if (locales[locale]) lang = locale;
  }

  // Navigate nested keys (e.g. "whitelist.success")
  const keys = key.split('.');
  let text = locales[lang] || locales['en'];
  
  for (const k of keys) {
    if (text && text[k] !== undefined) {
      text = text[k];
    } else {
      // Fallback to English
      text = locales['en'];
      for (const k2 of keys) {
        text = text?.[k2];
      }
      break;
    }
  }

  if (typeof text !== 'string') {
    return key; // Return key if translation not found
  }

  // Replace placeholders {user}, {days} etc.
  return text.replace(/\{(\w+)\}/g, (_, name) => {
    return replacements[name] !== undefined ? replacements[name] : `{${name}}`;
  });
}

module.exports = { t, locales };
