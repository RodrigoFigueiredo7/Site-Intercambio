"use client";

import { useState, useTransition } from "react";
import { Bus, Car, Footprints, Plane, Ship, TrainFront } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateLeg } from "@/lib/actions/legs";
import type { Leg, LegStatus, TransportMode } from "@/lib/db/types";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/format";
import { MODE_COLORS } from "@/lib/map/colors";
import { legMode } from "@/lib/trip-route";
import { cn } from "@/lib/utils";

const MODES: Array<{ value: TransportMode; label: string; Icon: typeof TrainFront }> = [
  { value: "train", label: "Trem", Icon: TrainFront },
  { value: "bus", label: "Ônibus", Icon: Bus },
  { value: "plane", label: "Avião", Icon: Plane },
  { value: "ferry", label: "Balsa", Icon: Ship },
  { value: "car", label: "Carro", Icon: Car },
  { value: "walk", label: "A pé", Icon: Footprints },
];

const STATUS: Array<{ value: LegStatus; label: string }> = [
  { value: "idea", label: "ideia" },
  { value: "to_book", label: "reservar" },
  { value: "booked", label: "reservado" },
];

/**
 * The travel between two stops. The database decided that it exists and when
 * it happens; everything editable here is what the person chose and paid.
 */
export function LegRow({
  leg,
  tripId,
  durationLabel,
  currency,
}: {
  leg: Leg;
  tripId: string;
  durationLabel: string;
  currency: "EUR" | "BRL";
}) {
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(centsToInput(leg.cost_cents));
  const [operator, setOperator] = useState(leg.operator ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mode = legMode(leg);
  const Icon = MODES.find((m) => m.value === mode)?.Icon ?? TrainFront;

  function patch(next: Parameters<typeof updateLeg>[2]) {
    setError(null);
    startTransition(async () => {
      const result = await updateLeg(leg.id, tripId, next);
      if (!result.ok) setError(result.message);
    });
  }

  function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseMoneyToCents(cost);
    if (cents === null) {
      setError("Valor inválido. Use algo como 34,50.");
      return;
    }
    patch({ operator: operator.trim() || null, cost_cents: cents });
  }

  return (
    <div className="border-b border-line bg-paper/60 px-5 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full"
          style={{ backgroundColor: `${MODE_COLORS[mode]}1a`, color: MODE_COLORS[mode] }}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel}</span>
        {leg.operator && <span className="text-xs text-muted">{leg.operator}</span>}
        <span className="ml-auto font-mono text-xs text-ink">
          {formatMoney(leg.cost_cents, currency)}
        </span>
        <span className="font-mono text-label uppercase tracking-[0.12em] text-muted">
          {STATUS.find((s) => s.value === leg.status)?.label}
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <Label>Meio de transporte</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {MODES.map(({ value, label, Icon: ModeIcon }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ mode: value })}
                aria-pressed={leg.mode === value}
                title={label}
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-field border px-3 text-xs",
                  leg.mode === value
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line bg-surface text-muted hover:bg-paper",
                )}
              >
                <ModeIcon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={saveDetails} className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <Label htmlFor={`op-${leg.id}`}>Companhia</Label>
              <Input
                id={`op-${leg.id}`}
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
                placeholder="quem opera"
                className="mt-1.5"
              />
            </div>
            <div className="w-32">
              <Label htmlFor={`cost-${leg.id}`}>Valor pago</Label>
              <Input
                id={`cost-${leg.id}`}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                inputMode="decimal"
                className="mt-1.5 font-mono"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </form>

          <div className="mt-3 flex gap-1.5">
            {STATUS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ status: value })}
                aria-pressed={leg.status === value}
                className={cn(
                  "h-11 rounded-full border px-3 font-mono text-xs",
                  leg.status === value
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line bg-surface text-muted hover:bg-paper",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
