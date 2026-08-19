"use client";

import { useState, useTransition } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStop } from "@/lib/actions/stops";
import type { Stop } from "@/lib/db/types";
import { searchCities, type CityResult } from "@/lib/places/city";
import { addHours, addLocalDays, instantFromLocal, localInputValue, timezoneFor } from "@/lib/tz";

/** Arrival three hours after the last departure; two nights in the city. */
const HOURS_AFTER_LAST_DEPARTURE = 3;
const DEFAULT_NIGHTS = 2;

export function StopSearch({
  tripId,
  lastStop,
  fallbackFrom,
}: {
  tripId: string;
  lastStop: Stop | null;
  /** Where the clock starts when the trip has no stops yet. */
  fallbackFrom: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "failed">("idle");
  const [chosen, setChosen] = useState<CityResult | null>(null);
  const [arrive, setArrive] = useState("");
  const [depart, setDepart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run(text: string) {
    setQuery(text);
    setError(null);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setState("searching");
    try {
      const payload = await searchCities(text, new AbortController().signal);
      if ("error" in payload) {
        setState("failed");
        setError(payload.error);
        return;
      }
      setState("idle");
      setResults(payload.results);
    } catch {
      setState("failed");
      setError("A busca de cidades não respondeu.");
    }
  }

  function choose(city: CityResult) {
    const tz = timezoneFor(city.lat, city.lng);
    const base = lastStop ? addHours(lastStop.depart_at, HOURS_AFTER_LAST_DEPARTURE) : fallbackFrom;

    setChosen(city);
    setResults([]);
    setQuery(city.name);
    setArrive(localInputValue(base, tz));
    setDepart(localInputValue(addLocalDays(base, DEFAULT_NIGHTS, tz), tz));
  }

  function save() {
    if (!chosen) return;
    const tz = timezoneFor(chosen.lat, chosen.lng);
    setError(null);

    startTransition(async () => {
      const result = await createStop({
        tripId,
        name: chosen.name,
        region: chosen.region,
        country: chosen.country,
        code: chosen.code,
        lat: chosen.lat,
        lng: chosen.lng,
        arriveAt: instantFromLocal(arrive, tz),
        departAt: instantFromLocal(depart, tz),
      });

      if (result.ok) {
        setChosen(null);
        setQuery("");
        setArrive("");
        setDepart("");
      } else {
        setError(result.message);
      }
    });
  }

  const tz = chosen ? timezoneFor(chosen.lat, chosen.lng) : null;

  return (
    <div className="absolute left-4 top-4 z-map-overlay w-[min(22rem,calc(100%-2rem))]">
      <div className="rounded-card border border-line bg-surface">
        <div className="flex items-center gap-2 px-3">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => run(event.target.value)}
            placeholder="Adicionar cidade à viagem…"
            aria-label="Buscar cidade"
            className="border-0 bg-transparent px-0 focus-visible:border-0"
          />
        </div>

        {results.length > 0 && (
          <ul className="border-t border-line">
            {results.map((city, index) => (
              <li key={`${city.name}-${index}`}>
                <button
                  type="button"
                  onClick={() => choose(city)}
                  className="flex w-full items-baseline gap-2 px-3 py-2.5 text-left hover:bg-paper"
                >
                  <MapPin className="size-3.5 shrink-0 translate-y-0.5 text-muted" aria-hidden="true" />
                  <span className="text-sm text-ink">{city.name}</span>
                  <span className="ml-auto truncate font-mono text-xs text-muted">
                    {[city.region, city.country].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {state === "searching" && (
          <p className="border-t border-line px-3 py-2 font-mono text-xs text-muted">buscando…</p>
        )}

        {chosen && tz && (
          <div className="border-t border-line p-3">
            <p className="label-caps">
              {chosen.name}
              {chosen.country ? ` · ${chosen.country}` : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-muted">hora local · {tz}</p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="mt-3 flex flex-col gap-3"
            >
              <div>
                <Label htmlFor="stop-arrive">Chegada</Label>
                <Input
                  id="stop-arrive"
                  type="datetime-local"
                  value={arrive}
                  onChange={(event) => setArrive(event.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="stop-depart">Saída</Label>
                <Input
                  id="stop-depart"
                  type="datetime-local"
                  value={depart}
                  onChange={(event) => setDepart(event.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="block" disabled={pending}>
                  {pending ? "Salvando…" : "Adicionar parada"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChosen(null);
                    setQuery("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {!chosen && error && (
          <p role="alert" className="border-t border-line px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
