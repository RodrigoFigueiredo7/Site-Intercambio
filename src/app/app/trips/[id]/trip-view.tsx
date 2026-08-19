"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LegRow } from "@/components/stops/leg-row";
import { StopRow } from "@/components/stops/stop-row";
import { StopSearch } from "@/components/stops/stop-search";
import { RouteStrip } from "@/components/trips/route-strip";
import { Button } from "@/components/ui/button";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import { formatMoney } from "@/lib/format";
import { formatDuration, travelMinutes, tripCostCents, tripRoute } from "@/lib/trip-route";

const TripMap = dynamic(
  () => import("@/components/map/trip-map").then((mod) => mod.TripMap),
  { ssr: false, loading: () => <div className="size-full bg-paper" aria-hidden="true" /> },
);

export function TripView({ trip, profile }: { trip: TripWithRoute; profile: Profile }) {
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const route = tripRoute(trip);
  const lastStop = route.length > 0 ? route[route.length - 1].stop : null;
  const total = tripCostCents(trip);

  // Picking a pin scrolls the list to the stop it belongs to.
  useEffect(() => {
    if (!selectedStopId) return;
    listRef.current
      ?.querySelector(`#parada-${CSS.escape(selectedStopId)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedStopId]);

  return (
    <div className="flex h-dvh flex-col-reverse md:flex-row">
      <aside className="flex min-h-0 flex-1 flex-col border-line md:h-full md:w-[26rem] md:flex-none md:border-r">
        <header className="flex h-16 flex-none items-center gap-1 border-b border-line px-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app" aria-label="Voltar para a base">
              <ArrowLeft />
            </Link>
          </Button>
          <span className="truncate font-display text-section font-bold">
            {trip.emoji ? `${trip.emoji} ` : ""}
            {trip.name}
          </span>
          <span className="ml-auto pr-2 font-mono text-xs text-ink">
            {formatMoney(total, profile.currency)}
          </span>
        </header>

        {route.length > 0 && (
          <div className="flex-none border-b border-line px-5 py-4">
            <RouteStrip stops={route} color={trip.color} />
          </div>
        )}

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {route.length === 0 ? (
            <div className="px-5 py-8">
              <p className="label-caps">Nenhuma parada ainda</p>
              <p className="mt-3 text-base text-ink">
                Use a busca no canto do mapa para adicionar a primeira cidade. A ordem da
                rota vem das datas — não existe arrastar para reordenar.
              </p>
            </div>
          ) : (
            route.map((entry, index) => (
              <div key={entry.stop.id}>
                {entry.legIn && index > 0 && (
                  <LegRow
                    leg={entry.legIn}
                    tripId={trip.id}
                    currency={profile.currency}
                    durationLabel={formatDuration(
                      travelMinutes(route[index - 1].stop, entry.stop),
                    )}
                  />
                )}
                <StopRow
                  stop={entry.stop}
                  tripId={trip.id}
                  currency={profile.currency}
                  selected={entry.stop.id === selectedStopId}
                  onSelect={setSelectedStopId}
                />
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="relative isolate h-[45dvh] flex-none md:h-full md:flex-1">
        <TripMap
          route={route}
          selectedStopId={selectedStopId}
          onSelectStop={setSelectedStopId}
        />
        <StopSearch
          tripId={trip.id}
          lastStop={lastStop}
          fallbackFrom={
            trip.start_date ? `${trip.start_date}T12:00:00Z` : new Date().toISOString()
          }
        />
      </div>
    </div>
  );
}
