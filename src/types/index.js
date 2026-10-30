/**
 * JSDoc Type Definitions and Data Contracts
 * Provides IDE autocompletion and documentation without introducing TypeScript.
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {string} [message]
 * @property {any} [data]
 */

/**
 * @typedef {Object} NavItem
 * @property {string} label
 * @property {string} href
 * @property {string} [icon]
 * @property {boolean} [external]
 */

/**
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} pricePerNight
 * @property {number} capacity
 * @property {string[]} amenities
 * @property {string[]} images
 * @property {boolean} isAvailable
 */
