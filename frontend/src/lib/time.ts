import { parseISO } from 'date-fns';

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS" with no timezone suffix.
export function parseStoredTime(value: string): Date {
  if (!value) return new Date(NaN);
  if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
    return parseISO(value);
  }
  return parseISO(value.replace(' ', 'T') + 'Z');
}
