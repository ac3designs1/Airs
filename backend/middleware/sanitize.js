/**
 * Input sanitization helpers — strip HTML/script tags and limit length
 * to prevent stored XSS attacks on any free-text field saved to SQLite.
 *
 * All SQLite queries already use prepared statements (no SQL injection risk).
 * This module adds XSS protection on top of that.
 */

const HTML_RE = /<[^>]*>/g;
const NULL_BYTES_RE = /\0/g;

/**
 * Clean a single string value.
 * - Removes HTML / script tags
 * - Strips null bytes
 * - Trims whitespace
 * - Enforces max length
 *
 * Returns null for non-strings or empty strings after cleaning.
 */
function sanitize(value, maxLen = 2048) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    // Allow numbers/booleans through as-is (they can't carry XSS)
    return value;
  }
  const cleaned = value
    .replace(NULL_BYTES_RE, '')
    .replace(HTML_RE, '')
    .trim()
    .slice(0, maxLen);
  return cleaned.length === 0 ? null : cleaned;
}

/**
 * Recursively sanitize all string fields in a plain object.
 * Pass the object returned from req.body — does NOT mutate it, returns a new object.
 */
function sanitizeBody(obj, fieldLimits = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const limit = fieldLimits[key] ?? 2048;
    out[key] = sanitize(val, limit);
  }
  return out;
}

/**
 * Express middleware — replaces req.body with a sanitized copy.
 * Optionally pass fieldLimits: { fieldName: maxLength } for per-field caps.
 */
function sanitizeMiddleware(fieldLimits = {}) {
  return (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeBody(req.body, fieldLimits);
    }
    next();
  };
}

module.exports = { sanitize, sanitizeBody, sanitizeMiddleware };
