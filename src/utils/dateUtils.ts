// Returns YYYY-MM-DD using the device's local timezone.
// Use this instead of date.toISOString().split('T')[0], which uses UTC and
// produces the wrong date for UTC+ timezones when the Date is at local midnight.
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parses a date-only string (YYYY-MM-DD) as local midnight.
// Plain new Date("2026-07-01") is parsed as UTC midnight by the JS spec,
// which shifts the date back one day in UTC+ timezones.
export function parseDateOnly(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}
