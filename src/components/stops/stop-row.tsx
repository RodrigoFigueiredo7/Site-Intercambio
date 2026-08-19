"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteStop, updateStop } from "@/lib/actions/stops";
import type { Stop } from "@/lib/db/types";
import { centsToInput, formatMoney, parseMoneyToCents } from "@/lib/format";
import { nights } from "@/lib/trip-route";
import { formatLocal, instantFromLocal, localInputValue } from "@/lib/tz";
import { cn } from "@/lib/utils";

export function StopRow({
  stop,
  tripId,
  currency,
  selected,
  onSelect,
}: {
  stop: Stop;
  tripId: string;
  currency: "EUR" | "BRL";
  selected: boolean;
  onSelect: (stopId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [arrive, setArrive] = useState(localInputValue(stop.arrive_at, stop.tz));
  const [depart, setDepart] = useState(localInputValue(stop.depart_at, stop.tz));
  const [lodging, setLodging] = useState(stop.lodging_name ?? "");
  const [lodgingCost, setLodgingCost] = useState(centsToInput(stop.lodging_cost_cents));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const n = nights(stop);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseMoneyToCents(lodgingCost);
    if (cents === null) {
      setError("Valor inválido. Use algo como 60,00.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateStop(stop.id, tripId, {
        arriveAt: instantFromLocal(arrive, stop.tz),
        departAt: instantFromLocal(depart, stop.tz),
        lodging_name: lodging.trim() || null,
        lodging_cost_cents: cents,
      });
      if (result.ok) setOpen(false);
      else setError(result.message);
    });
  }

  return (
    <div
      id={`parada-${stop.id}`}
      className={cn("border-b border-line px-5 py-4", selected && "bg-accent-soft/40")}
    >
      <button
        type="button"
        onClick={() => {
          onSelect(stop.id);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-muted">
            {stop.code ?? stop.name.slice(0, 3).toUpperCase()}
          </span>
          <span className="text-section font-semibold">{stop.name}</span>
          {stop.country && <span className="text-xs text-muted">{stop.country}</span>}
        </div>

        <p className="mt-1 font-mono text-xs text-muted">
          {formatLocal(stop.arrive_at, stop.tz)} → {formatLocal(stop.depart_at, stop.tz)}
        </p>

        <p className="mt-1.5 font-mono text-xs text-ink">
          {n === 0 ? "bate-volta" : `${n} ${n === 1 ? "noite" : "noites"}`}
          {stop.lodging_cost_cents > 0 && ` · ${formatMoney(stop.lodging_cost_cents, currency)}`}
          {stop.lodging_name && ` · ${stop.lodging_name}`}
        </p>
      </button>

      {open && (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3">
          <p className="font-mono text-xs text-muted">hora local · {stop.tz}</p>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-44 flex-1">
              <Label htmlFor={`a-${stop.id}`}>Chegada</Label>
              <Input
                id={`a-${stop.id}`}
                type="datetime-local"
                value={arrive}
                onChange={(event) => setArrive(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="min-w-44 flex-1">
              <Label htmlFor={`d-${stop.id}`}>Saída</Label>
              <Input
                id={`d-${stop.id}`}
                type="datetime-local"
                value={depart}
                onChange={(event) => setDepart(event.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-44 flex-1">
              <Label htmlFor={`h-${stop.id}`}>Hospedagem</Label>
              <Input
                id={`h-${stop.id}`}
                value={lodging}
                onChange={(event) => setLodging(event.target.value)}
                placeholder="onde você dorme"
                className="mt-1.5"
              />
            </div>
            <div className="w-32">
              <Label htmlFor={`hc-${stop.id}`}>Total</Label>
              <Input
                id={`hc-${stop.id}`}
                value={lodgingCost}
                onChange={(event) => setLodgingCost(event.target.value)}
                inputMode="decimal"
                className="mt-1.5 font-mono"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>

            {confirming ? (
              <>
                <span className="text-xs text-danger">
                  Apagar leva junto o que você anotou nos trechos que tocam esta parada.
                </span>
                <Button
                  type="button"
                  variant="danger"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteStop(stop.id, tripId);
                      if (!result.ok) setError(result.message);
                    })
                  }
                >
                  Apagar mesmo assim
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                  Manter
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(true)}
                className="ml-auto text-danger"
              >
                <Trash2 />
                Apagar parada
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
