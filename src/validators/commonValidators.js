/**
 * Module 9: Shared Validators and Defect Prevention
 * Owner: P. Sasikanth (25071A66C3)
 *
 * Core validation primitives and sanitizers used across all routes and services.
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Checks if a string is a valid ID (either UUID v4 or 24-character Mongo ObjectId).
 * @param {any} val
 * @returns {boolean}
 */
export function isValidId(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return UUID_V4_REGEX.test(trimmed) || MONGO_OBJECT_ID_REGEX.test(trimmed);
}

/**
 * Checks if a string is a valid UUID format (for backwards compatibility).
 * @param {any} val
 * @returns {boolean}
 */
export function isValidUUID(val) {
  return typeof val === 'string' && (UUID_V4_REGEX.test(val.trim()) || MONGO_OBJECT_ID_REGEX.test(val.trim()));
}

/**
 * Validates a string is non-empty and within bounds.
 * @param {any} val
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function isNonEmptyString(val, min = 1, max = 500) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.length >= min && trimmed.length <= max;
}

/**
 * Validates HTTP/HTTPS URL syntax without making external network calls.
 * @param {any} val
 * @returns {boolean}
 */
export function isValidUrl(val) {
  if (!val || typeof val !== 'string') return false;
  try {
    const parsed = new URL(val.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates a date string (supports YYYY-MM-DD or standard ISO 8601).
 * @param {any} val
 * @returns {boolean}
 */
export function isValidDate(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const dateObj = new Date(trimmed);
  if (Number.isNaN(dateObj.getTime())) return false;
  // Basic sanity check on reasonable historical/future date bounds (e.g. 1990 to 2050)
  const year = dateObj.getFullYear();
  return year >= 1990 && year <= 2050;
}

/**
 * Standard Application Error with HTTP status code and machine-readable code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'VALIDATION_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
