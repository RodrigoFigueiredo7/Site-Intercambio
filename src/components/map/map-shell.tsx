"use client";

import dynamic from "next/dynamic";

import type { Profile, TripWithRoute } from "@/lib/db/types";

/**
 * Leaflet reaches for `window` at import time, so the map may only ever be
 * loaded in the browser.
 */
const WorldMap = dynamic(
  () => import("@/components/map/world-map").then((mod) => mod.WorldMap),
  {
    ssr: false,
    loading: () => <div className="size-full bg-paper" aria-hidden="true" />,
  },
);

export function MapShell(props: {
  profile: Profile;
  trips: TripWithRoute[];
  highlightedTripId: string | null;
  focusedTripId: string | null;
}) {
  return <WorldMap {...props} />;
}
