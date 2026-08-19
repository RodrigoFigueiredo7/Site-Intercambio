"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { LatLng } from "@/lib/map/geometry";
import { AIR_OR_SEA, MODE_COLORS } from "@/lib/map/colors";
import { legMode, type RouteStop } from "@/lib/trip-route";

/** Frames the whole route, or flies to one stop when it is picked. */
function Camera({ points, focus }: { points: LatLng[]; focus: LatLng | null }) {
  const map = useMap();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 0.6;

    if (focus) {
      map.flyTo(focus, Math.max(map.getZoom(), 7), { duration });
      return;
    }
    if (points.length === 1) {
      map.flyTo(points[0], 7, { duration });
      return;
    }
    if (points.length > 1) {
      map.flyToBounds(L.latLngBounds(points), { padding: [72, 72], duration, maxZoom: 9 });
    }
  }, [map, points, focus]);

  return null;
}

function stopIcon(code: string, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<span class="stop-pin${selected ? " stop-pin--on" : ""}">
             <span class="stop-pin__dot"></span>
             <span class="stop-pin__label">${code}</span>
           </span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function TripMap({
  route,
  selectedStopId,
  onSelectStop,
}: {
  route: RouteStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
}) {
  const points = useMemo<LatLng[]>(
    () => route.map(({ stop }) => [stop.lat, stop.lng]),
    [route],
  );

  const focus = useMemo<LatLng | null>(() => {
    const found = route.find(({ stop }) => stop.id === selectedStopId);
    return found ? [found.stop.lat, found.stop.lng] : null;
  }, [route, selectedStopId]);

  const centre = points[0] ?? ([48, 10] as LatLng);

  return (
    <MapContainer
      center={centre}
      zoom={points.length > 0 ? 6 : 4}
      minZoom={2}
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

      <Camera points={points} focus={focus} />

      {/* Straight line per pair, in the colour of the mode that was chosen. */}
      {route.slice(1).map((entry, index) => {
        const from = route[index];
        const mode = legMode(entry.legIn);
        return (
          <Polyline
            key={`${from.stop.id}-${entry.stop.id}`}
            positions={[
              [from.stop.lat, from.stop.lng],
              [entry.stop.lat, entry.stop.lng],
            ]}
            pathOptions={{
              color: MODE_COLORS[mode],
              weight: 2.5,
              opacity: 0.9,
              dashArray: AIR_OR_SEA.has(mode) ? "4 6" : undefined,
              lineCap: "round",
            }}
            interactive={false}
          />
        );
      })}

      {route.map(({ stop }) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={stopIcon(stop.code ?? stop.name.slice(0, 3).toUpperCase(), stop.id === selectedStopId)}
          eventHandlers={{ click: () => onSelectStop(stop.id) }}
          keyboard={false}
        />
      ))}
    </MapContainer>
  );
}
