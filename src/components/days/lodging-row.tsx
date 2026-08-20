"use client";

import { useState, useTransition } from "react";
import { BedDouble, Check, MoveRight, Pencil, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStop } from "@/lib/actions/stops";
import type { DayNight } from "@/lib/days";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/format";

/**
 * Where the night is spent. It belongs to the stop that covers it, so editing
 * it here writes to that stop — the same field the Rota tab shows, reached
 * from the day where the question actually comes up.
 *
 * A night aboard a train has no room and no nightly rate, and the last day of
 * the trip has no night at all; neither is editable, because neither exists.
 */
export function LodgingRow({
  night,
  tripId,
  currency,
  firstNight,
  onError,
}: {
  night: DayNight;
  tripId: string;
  currency: "EUR" | "BRL";
  /** Whether this is the night the stay begins. */
  firstNight: boolean;
  onError: (message: string | null) => void;
}) {
  const stop = night.kind === "stop" ? night.stop : null;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stop?.lodging_name ?? "");
  const [address, setAddress] = useState(stop?.lodging_address ?? "");
  const [cost, setCost] = useState(
    stop && stop.lodging_cost_cents > 0 ? centsToInput(stop.lodging_cost_cents) : "",
  );
  const [pending, startTransition] = useTransition();

  function open() {
    if (!stop) return;
    setName(stop.lodging_name ?? "");
    setAddress(stop.lodging_address ?? "");
    setCost(stop.lodging_cost_cents > 0 ? centsToInput(stop.lodging_cost_cents) : "");
    onError(null);
    setEditing(true);
  }

  function save() {
    if (!stop) return;
    const cents = parseMoneyToCents(cost);
    if (cents === null) return onError("Valor inválido. Use algo como 180,00.");

    onError(null);
    startTransition(async () => {
      const result = await updateStop(stop.id, tripId, {
        lodging_name: name.trim() || null,
        lodging_address: address.trim() || null,
        lodging_cost_cents: cents,
      });
      if (result.ok) setEditing(false);
      else onError(result.message);
    });
  }

  if (night.kind === "transit") {
    return (
      <Shell>
        <MoveRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm">
          Noite a bordo · {night.from.name} → {night.to.name}
          {night.leg?.operator ? ` · ${night.leg.operator}` : ""}
        </span>
        <span className="shrink-0 font-mono text-xs text-muted">sem diária</span>
      </Shell>
    );
  }

  if (night.kind === "trip-ends") {
    return (
      <Shell>
        <span className="font-mono text-xs text-muted">último dia — sem noite</span>
      </Shell>
    );
  }

  if (night.kind === "none") {
    return (
      <Shell>
        <TriangleAlert className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="text-sm text-muted">Esta noite não tem onde dormir.</span>
      </Shell>
    );
  }

  if (editing && stop) {
    return (
      <div className="border-y border-line py-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
        >
          <p className="label-caps">Onde dormir em {stop.name}</p>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor={`lodg-nome-${stop.id}`}>Nome</Label>
              <Input
                id={`lodg-nome-${stop.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hotel, hostel, casa de alguém"
                className="mt-1.5"
              />
            </div>
            <div className="w-[7rem]">
              <Label htmlFor={`lodg-custo-${stop.id}`}>Total da estadia</Label>
              <Input
                id={`lodg-custo-${stop.id}`}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-1.5 font-mono"
              />
            </div>
          </div>

          <div className="mt-2">
            <Label htmlFor={`lodg-end-${stop.id}`}>Endereço</Label>
            <Input
              id={`lodg-end-${stop.id}`}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="opcional"
              className="mt-1.5"
            />
          </div>

          <p className="mt-2 font-mono text-xs text-muted">
            Vale para toda a estadia em {stop.name}, não só por esta noite.
          </p>

          <div className="mt-3 flex gap-2">
            <Button type="submit" size="icon" aria-label="Salvar hospedagem" disabled={pending}>
              <Check />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Cancelar"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              <X />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Shell>
      <BedDouble className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <button
        type="button"
        onClick={open}
        className="flex min-w-0 flex-1 items-baseline gap-3 text-left hover:underline"
      >
        <span className={`min-w-0 flex-1 truncate text-sm ${stop?.lodging_name ? "text-ink" : "text-muted"}`}>
          {stop?.lodging_name ?? "Dizer onde vai dormir"}
        </span>
        {/* The price is the whole stay's, so it is shown once — repeating it on
            every night would read as a nightly rate. */}
        {firstNight && stop && stop.lodging_cost_cents > 0 && (
          <span className="shrink-0 font-mono text-xs text-muted">
            {formatMoney(stop.lodging_cost_cents, currency)} a estadia
          </span>
        )}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Editar hospedagem"
        onClick={open}
        className="-my-2 shrink-0 text-muted"
      >
        <Pencil />
      </Button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-y border-line py-2.5">{children}</div>
  );
}
