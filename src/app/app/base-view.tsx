"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { MapShell } from "@/components/map/map-shell";
import { NewTripDialog } from "@/components/trips/new-trip-dialog";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { BRAND_SHORT } from "@/lib/brand";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import type { TripStatus, TripSummary } from "@/lib/presence";
import { signOut } from "@/lib/actions/auth";

/** The three sections, in the order the question is asked. */
const SECTIONS: { status: TripStatus; title: string }[] = [
  { status: "agora", title: "Em curso" },
  { status: "futura", title: "Em breve" },
  { status: "sem-datas", title: "Sem datas ainda" },
  { status: "passada", title: "Já foi" },
];

export function BaseView({
  profile,
  trips,
  summaries,
  itemCounts,
  presence,
}: {
  profile: Profile;
  trips: TripWithRoute[];
  summaries: Record<string, TripSummary>;
  itemCounts: Record<string, number>;
  /** Rendered on the server — it needs the clock, and the clock is not here. */
  presence: React.ReactNode;
}) {
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);

  const empty = trips.length === 0;

  return (
    <div className="flex h-dvh flex-col-reverse md:flex-row">
      {/* Panel — beside the map on desktop, below it on a phone. */}
      <aside className="flex min-h-0 flex-1 flex-col border-line md:h-full md:w-[22rem] md:flex-none md:border-r lg:w-[24rem]">
        <header className="flex h-16 flex-none items-center justify-between border-b border-line px-5">
          <span className="font-display text-section font-bold">{BRAND_SHORT}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/app/perfil" aria-label="Perfil e base">
                <SlidersHorizontal />
              </Link>
            </Button>
            <form action={signOut}>
              <Button variant="ghost" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {presence}

          {empty ? (
            <div className="px-5 py-8">
              <p className="label-caps">Comece por aqui</p>
              <p className="mt-3 text-base text-ink">
                Sua base está em {profile.home_city}. Crie a primeira viagem para começar
                a desenhar o mapa.
              </p>
            </div>
          ) : (
            SECTIONS.map(({ status, title }) => {
              const inSection = trips.filter((trip) => summaries[trip.id]?.status === status);
              if (inSection.length === 0) return null;

              const cards = inSection.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  profile={profile}
                  summary={summaries[trip.id]}
                  itemCount={itemCounts[trip.id] ?? 0}
                  dimmed={highlightedTripId !== null && highlightedTripId !== trip.id}
                  onHighlight={setHighlightedTripId}
                />
              ));

              // What is over is folded away by default: it is the section that
              // grows without limit, and it is not what the screen is for.
              if (status === "passada") {
                return (
                  <details key={status} className="border-t border-line">
                    <summary className="label-caps flex h-11 cursor-pointer list-none items-center px-5 hover:bg-surface">
                      {title} ({inSection.length})
                    </summary>
                    <div className="border-t border-line">{cards}</div>
                  </details>
                );
              }

              return (
                <section key={status}>
                  <p className="label-caps px-5 pb-2 pt-5">
                    {title} ({inSection.length})
                  </p>
                  <div className="border-t border-line">{cards}</div>
                </section>
              );
            })
          )}
        </div>

        <div className="flex-none border-t border-line bg-surface p-4">
          <NewTripDialog tripCount={trips.length} />
        </div>
      </aside>

      {/* Map */}
      <div className="relative isolate h-[45dvh] flex-none md:h-full md:flex-1">
        <MapShell
          profile={profile}
          trips={trips}
          statuses={Object.fromEntries(
            Object.entries(summaries).map(([id, summary]) => [id, summary.status]),
          )}
          highlightedTripId={highlightedTripId}
          focusedTripId={null}
        />
      </div>
    </div>
  );
}
