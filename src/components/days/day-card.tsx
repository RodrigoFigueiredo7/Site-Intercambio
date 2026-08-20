"use client";

import { useRef, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoveRight, Plus, X } from "lucide-react";

import {
  ItemFields,
  emptyDraft,
  readDraft,
  type ItemDraft,
} from "@/components/days/item-fields";
import { ItemRow } from "@/components/days/item-row";
import { LodgingRow } from "@/components/days/lodging-row";
import { Button } from "@/components/ui/button";
import { createItem } from "@/lib/actions/items";
import type { TripDay } from "@/lib/days";
import { formatMoney } from "@/lib/format";
import { localDay } from "@/lib/trip-route";
import { flagOfTimezone } from "@/lib/geo/country";

/**
 * One day of the trip. The city and the night are deduced from the stops; the
 * agenda is the only part that is typed.
 *
 * The form to add a line stays folded until it is asked for. A trip of ten
 * days used to open ten copies of it at once, which is what made the tab feel
 * like a form to fill in rather than a day to read.
 */
export function DayCard({
  day,
  tripId,
  currency,
}: {
  day: TripDay;
  tripId: string;
  currency: "EUR" | "BRL";
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  const stopId =
    day.place.kind === "in"
      ? day.place.stop.id
      : day.place.kind === "moving"
        ? day.place.stops[day.place.stops.length - 1].id
        : null;

  function openAdd() {
    setError(null);
    setAdding(true);
    // The field only exists after this render, so focus waits for it.
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    const values = readDraft(draft);
    if (!values) return setError("Valor inválido. Use algo como 12,50.");
    if (!values.title) return setError("Escreva o que acontece.");

    setError(null);
    startTransition(async () => {
      const result = await createItem({
        tripId,
        stopId,
        day: day.date,
        startTime: values.start_time,
        category: values.category,
        title: values.title,
        costCents: values.cost_cents,
        notes: null,
      });
      if (!result.ok) return setError(result.message);

      // Enter creates the next line: same category and hour kept, because the
      // next thing that day is usually the same kind of thing.
      setDraft({ ...draft, title: "", cost: "" });
      titleRef.current?.focus();
    });
  }

  const dayTotal = day.items.reduce((sum, item) => sum + item.cost_cents, 0);

  return (
    <article className="border-b border-line px-5 py-6">
      <header>
        <div className="flex items-baseline gap-3">
          <p className="label-caps">dia {day.index} de {day.total}</p>
          {dayTotal > 0 && (
            <span className="ml-auto font-mono text-xs text-ink">
              {formatMoney(dayTotal, currency)}
            </span>
          )}
        </div>

        <h3 className="mt-1 text-base font-semibold first-letter:uppercase">
          {format(parseISO(day.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>

        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
          {day.place.kind === "in" && <Where name={day.place.stop.name} tz={day.place.stop.tz} />}

          {day.place.kind === "moving" &&
            day.place.stops.map((stop, index) => (
              <span key={stop.id} className="flex items-center gap-1.5">
                {index > 0 && <MoveRight className="size-3.5 text-muted" aria-hidden="true" />}
                <Where name={stop.name} tz={stop.tz} />
              </span>
            ))}

          {day.place.kind === "transit" && (
            <span className="text-muted">
              em trânsito · {day.place.from.name} → {day.place.to.name}
            </span>
          )}

          {day.place.kind === "unknown" && (
            <span className="text-muted">sem parada neste dia</span>
          )}
        </p>
      </header>

      <div className="mt-4">
        <LodgingRow
          night={day.night}
          tripId={tripId}
          currency={currency}
          firstNight={
            day.night.kind === "stop" &&
            localDay(day.night.stop.arrive_at, day.night.stop.tz) === day.date
          }
          onError={setError}
        />
      </div>

      {day.items.length > 0 && (
        <ul className="mt-1">
          {day.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              tripId={tripId}
              currency={currency}
              onError={setError}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <form
          onSubmit={add}
          onKeyDown={(event) => {
            if (event.key === "Escape") setAdding(false);
          }}
          className="mt-3"
        >
          <ItemFields
            draft={draft}
            onChange={setDraft}
            idPrefix={`add-${day.date}`}
            titleRef={titleRef}
            labels
          />
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={pending || !draft.title.trim()}>
              <Plus />
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              onClick={() => setAdding(false)}
            >
              <X />
            </Button>
          </div>
          <p className="mt-2 font-mono text-xs text-muted">
            Enter cria a próxima linha. Esc fecha.
          </p>
        </form>
      ) : (
        <button
          type="button"
          onClick={openAdd}
          className="mt-2 flex h-11 w-full items-center gap-2 rounded-field text-sm text-muted hover:bg-paper hover:text-ink"
        >
          <Plus className="size-4" />
          Adicionar ao dia
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}

function Where({ name, tz }: { name: string; tz: string }) {
  const flag = flagOfTimezone(tz);
  return (
    <span className="whitespace-nowrap text-ink">
      {name}
      {flag && (
        <span aria-hidden="true" className="ml-1.5 text-xs">
          {flag}
        </span>
      )}
    </span>
  );
}
