import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import tzLookup from "tz-lookup";

/**
 * A stop stores absolute instants plus the city's IANA zone. Everything a
 * person types or reads is wall-clock time in that city; everything the app
 * computes — durations, ordering — is absolute. These four functions are the
 * only border between the two.
 */

export function timezoneFor(lat: number, lng: number): string {
  try {
    return tzLookup(lat, lng);
  } catch {
    return "UTC";
  }
}

/** "2026-10-06T14:00" read on a clock in `tz` → the absolute instant. */
export function instantFromLocal(localValue: string, tz: string): string {
  return fromZonedTime(localValue, tz).toISOString();
}

/** The reverse, in the shape an <input type="datetime-local"> expects. */
export function localInputValue(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd'T'HH:mm");
}

/** For display: "seg, 6 out · 14:00" on the city's own clock. */
export function formatLocal(iso: string, tz: string, pattern = "EEE, d MMM · HH:mm") {
  return formatInTimeZone(new Date(iso), tz, pattern, { locale: ptBR });
}

/** Adds hours to an instant. Absolute, so it survives a DST boundary. */
export function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}

/**
 * Same clock time, N days later, in `tz`. Used for "arrival + 2 nights":
 * two nights means two midnights, not 48 hours, and across a DST change
 * those differ by an hour.
 */
export function addLocalDays(iso: string, days: number, tz: string): string {
  const local = toZonedTime(new Date(iso), tz);
  local.setDate(local.getDate() + days);
  return fromZonedTime(local, tz).toISOString();
}

/** "14:35" on the clock of that city. */
export function localTime(iso: string, tz: string): string {
  return formatInTimeZone(new Date(iso), tz, "HH:mm");
}
