import type { Leg, Stop, TransportMode, TripWithRoute } from "@/lib/db/types";

export type RouteStop = {
  stop: Stop;
  /** The travel that arrives at this stop. Null for the first one. */
  legIn: Leg | null;
};

/** YYYY-MM-DD as read on a clock in that timezone. */
function localDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function daysBetween(fromDay: string, toDay: string): number {
  return Math.round(
    (Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * Midnights crossed inside the stop, counted on the city's own clock.
 * A day trip is zero. Arriving at 01:30 is one night fewer than a naive
 * UTC count would give — a whole hotel night.
 */
export function nights(stop: Stop): number {
  return daysBetween(localDay(stop.arrive_at, stop.tz), localDay(stop.depart_at, stop.tz));
}

/** The route, in the only order that exists: by arrival. */
export function tripRoute(trip: TripWithRoute): RouteStop[] {
  const ordered = [...trip.stops].sort((a, b) => a.arrive_at.localeCompare(b.arrive_at));
  const active = trip.legs.filter((leg) => leg.is_active);

  return ordered.map((stop, index) => ({
    stop,
    legIn:
      index === 0
        ? null
        : (active.find(
            (leg) => leg.from_stop_id === ordered[index - 1].id && leg.to_stop_id === stop.id,
          ) ?? null),
  }));
}

/** What the leg is drawn and coloured as: my choice, else the suggestion. */
export function legMode(leg: Leg | null): TransportMode {
  return leg?.mode ?? leg?.suggested_mode ?? "train";
}

/** Travel plus lodging. Only active legs count. */
export function tripCostCents(trip: TripWithRoute): number {
  const travel = trip.legs
    .filter((leg) => leg.is_active)
    .reduce((sum, leg) => sum + leg.cost_cents, 0);
  const lodging = trip.stops.reduce((sum, stop) => sum + stop.lodging_cost_cents, 0);
  return travel + lodging;
}

/** Inclusive day count of the trip's calendar frame. */
export function tripDayCount(trip: { start_date: string | null; end_date: string | null }) {
  if (!trip.start_date || !trip.end_date) return null;
  return daysBetween(trip.start_date, trip.end_date) + 1;
}
