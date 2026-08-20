"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";

import { CATEGORIES } from "@/components/days/item-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importPlan, type ImportStay } from "@/lib/actions/import";
import { formatLongDate, formatMoney, formatShortDate } from "@/lib/format";
import { flagOfTimezone } from "@/lib/geo/country";
import { parsePlan, type ParsedItem, type ParsedStay } from "@/lib/import/parse-plan";
import { searchCities, type CityResult } from "@/lib/places/city";
import { instantFromLocal, timezoneFor } from "@/lib/tz";

/**
 * The shape of the grammar, with nothing real in it. No city, no activity and
 * no price of an actual trip lives in this repository — including here, where
 * it would have been convenient.
 */
const EXAMPLE = `Cidade, 6 a 9 de novembro
chego 14h, saio 22h
10h o que vou fazer de manhã 12,50
13h30 onde vou almoçar 22,00

dia 7
09h outra coisa
20:00 mais uma 15 euros

Outra cidade 9/11 22:00 a 12/11 16:00
dia 10 - 11h o que tem lá 24,00`;

/**
 * A stay once the city has been looked up. "Not found" and "the lookup never
 * answered" are different problems with different fixes, so they are kept
 * apart rather than both showing as a missing city.
 */
type ResolvedStay = {
  parsed: ParsedStay;
  city: CityResult | null;
  reachable: boolean;
  include: boolean;
};

type Stage =
  | { kind: "writing" }
  | { kind: "resolving" }
  | { kind: "review"; stays: ResolvedStay[]; items: ParsedItem[]; unparsed: string[] }
  | { kind: "done"; stops: number; items: number };

/**
 * Paste a plan as text and have it spread across the days.
 *
 * Nothing is written until it has been shown. The reading is a parser's, not a
 * person's, so it will get things wrong — the review step exists so a wrong
 * reading costs a click rather than a cleanup.
 */
export function PlanImport({
  tripId,
  year,
  month,
  currency,
}: {
  tripId: string;
  /** The year to assume for a date that does not name one. */
  year: number;
  /** The month to assume for a bare "dia 7". */
  month: number | null;
  currency: "EUR" | "BRL";
}) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "writing" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function review() {
    const plan = parsePlan(text, year, month);

    if (plan.stays.length === 0 && plan.items.length === 0) {
      setError("Não consegui achar nenhuma data nesse texto.");
      return;
    }

    setError(null);
    setStage({ kind: "resolving" });

    // Each city named in the text is looked up in the same geocoder the map's
    // search box uses, so an imported stop is the same kind of row as a typed
    // one — coordinates, region, country and timezone included.
    const stays: ResolvedStay[] = [];
    for (const parsed of plan.stays) {
      let city: CityResult | null = null;
      let reachable = true;
      try {
        const payload = await searchCities(parsed.city, new AbortController().signal);
        if ("error" in payload) reachable = false;
        else city = payload.results[0] ?? null;
      } catch {
        reachable = false;
      }
      stays.push({ parsed, city, reachable, include: city !== null });
    }

    setStage({ kind: "review", stays, items: plan.items, unparsed: plan.unparsed });
  }

  function save() {
    if (stage.kind !== "review") return;
    setError(null);

    const stays: ImportStay[] = stage.stays
      .filter((stay) => stay.include && stay.city)
      .map((stay) => {
        const city = stay.city!;
        const tz = timezoneFor(city.lat, city.lng);
        return {
          name: city.name,
          region: city.region,
          country: city.country,
          code: city.code,
          lat: city.lat,
          lng: city.lng,
          tz,
          arriveAt: instantFromLocal(
            `${stay.parsed.from}T${stay.parsed.fromTime ?? "12:00"}`,
            tz,
          ),
          departAt: instantFromLocal(`${stay.parsed.to}T${stay.parsed.toTime ?? "12:00"}`, tz),
        };
      });

    startTransition(async () => {
      const result = await importPlan({
        tripId,
        stays,
        items: stage.items.map((item) => ({
          day: item.date,
          startTime: item.time,
          title: item.title,
          costCents: item.costCents,
          category: item.category,
        })),
      });

      if (!result.ok) return setError(result.message);
      setStage({ kind: "done", stops: result.stops, items: result.items });
      setText("");
    });
  }

  if (stage.kind === "done") {
    return (
      <div className="px-5 py-8">
        <p className="label-caps">Pronto</p>
        <p className="mt-3 text-base text-ink">
          {stage.stops > 0 && (
            <>
              {stage.stops} {stage.stops === 1 ? "parada criada" : "paradas criadas"}
              {stage.items > 0 ? " e " : "."}
            </>
          )}
          {stage.items > 0 && (
            <>
              {stage.items} {stage.items === 1 ? "linha adicionada" : "linhas adicionadas"} aos
              dias.
            </>
          )}
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setStage({ kind: "writing" })}
        >
          Colar mais um trecho
        </Button>
      </div>
    );
  }

  if (stage.kind === "review") {
    const byDay = new Map<string, ParsedItem[]>();
    for (const item of stage.items) {
      byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
    }

    return (
      <div className="px-5 py-6">
        <p className="label-caps">Confira antes de gravar</p>

        {stage.stays.length > 0 && (
          <section className="mt-4">
            <p className="label-caps">Paradas</p>
            <ul className="mt-2">
              {stage.stays.map((stay, index) => (
                <li key={index} className="border-b border-line py-3 last:border-0">
                  {stay.city ? (
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={stay.include}
                        onChange={(event) =>
                          setStage({
                            ...stage,
                            stays: stage.stays.map((other, i) =>
                              i === index ? { ...other, include: event.target.checked } : other,
                            ),
                          })
                        }
                        className="mt-1 size-4 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-sm text-ink">
                          {stay.city.name}
                          {flagOfTimezone(timezoneFor(stay.city.lat, stay.city.lng)) && (
                            <span aria-hidden="true" className="ml-1.5 text-xs">
                              {flagOfTimezone(timezoneFor(stay.city.lat, stay.city.lng))}
                            </span>
                          )}
                        </span>
                        <span className="block font-mono text-xs text-muted">
                          {[stay.city.region, stay.city.country].filter(Boolean).join(", ")}
                        </span>
                        <span className="block font-mono text-xs text-muted">
                          {formatShortDate(stay.parsed.from)} {stay.parsed.fromTime ?? "12:00"} →{" "}
                          {formatShortDate(stay.parsed.to)} {stay.parsed.toTime ?? "12:00"}
                        </span>
                      </span>
                    </label>
                  ) : (
                    <p className="flex items-start gap-2 text-sm text-muted">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>
                        {stay.reachable
                          ? `Não achei a cidade “${stay.parsed.city}”. Confira o nome ou adicione ela pela busca do mapa.`
                          : `A busca de cidades não respondeu, então “${stay.parsed.city}” ficou de fora. O resto do texto entra normalmente.`}
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {stage.items.length > 0 && (
          <section className="mt-6">
            <p className="label-caps">Nos dias</p>
            {[...byDay.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, items]) => (
                <div key={date} className="mt-3">
                  <p className="font-mono text-xs text-muted">{formatLongDate(date)}</p>
                  <ul className="mt-1">
                    {items.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-baseline gap-3 border-b border-line py-2 last:border-0"
                      >
                        <span className="w-11 shrink-0 font-mono text-xs text-muted">
                          {item.time ?? "—"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {item.title}
                        </span>
                        <span className="shrink-0 font-mono text-label uppercase tracking-[0.12em] text-muted">
                          {CATEGORIES.find((c) => c.value === item.category)?.label}
                        </span>
                        <span className="w-16 shrink-0 text-right font-mono text-xs text-ink">
                          {item.costCents > 0 ? formatMoney(item.costCents, currency) : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </section>
        )}

        {stage.unparsed.length > 0 && (
          <section className="mt-6">
            <p className="label-caps">Não entendi estas linhas</p>
            <ul className="mt-2">
              {stage.unparsed.map((line, index) => (
                <li key={index} className="py-1 font-mono text-xs text-muted">
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">
              Elas não vão entrar. Uma linha precisa de uma data antes dela.
            </p>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <Button onClick={save} disabled={pending}>
            <Check />
            {pending ? "Gravando…" : "Gravar tudo"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setStage({ kind: "writing" })}
            disabled={pending}
          >
            Voltar ao texto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <p className="label-caps">Colar um plano</p>
      <p className="mt-2 text-sm text-muted">
        Escreva onde vai estar e o que vai fazer, uma coisa por linha. Eu leio as datas, as
        horas e os valores, e mostro o que entendi antes de gravar qualquer coisa.
      </p>

      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        placeholder={EXAMPLE}
        aria-label="Plano em texto"
        className="mt-4 font-mono text-sm"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={review} disabled={stage.kind === "resolving" || !text.trim()}>
          {stage.kind === "resolving" ? <Loader2 className="animate-spin" /> : <Check />}
          {stage.kind === "resolving" ? "Procurando as cidades…" : "Ver o que entendi"}
        </Button>
        {!text.trim() && (
          <Button variant="outline" onClick={() => setText(EXAMPLE)}>
            Usar o exemplo
          </Button>
        )}
      </div>
    </div>
  );
}
