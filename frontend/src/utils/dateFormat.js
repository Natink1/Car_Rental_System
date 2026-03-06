import { format, parseISO } from 'date-fns';

/**
 * Format ISO date string to display format: "Mar 13, 2026" or "13 Mar 2026"
 * Never show raw ISO like 2026-03-13T00:00:00.000000Z
 */
export function formatDisplayDate(isoString, style = 'short') {
  if (!isoString) return '';
  try {
    const date = typeof isoString === 'string' ? parseISO(isoString) : isoString;
    return style === 'long' ? format(date, 'd MMM yyyy') : format(date, 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString) {
  if (!isoString) return '';
  try {
    const date = typeof isoString === 'string' ? parseISO(isoString) : isoString;
    return format(date, 'yyyy-MM-dd');
  } catch {
    return isoString;
  }
}
