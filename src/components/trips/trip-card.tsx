"use client";

import { RouteStrip } from "@/components/trips/route-strip";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import { formatDateRange, formatMoney } from "@/lib/format";
import { tripCostCents, tripDayCount, tripStops } from "@/lib/trip-route";
import { cn } from "@/lib/utils";

export function TripCard({
  trip,
  profile,
  dimmed,
  onHighlight,
  onFocusTrip,
}: {
  trip: TripWithRoute;
  profile: Profile;
  dimmed: boolean;
  onHighlight: (tripId: string | null) => void;
  onFocusTrip: (tripId: string) => void;
}) {
  const stops = tripStops(trip);
  const days = tripDayCount(trip);
  const period = formatDateRange(trip.start_date, trip.end_date);
  const total = tripCostCents(trip);

  return (
    <button
      type="button"
      onMouseEnter={() => onHighlight(trip.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(trip.id)}
      onBlur={() => onHighlight(null)}
      onClick={() => onFocusTrip(trip.id)}
      className={cn(
        "w-full border-b border-line px-5 py-4 text-left transition-opacity hover:bg-surface",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-baseline gap-2">
        {trip.emoji ? (
          <span aria-hidden="true" className="text-base leading-none">
            {trip.emoji}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="size-2 shrink-0 translate-y-[-1px] rounded-full"
            style={{ backgroundColor: trip.color }}
          />
        )}
        <span className="font-display text-section font-bold">{trip.name}</span>
      </div>

      {period && <p className="mt-1 font-mono text-xs text-muted">{period}</p>}

      <RouteStrip stops={stops} color={trip.color} className="mt-4" />

      <div className="mt-4 flex items-baseline gap-4">
        <span className="font-mono text-xs text-muted">
          {days === null ? "sem datas" : `${days} ${days === 1 ? "dia" : "dias"}`}
        </span>
        <span className="font-mono text-xs text-ink">
          {formatMoney(total, profile.currency)}
        </span>
      </div>
    </button>
  );
}
