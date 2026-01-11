// src/localization/IMLocalization.js

/**
 * Minimal localization helper.
 * If you later add real i18n, you can replace this implementation,
 * but keep the exported function name (IMLocalized) because the app imports it.
 */
export const IMLocalized = (text) => {
  // supports strings like: IMLocalized('Upload failed. Please try again.')
  // and also supports falsy values gracefully
  return typeof text === 'string' ? text : '';
};
