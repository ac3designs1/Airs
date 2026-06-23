// SQLite datetime('now') is UTC without a timezone suffix.
// Always store ISO-8601 UTC strings so clients parse consistently.

function utcNow() {
  return new Date().toISOString();
}

// Parse shift timestamps stored as ISO or legacy SQLite UTC strings.
function parseStoredUtc(value) {
  if (!value) return new Date(NaN);
  if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  return new Date(value.replace(' ', 'T') + 'Z');
}

module.exports = { utcNow, parseStoredUtc };
