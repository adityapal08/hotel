/**
 * Utility functions and common helper methods across the application.
 */

/**
 * Formats a number as currency (default USD).
 * @param {number} amount
 * @param {string} [currency='USD']
 * @param {string} [locale='en-US']
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Formats a date string or timestamp.
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @param {string} [locale='en-US']
 * @returns {string}
 */
export function formatDate(date, options = {}, locale = 'en-US') {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
}

/**
 * Truncates text to a specified character limit.
 * @param {string} str
 * @param {number} length
 * @returns {string}
 */
export function truncateText(str, length = 100) {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}
