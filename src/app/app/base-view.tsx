"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { MapShell } from "@/components/map/map-shell";
import { NewTripDialog } from "@/components/trips/new-trip-dialog";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import { signOut } from "@/lib/actions/auth";

export function BaseView({
  profile,
  trips,
}: {
  profile: Profile;
  trips: TripWithRoute[];
}) {
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);

  const empty = trips.length === 0;

  return (
    <div className="flex h-dvh flex-col-reverse md:flex-row">
      {/* Panel — beside the map on desktop, below it on a phone. */}
      <aside className="flex min-h-0 flex-1 flex-col border-line md:h-full md:w-[22rem] md:flex-none md:border-r lg:w-[24rem]">
        <header className="flex h-16 flex-none items-center justify-between border-b border-line px-5">
          <span className="font-display text-section font-bold">Rota</span>
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
          {empty ? (
            <div className="px-5 py-8">
              <p className="label-caps">Comece por aqui</p>
              <p className="mt-3 text-base text-ink">
                Sua base está em {profile.home_city}. Crie a primeira viagem para começar
                a desenhar o mapa.
              </p>
            </div>
          ) : (
            <>
              <p className="label-caps px-5 pb-2 pt-5">
                {trips.length} {trips.length === 1 ? "viagem" : "viagens"}
              </p>
              <div className="border-t border-line">
                {trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    profile={profile}
                    dimmed={highlightedTripId !== null && highlightedTripId !== trip.id}
                    onHighlight={setHighlightedTripId}
                  />
                ))}
              </div>
            </>
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
          highlightedTripId={highlightedTripId}
          focusedTripId={null}
        />
      </div>
    </div>
  );
}
