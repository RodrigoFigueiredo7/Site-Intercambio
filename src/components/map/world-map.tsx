"use client";

import { Fragment, useEffect, useMemo } from "react";
import L from "leaflet";
import {
  AttributionControl,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Profile, TripWithRoute } from "@/lib/db/types";
import { AIR_OR_SEA } from "@/lib/map/colors";
import type { LatLng } from "@/lib/map/geometry";
import { legMode, tripRoute } from "@/lib/trip-route";

const BASE_ZOOM = 5;
/** Wide enough that the whole planet fits on a phone in landscape. */
const MIN_ZOOM = 2;

type Segment = {
  key: string;
  points: LatLng[];
  dashed: boolean;
};

type Branch = {
  tripId: string;
  color: string;
  segments: Segment[];
  /** Base to the first stop, when the trip does not start at the base. */
  approach: LatLng[] | null;
  bounds: LatLng[];
};

function buildBranch(trip: TripWithRoute, base: LatLng): Branch | null {
  const stops = tripRoute(trip);
  if (stops.length === 0) return null;

  // Straight lines from stop to stop: the map reports the route, it does not
  // illustrate a path. Air and sea stay dashed so the mode still reads.
  const segments: Segment[] = [];
  for (let i = 1; i < stops.length; i++) {
    const from: LatLng = [stops[i - 1].stop.lat, stops[i - 1].stop.lng];
    const to: LatLng = [stops[i].stop.lat, stops[i].stop.lng];
    const dashed = AIR_OR_SEA.has(legMode(stops[i].legIn));

    segments.push({ key: `${trip.id}-${i}`, points: [from, to], dashed });
  }

  const first: LatLng = [stops[0].stop.lat, stops[0].stop.lng];
  const startsAtBase =
    Math.abs(first[0] - base[0]) < 0.05 && Math.abs(first[1] - base[1]) < 0.05;

  const approach: LatLng[] | null = startsAtBase ? null : [base, first];

  return {
    tripId: trip.id,
    color: trip.color,
    segments,
    approach,
    // Every point that gets drawn, not only the stops: the arcs bow past
    // their endpoints, and framing on the endpoints alone clips the curve.
    bounds: [
      base,
      ...segments.flatMap((segment) => segment.points),
      ...(approach ?? []),
    ],
  };
}

function baseIcon(code: string) {
  return L.divIcon({
    className: "",
    html: `
      <span class="base-marker">
        <span class="base-marker__ring"></span>
        <span class="base-marker__dot"></span>
        <span class="base-marker__label">BASE · ${code}</span>
      </span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Frames the map: a picked trip, otherwise everything that exists, otherwise
 * the base alone. Motion moment two of two — 600ms, off when the person asked
 * for reduced motion.
 */
function Camera({
  base,
  target,
  overview,
}: {
  base: LatLng;
  target: LatLng[] | null;
  overview: LatLng[];
}) {
  const map = useMap();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 0.6;
    const frame = target ?? (overview.length > 1 ? overview : null);

    if (!frame) {
      map.flyTo(base, BASE_ZOOM, { duration });
      return;
    }
    map.flyToBounds(L.latLngBounds(frame), { padding: [64, 64], duration, maxZoom: 9 });
  }, [map, base, target, overview]);

  return null;
}

export function WorldMap({
  profile,
  trips,
  highlightedTripId,
  focusedTripId,
}: {
  profile: Profile;
  trips: TripWithRoute[];
  highlightedTripId: string | null;
  focusedTripId: string | null;
}) {
  const base = useMemo<LatLng>(
    () => [profile.home_lat, profile.home_lng],
    [profile.home_lat, profile.home_lng],
  );

  const branches = useMemo(
    () => trips.map((trip) => buildBranch(trip, base)).filter((b): b is Branch => b !== null),
    [trips, base],
  );

  const focusBounds = useMemo(() => {
    if (!focusedTripId) return null;
    return branches.find((branch) => branch.tripId === focusedTripId)?.bounds ?? null;
  }, [branches, focusedTripId]);

  /** Every point the map should be able to show when nothing is picked. */
  const overview = useMemo<LatLng[]>(
    () => [base, ...branches.flatMap((branch) => branch.bounds)],
    [base, branches],
  );

  return (
    <MapContainer
      center={base}
      zoom={BASE_ZOOM}
      minZoom={MIN_ZOOM}
      maxBounds={[
        [-85, -720],
        [85, 720],
      ]}
      maxBoundsViscosity={1}
      worldCopyJump
      zoomControl={false}
      attributionControl={false}
      className="size-full bg-paper"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <AttributionControl position="bottomright" prefix={false} />

      <Camera base={base} target={focusBounds} overview={overview} />

      {branches.map((branch, index) => {
        const dimmed = highlightedTripId !== null && highlightedTripId !== branch.tripId;
        const opacity = dimmed ? 0.25 : 1;
        const delay = `${index * 60}ms`;

        return (
          <Fragment key={branch.tripId}>
            {branch.approach && (
              <Polyline
                positions={branch.approach}
                pathOptions={{
                  color: "#6C7683",
                  weight: 1,
                  opacity: dimmed ? 0.15 : 0.5,
                  dashArray: "2 5",
                }}
                interactive={false}
              />
            )}

            {branch.segments.map((segment) => (
              <Polyline
                key={segment.key}
                positions={segment.points}
                pathOptions={{
                  className: segment.dashed
                    ? "leg-line leg-line--fade"
                    : "leg-line leg-line--draw",
                  color: branch.color,
                  weight: dimmed ? 2 : 2.5,
                  opacity,
                  dashArray: segment.dashed ? "3 6" : undefined,
                  lineCap: "round",
                }}
                interactive={false}
                eventHandlers={{
                  add: (event) => {
                    (event.target.getElement() as SVGPathElement | null)?.style.setProperty(
                      "--draw-delay",
                      delay,
                    );
                  },
                }}
              />
            ))}
          </Fragment>
        );
      })}

      <Marker position={base} icon={baseIcon(profile.home_code)} interactive={false} />
    </MapContainer>
  );
}
