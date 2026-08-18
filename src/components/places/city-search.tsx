"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cityCode } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CityResult = {
  name: string;
  country: string | null;
  lat: number;
  lng: number;
  code: string;
};

type PhotonFeature = {
  properties: { name?: string; city?: string; country?: string; state?: string };
  geometry: { coordinates: [number, number] };
};

/**
 * City autocomplete against Photon, which is free and needs no key.
 * Runs in the browser, so the request leaves from the person's machine.
 */
export function CitySearch({
  id,
  initialValue = "",
  placeholder = "Buscar cidade…",
  onSelect,
  className,
}: {
  id?: string;
  initialValue?: string;
  placeholder?: string;
  onSelect: (city: CityResult) => void;
  className?: string;
}) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const tooShort = query.trim().length < 2;
  // Derived rather than cleared in the effect: a stale list must not survive
  // the query being emptied.
  const visible = tooShort ? [] : results;

  useEffect(() => {
    if (tooShort) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=6&lang=pt`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { features: PhotonFeature[] };

        setFailed(false);
        setResults(
          data.features.map((feature) => {
            const name = feature.properties.name ?? feature.properties.city ?? "";
            return {
              name,
              country: feature.properties.country ?? null,
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0],
              code: cityCode(name),
            };
          }),
        );
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, tooShort]);

  // Close on click outside.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(city: CityResult) {
    setQuery(city.name);
    setOpen(false);
    onSelect(city);
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && open && visible[0]) {
            event.preventDefault();
            choose(visible[0]);
          }
        }}
      />

      {open && visible.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-field border border-line bg-surface">
          {visible.map((city, index) => (
            <li key={`${city.name}-${index}`}>
              <button
                type="button"
                onClick={() => choose(city)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left hover:bg-paper"
              >
                <span className="text-sm text-ink">{city.name}</span>
                <span className="font-mono text-xs text-muted">{city.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {failed && (
        <p className="mt-1.5 text-xs text-muted">
          A busca de cidades não respondeu. Verifique a conexão e tente de novo.
        </p>
      )}
    </div>
  );
}
