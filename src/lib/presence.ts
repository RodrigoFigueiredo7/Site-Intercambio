import type { Stop, Trip, TripWithRoute } from "@/lib/db/types";
import { formatDateRange, formatDayCount } from "@/lib/format";
import { daysBetween, localDay, tripRoute } from "@/lib/trip-route";
import { instantFromLocal } from "@/lib/tz";

/**
 * Past, present and future, and the answer to the question in the title.
 *
 * Nothing here is stored. A trip is happening because the clock says so, and
 * the person is in Prague because a stop's window contains this instant. The
 * moment is always passed in rather than read from `Date.now()` inside, so
 * every one of these can be checked against a fixed clock.
 */

export type TripStatus = "agora" | "futura" | "passada" | "sem-datas";

export type TripWindow = { startsAt: string; endsAt: string };

/**
 * The trip's real window: first arrival to last departure.
 *
 * The dates typed when the trip was created are only the calendar frame, so
 * they are the fallback — used while the trip still has no stop to speak for
 * it, read on the base city's clock because that is where the planning happens.
 */
export function tripWindow(trip: TripWithRoute, homeTz: string): TripWindow | null {
  if (trip.stops.length > 0) {
    const arrivals = trip.stops.map((stop) => stop.arrive_at).sort();
    const departures = trip.stops.map((stop) => stop.depart_at).sort();
    return { startsAt: arrivals[0], endsAt: departures[departures.length - 1] };
  }

  if (!trip.start_date || !trip.end_date) return null;
  return {
    startsAt: instantFromLocal(`${trip.start_date}T00:00`, homeTz),
    endsAt: instantFromLocal(`${trip.end_date}T23:59`, homeTz),
  };
}

export function tripStatus(trip: TripWithRoute, homeTz: string, now: Date): TripStatus {
  const window = tripWindow(trip, homeTz);
  if (!window) return "sem-datas";

  const instant = now.getTime();
  if (instant < Date.parse(window.startsAt)) return "futura";
  if (instant > Date.parse(window.endsAt)) return "passada";
  return "agora";
}

/** "dia 3 de 9" for a trip under way, counted on the base city's calendar. */
export function tripProgress(
  trip: TripWithRoute,
  homeTz: string,
  now: Date,
): { day: number; total: number } | null {
  const window = tripWindow(trip, homeTz);
  if (!window) return null;

  const total = daysBetween(localDay(window.startsAt, homeTz), localDay(window.endsAt, homeTz)) + 1;
  const day = daysBetween(localDay(window.startsAt, homeTz), localDay(now.toISOString(), homeTz)) + 1;
  if (day < 1 || day > total) return null;
  return { day, total };
}

export type Presence =
  /** Inside a stop's window: the plain answer. */
  | { kind: "parado"; trip: Trip; stop: Stop; nightsSoFar: number }
  /** Between leaving one stop and reaching the next. */
  | { kind: "movendo"; trip: Trip; from: Stop; to: Stop }
  /** No trip is running: at the base, with whatever comes next. */
  | { kind: "base"; next: { trip: Trip; stop: Stop } | null };

export function presence(trips: TripWithRoute[], now: Date): Presence {
  const instant = now.getTime();

  for (const trip of trips) {
    const route = tripRoute(trip);

    for (const { stop } of route) {
      if (Date.parse(stop.arrive_at) <= instant && instant <= Date.parse(stop.depart_at)) {
        return {
          kind: "parado",
          trip,
          stop,
          nightsSoFar: daysBetween(
            localDay(stop.arrive_at, stop.tz),
            localDay(now.toISOString(), stop.tz),
          ),
        };
      }
    }

    for (let i = 1; i < route.length; i++) {
      const from = route[i - 1].stop;
      const to = route[i].stop;
      if (Date.parse(from.depart_at) < instant && instant < Date.parse(to.arrive_at)) {
        return { kind: "movendo", trip, from, to };
      }
    }
  }

  // Nothing under way. The next arrival anywhere is what the base screen owes
  // the reader, so find the earliest one still ahead.
  let next: { trip: Trip; stop: Stop } | null = null;
  for (const trip of trips) {
    for (const stop of trip.stops) {
      if (Date.parse(stop.arrive_at) <= instant) continue;
      if (!next || stop.arrive_at < next.stop.arrive_at) next = { trip, stop };
    }
  }

  return { kind: "base", next };
}

/**
 * Everything a trip card needs to say when it happens, already in words.
 * Built on the server so the card itself never has to know what time it is —
 * a client component that reads the clock renders one thing on the server and
 * another in the browser.
 */
export type TripSummary = {
  status: TripStatus;
  /** "6 – 12 nov", from the stops when there are stops. */
  period: string | null;
  /** "dia 3 de 7", "em 12 dias", "há 3 dias". */
  timing: string | null;
};

export function tripSummary(
  trip: TripWithRoute,
  homeTz: string,
  now: Date,
): TripSummary {
  const status = tripStatus(trip, homeTz, now);
  const window = tripWindow(trip, homeTz);

  const period = window
    ? formatDateRange(localDay(window.startsAt, homeTz), localDay(window.endsAt, homeTz))
    : null;

  if (!window) return { status, period, timing: null };

  const today = localDay(now.toISOString(), homeTz);

  if (status === "agora") {
    const progress = tripProgress(trip, homeTz, now);
    return {
      status,
      period,
      timing: progress ? `dia ${progress.day} de ${progress.total}` : null,
    };
  }

  const reference = status === "futura" ? window.startsAt : window.endsAt;
  return {
    status,
    period,
    timing: formatDayCount(daysBetween(today, localDay(reference, homeTz))),
  };
}
