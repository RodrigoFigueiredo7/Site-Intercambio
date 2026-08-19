"use client";

import { useRef, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BedDouble, MoveRight, Plus, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createItem, deleteItem } from "@/lib/actions/items";
import type { ItemCategory } from "@/lib/db/types";
import type { TripDay } from "@/lib/days";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<{ value: ItemCategory; label: string }> = [
  { value: "activity", label: "passeio" },
  { value: "food", label: "comida" },
  { value: "lodging", label: "hospedagem" },
  { value: "other", label: "outro" },
];

export function DayCard({
  day,
  tripId,
  currency,
}: {
  day: TripDay;
  tripId: string;
  currency: "EUR" | "BRL";
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<ItemCategory>("activity");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  const stopId =
    day.place.kind === "in"
      ? day.place.stop.id
      : day.place.kind === "moving"
        ? day.place.stops[day.place.stops.length - 1].id
        : null;

  function add(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseMoneyToCents(cost);
    if (cents === null) {
      setError("Valor inválido. Use algo como 12,50.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createItem({
        tripId,
        stopId,
        day: day.date,
        startTime: time || null,
        category,
        title,
        costCents: cents,
        notes: null,
      });
      if (result.ok) {
        setTitle("");
        setTime("");
        setCost("");
        // Enter creates the next line: the field is cleared and keeps focus.
        titleRef.current?.focus();
      } else {
        setError(result.message);
      }
    });
  }

  const dayTotal = day.items.reduce((sum, item) => sum + item.cost_cents, 0);

  return (
    <article className="border-b border-line px-5 py-6">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold">
          {format(parseISO(day.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h3>
        <span className="font-mono text-xs text-muted">
          dia {day.index} de {day.total}
        </span>
        {dayTotal > 0 && (
          <span className="ml-auto shrink-0 font-mono text-xs text-ink">
            {formatMoney(dayTotal, currency)}
          </span>
        )}
      </header>

      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink">
        {day.place.kind === "in" && day.place.stop.name}
        {day.place.kind === "moving" &&
          day.place.stops.map((stop, index) => (
            <span key={stop.id} className="flex items-center gap-1.5">
              {index > 0 && <MoveRight className="size-3.5 text-muted" aria-hidden="true" />}
              {stop.name}
            </span>
          ))}
        {day.place.kind === "transit" && (
          <span className="text-muted">
            em trânsito · {day.place.from.name} → {day.place.to.name}
          </span>
        )}
        {day.place.kind === "unknown" && <span className="text-muted">sem parada neste dia</span>}
      </p>

      {/* Lodging comes from the stop that covers the night, or from the ride. */}
      <div className="mt-4 flex items-center gap-2 border-y border-line py-2.5">
        {day.night.kind === "stop" && (
          <>
            <BedDouble className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="text-sm">
              {day.night.stop.lodging_name ?? "hospedagem sem nome"}
            </span>
            {day.night.stop.lodging_cost_cents > 0 && (
              <span className="ml-auto font-mono text-xs text-muted">
                {formatMoney(day.night.stop.lodging_cost_cents, currency)} no total
              </span>
            )}
          </>
        )}

        {day.night.kind === "transit" && (
          <>
            <MoveRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="text-sm">
              Noite a bordo · {day.night.from.name} → {day.night.to.name}
              {day.night.leg?.operator ? ` · ${day.night.leg.operator}` : ""}
            </span>
            <span className="ml-auto font-mono text-xs text-muted">sem diária</span>
          </>
        )}

        {day.night.kind === "none" && (
          <>
            <TriangleAlert className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="text-sm text-muted">Esta noite não tem onde dormir.</span>
          </>
        )}

        {day.night.kind === "trip-ends" && (
          <span className="font-mono text-xs text-muted">último dia da viagem</span>
        )}
      </div>

      {day.items.length > 0 && (
        <ul className="mt-3">
          {day.items.map((item) => (
            <li
              key={item.id}
              className="flex items-baseline gap-3 border-b border-line py-2 last:border-0"
            >
              <span className="w-12 shrink-0 font-mono text-xs text-muted">
                {item.start_time ? item.start_time.slice(0, 5) : "—"}
              </span>
              <span className="text-sm text-ink">{item.title}</span>
              <span className="font-mono text-label uppercase tracking-[0.12em] text-muted">
                {CATEGORIES.find((c) => c.value === item.category)?.label}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs text-ink">
                {item.cost_cents > 0 ? formatMoney(item.cost_cents, currency) : ""}
              </span>
              <button
                type="button"
                aria-label={`Remover ${item.title}`}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteItem(item.id, tripId);
                    if (!result.ok) setError(result.message);
                  })
                }
                className="shrink-0 text-muted hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-3">
        <div className="w-20">
          <Label htmlFor={`t-${day.date}`}>Hora</Label>
          <Input
            id={`t-${day.date}`}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="mt-1.5 font-mono"
          />
        </div>
        <div className="min-w-40 flex-1">
          <Label htmlFor={`i-${day.date}`}>O que acontece</Label>
          <Input
            id={`i-${day.date}`}
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="adicionar ao dia"
            className="mt-1.5"
          />
        </div>
        <div className="w-24">
          <Label htmlFor={`c-${day.date}`}>Custo</Label>
          <Input
            id={`c-${day.date}`}
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            inputMode="decimal"
            placeholder={centsToInput(0)}
            className="mt-1.5 font-mono"
          />
        </div>
        <Button type="submit" size="icon" aria-label="Adicionar item" disabled={pending || !title.trim()}>
          <Plus />
        </Button>

        <fieldset className="flex w-full flex-wrap gap-1.5">
          <legend className="sr-only">Categoria</legend>
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-mono text-label uppercase tracking-[0.12em]",
                category === value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line bg-surface text-muted hover:bg-paper",
              )}
            >
              {label}
            </button>
          ))}
        </fieldset>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
