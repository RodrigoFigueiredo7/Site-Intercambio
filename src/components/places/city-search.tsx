"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchCities, type CityResult } from "@/lib/places/city";
import { cn } from "@/lib/utils";

export type { CityResult };

/**
 * City autocomplete. The request goes to this app's own /api/cidades, which
 * queries the geocoders server-side — a browser extension or a filtered
 * network must not be able to disable the most important field in the app.
 */
export function CitySearch({
  id,
  initialValue = "",
  placeholder = "Buscar cidade…",
  onSelect,
  onType,
  className,
}: {
  id?: string;
  initialValue?: string;
  placeholder?: string;
  onSelect: (city: CityResult) => void;
  /** Every keystroke, so the parent can tell typed text from a real choice. */
  onType?: (text: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const tooShort = query.trim().length < 2;
  // Derived rather than cleared in the effect: a stale list must not survive
  // the query being emptied.
  const visible = tooShort ? [] : results;

  useEffect(() => {
    if (tooShort) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setFailure(null);
      try {
        const payload = await searchCities(query, controller.signal);
        setSearching(false);

        if ("error" in payload) {
          setFailure(payload.error);
          return;
        }
        setFailure(null);
        setResults(payload.results);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearching(false);
          setFailure("A busca de cidades não respondeu.");
        }
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
        onChange={(event) => {
          setQuery(event.target.value);
          onType?.(event.target.value);
        }}
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

      {searching && !failure && (
        <p className="mt-1.5 font-mono text-xs text-muted">buscando…</p>
      )}

      {!searching && !failure && !tooShort && visible.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">
          Nenhuma cidade encontrada para “{query.trim()}”. Tente o nome no idioma local
          — Wien no lugar de Viena, por exemplo.
        </p>
      )}

      {failure && !tooShort && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  );
}
