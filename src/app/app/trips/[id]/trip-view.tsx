"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DayCard } from "@/components/days/day-card";
import { PlanImport } from "@/components/import/plan-import";
import { LegRow } from "@/components/stops/leg-row";
import { StopRow } from "@/components/stops/stop-row";
import { StopSearch } from "@/components/stops/stop-search";
import { DeleteTripDialog } from "@/components/trips/delete-trip-dialog";
import { RouteStrip } from "@/components/trips/route-strip";
import { Button } from "@/components/ui/button";
import type { Item, Profile, TripWithRoute } from "@/lib/db/types";
import { tripDays } from "@/lib/days";
import { formatMoney } from "@/lib/format";
import { formatDuration, travelMinutes, tripCostCents, tripRoute } from "@/lib/trip-route";

const TAB_LABEL: Record<Tab, string> = {
  rota: "Rota",
  dias: "Dias",
  texto: "Texto",
};

const TripMap = dynamic(
  () => import("@/components/map/trip-map").then((mod) => mod.TripMap),
  { ssr: false, loading: () => <div className="size-full bg-paper" aria-hidden="true" /> },
);

type Tab = "rota" | "dias" | "texto";

export function TripView({
  trip,
  profile,
  items,
}: {
  trip: TripWithRoute;
  profile: Profile;
  items: Item[];
}) {
  const [tab, setTab] = useState<Tab>("rota");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const route = tripRoute(trip);
  const days = tripDays(trip, items);
  const lastStop = route.length > 0 ? route[route.length - 1].stop : null;
  const total = tripCostCents(trip);

  // Picking a pin scrolls the list to the stop it belongs to.
  useEffect(() => {
    if (!selectedStopId || tab !== "rota") return;
    listRef.current
      ?.querySelector(`#parada-${CSS.escape(selectedStopId)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedStopId, tab]);

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
          <span className="ml-auto font-mono text-xs text-ink">
            {formatMoney(total, profile.currency)}
          </span>
          <DeleteTripDialog
            tripId={trip.id}
            tripName={trip.name}
            stopCount={trip.stops.length}
            itemCount={items.length}
            redirectTo="/app"
          />
        </header>

        {route.length > 0 && (
          <div className="flex-none border-b border-line px-5 py-4">
            <RouteStrip stops={route} color={trip.color} />
          </div>
        )}

        <div
          role="tablist"
          aria-label="Seções da viagem"
          className="flex flex-none border-b border-line"
        >
          {(["rota", "dias", "texto"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`h-11 flex-1 font-mono text-label uppercase tracking-[0.12em] ${
                tab === value
                  ? "border-b-2 border-accent text-ink"
                  : "border-b-2 border-transparent text-muted hover:bg-paper"
              }`}
            >
              {TAB_LABEL[value]}
            </button>
          ))}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {tab === "texto" ? (
            <PlanImport
              tripId={trip.id}
              year={Number((trip.start_date ?? new Date().toISOString()).slice(0, 4))}
              month={trip.start_date ? Number(trip.start_date.slice(5, 7)) : null}
              currency={profile.currency}
            />
          ) : tab === "dias" ? (
            days.length === 0 ? (
              <div className="px-5 py-8">
                <p className="label-caps">Sem dias ainda</p>
                <p className="mt-3 text-base text-ink">
                  Os dias aparecem a partir das datas da viagem e das paradas. Adicione a
                  primeira cidade ou preencha as datas da viagem.
                </p>
              </div>
            ) : (
              days.map((day) => (
                <DayCard
                  key={day.date}
                  day={day}
                  tripId={trip.id}
                  currency={profile.currency}
                />
              ))
            )
          ) : route.length === 0 ? (
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
