import type { Leg, Place, TripWithRoute } from "@/lib/db/types";

export type Stop = {
  place: Place;
  /** The leg that arrives at this stop. Null for the first stop of a trip. */
  arrivedBy: Leg | null;
};

function byDeparture(a: Leg, b: Leg) {
  const dateA = a.depart_date ?? "";
  const dateB = b.depart_date ?? "";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return (a.depart_time ?? "").localeCompare(b.depart_time ?? "");
}

/**
 * Walks a trip's legs in departure order and returns the stops in sequence.
 * Legs are the source of truth for the order — `places.position` only breaks
 * ties for cities that no leg touches yet.
 */
export function tripStops(trip: TripWithRoute): Stop[] {
  const byId = new Map(trip.places.map((place) => [place.id, place]));
  const legs = [...trip.legs].sort(byDeparture);

  const stops: Stop[] = [];
  for (const leg of legs) {
    const from = leg.from_place_id ? byId.get(leg.from_place_id) : undefined;
    const to = leg.to_place_id ? byId.get(leg.to_place_id) : undefined;

    if (stops.length === 0 && from) stops.push({ place: from, arrivedBy: null });
    if (to) stops.push({ place: to, arrivedBy: leg });
  }
  return stops;
}

/** Total of every leg in the trip, in cents. */
export function tripCostCents(trip: TripWithRoute): number {
  return trip.legs.reduce((sum, leg) => sum + leg.cost_cents, 0);
}

/** Inclusive day count between the trip dates, or null when a date is missing. */
export function tripDayCount(trip: { start_date: string | null; end_date: string | null }) {
  if (!trip.start_date || !trip.end_date) return null;
  const start = Date.parse(`${trip.start_date}T00:00:00Z`);
  const end = Date.parse(`${trip.end_date}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}
