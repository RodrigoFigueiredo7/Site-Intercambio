import type { Item, Leg, Stop, TripWithRoute } from "@/lib/db/types";
import { tripRoute } from "@/lib/trip-route";
import { instantFromLocal } from "@/lib/tz";

/**
 * A single overnight ride is at most this long. Anything longer between two
 * stops is not a night train — it is a gap in the plan, and the day deserves
 * the warning rather than a reassuring "no room needed".
 */
const MAX_OVERNIGHT_HOURS = 24;

/**
 * The Days tab is entirely derived. Which city a day belongs to comes from the
 * stops, never from anything typed — a stop covers every calendar day from the
 * one it arrives on to the one it leaves on, read on that city's own clock.
 */

export type DayPlace =
  | { kind: "in"; stop: Stop }
  /** Every city touched that day, in order — a day trip in the middle counts. */
  | { kind: "moving"; stops: Stop[] }
  | { kind: "transit"; from: Stop; to: Stop }
  | { kind: "unknown" };

export type DayNight =
  | { kind: "stop"; stop: Stop }
  /** Asleep on a night train or bus: no room, and no nightly rate. */
  | { kind: "transit"; from: Stop; to: Stop; leg: Leg | null }
  /** The last day: you leave, so there is no night to warn about. */
  | { kind: "trip-ends" }
  | { kind: "none" };

export type TripDay = {
  date: string;
  index: number;
  total: number;
  place: DayPlace;
  night: DayNight;
  items: Item[];
};

function localDay(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function shiftDay(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The instant the calendar day ends, on the clock of the given zone. */
function midnightAfter(date: string, tz: string): number {
  return Date.parse(instantFromLocal(`${shiftDay(date, 1)}T00:00`, tz));
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = shiftDay(d, 1)) days.push(d);
  return days;
}

/**
 * The calendar the tab draws. The trip dates are the frame; when they are
 * missing, the stops define it. Stops falling outside the frame are still
 * included, so nothing a person entered can silently disappear.
 */
export function tripDays(trip: TripWithRoute, items: Item[]): TripDay[] {
  const route = tripRoute(trip);
  const spans = route.map(({ stop }) => ({
    stop,
    from: localDay(stop.arrive_at, stop.tz),
    to: localDay(stop.depart_at, stop.tz),
  }));

  const candidates = [
    ...(trip.start_date ? [trip.start_date] : []),
    ...(trip.end_date ? [trip.end_date] : []),
    ...spans.flatMap((span) => [span.from, span.to]),
    ...items.map((item) => item.day),
  ].sort();

  if (candidates.length === 0) return [];

  const dates = eachDay(candidates[0], candidates[candidates.length - 1]);

  return dates.map((date, index) => {
    const here = spans.filter((span) => span.from <= date && date <= span.to);

    let place: DayPlace = { kind: "unknown" };
    if (here.length === 1) {
      place = { kind: "in", stop: here[0].stop };
    } else if (here.length > 1) {
      place = { kind: "moving", stops: here.map((span) => span.stop) };
    } else {
      // Between two stops with nothing covering the day: a long crossing.
      for (let i = 1; i < spans.length; i++) {
        if (spans[i - 1].to < date && date < spans[i].from) {
          place = { kind: "transit", from: spans[i - 1].stop, to: spans[i].stop };
          break;
        }
      }
    }

    // The night that starts on this day.
    const lastDeparture = spans.length > 0 ? spans[spans.length - 1].to : null;
    let night: DayNight = lastDeparture && date >= lastDeparture
      ? { kind: "trip-ends" }
      : { kind: "none" };
    const sleeping = spans.find((span) => span.from <= date && shiftDay(date, 1) <= span.to);

    if (sleeping) {
      night = { kind: "stop", stop: sleeping.stop };
    } else if (night.kind !== "trip-ends") {
      for (let i = 1; i < route.length; i++) {
        const from = route[i - 1].stop;
        const to = route[i].stop;
        const leaves = Date.parse(from.depart_at);
        const lands = Date.parse(to.arrive_at);
        const boundary = midnightAfter(date, from.tz);
        const overnight = lands - leaves <= MAX_OVERNIGHT_HOURS * 3_600_000;

        if (overnight && leaves < boundary && boundary < lands) {
          night = { kind: "transit", from, to, leg: route[i].legIn };
          break;
        }
      }
    }

    return {
      date,
      index: index + 1,
      total: dates.length,
      place,
      night,
      items: items
        .filter((item) => item.day === date)
        .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99")),
    };
  });
}
