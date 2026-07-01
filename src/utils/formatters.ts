import i18n from '../i18n';

type DateInput = Date | string;

function toDate(d: DateInput): Date {
  return d instanceof Date ? d : new Date(d);
}

// Maps our two app languages to BCP-47 locale strings for Intl APIs.
// Both locales use 24h time and day-first date order; only the language of
// weekday / month names differs.
function locale(): string {
  return i18n.language === 'en' ? 'en-GB' : 'de-DE';
}

// "Wed, 1 Jul" / "Mi., 1. Jul."
export function fmtWeekdayDate(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

// "Wed, 1 Jul 2026" / "Mi., 1. Jul. 2026"
export function fmtWeekdayDateYear(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// "Wednesday, 1 July" / "Mittwoch, 1. Juli"
export function fmtLongWeekdayDate(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

// "Wednesday, 1 July 2026" / "Mittwoch, 1. Juli 2026"
export function fmtLongWeekdayDateYear(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// "1 Jul" / "1. Jul."
export function fmtShortDate(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

// "July 2026" / "Juli 2026"
export function fmtMonthYear(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

// "Wed" / "Mi."
export function fmtWeekday(d: DateInput): string {
  return toDate(d).toLocaleDateString(locale(), { weekday: 'short' });
}

// "07:30" — same format for both locales (24h forced)
export function fmtTime(d: DateInput): string {
  return toDate(d).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });
}
