"use client";

import Link from "next/link";

import { DeleteTripDialog } from "@/components/trips/delete-trip-dialog";
import { RouteStrip } from "@/components/trips/route-strip";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import { formatMoney } from "@/lib/format";
import type { TripSummary } from "@/lib/presence";
import { tripCostCents, tripRoute } from "@/lib/trip-route";
import { cn } from "@/lib/utils";

export function TripCard({
  trip,
  profile,
  summary,
  itemCount,
  dimmed,
  onHighlight,
}: {
  trip: TripWithRoute;
  profile: Profile;
  summary: TripSummary;
  itemCount: number;
  dimmed: boolean;
  onHighlight: (tripId: string | null) => void;
}) {
  const stops = tripRoute(trip);
  const total = tripCostCents(trip);

  return (
    // The whole card is the link — the stretched pseudo-element below covers
    // it — while the delete button sits above, outside the link's box. A
    // button nested inside an anchor is not valid HTML and breaks the keyboard.
    <article
      onMouseEnter={() => onHighlight(trip.id)}
      onMouseLeave={() => onHighlight(null)}
      className={cn(
        "relative border-b border-line px-5 py-4 transition-opacity hover:bg-surface",
        dimmed && "opacity-40",
        summary.status === "passada" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        {trip.emoji ? (
          <span aria-hidden="true" className="mt-1 text-base leading-none">
            {trip.emoji}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="mt-2 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: trip.color }}
          />
        )}

        <Link
          href={`/app/trips/${trip.id}`}
          onFocus={() => onHighlight(trip.id)}
          onBlur={() => onHighlight(null)}
          className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
        >
          <span className="block truncate font-display text-section font-bold">
            {trip.name}
          </span>
        </Link>

        <div className="relative z-10 -mr-2 -mt-2 shrink-0">
          <DeleteTripDialog
            tripId={trip.id}
            tripName={trip.name}
            stopCount={trip.stops.length}
            itemCount={itemCount}
          />
        </div>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs">
        {summary.timing && (
          <span className={summary.status === "agora" ? "text-accent" : "text-muted"}>
            {summary.timing}
          </span>
        )}
        {summary.timing && summary.period && (
          <span aria-hidden="true" className="text-line">
            ·
          </span>
        )}
        <span className="text-muted">{summary.period ?? "sem datas"}</span>
      </p>

      <RouteStrip stops={stops} color={trip.color} className="mt-4" />

      <div className="mt-4 flex items-baseline gap-4">
        <span className="font-mono text-xs text-muted">
          {stops.length} {stops.length === 1 ? "parada" : "paradas"}
        </span>
        <span className="font-mono text-xs text-ink">
          {formatMoney(total, profile.currency)}
        </span>
      </div>
    </article>
  );
}
