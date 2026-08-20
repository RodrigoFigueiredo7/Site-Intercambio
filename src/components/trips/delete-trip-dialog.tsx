"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTrip } from "@/lib/actions/trips";

/**
 * Deleting is final — the database takes the stops, the legs and everything on
 * the days with it. So the dialog says out loud what disappears, counted, and
 * never asks a bare "are you sure?".
 */
export function DeleteTripDialog({
  tripId,
  tripName,
  stopCount,
  itemCount,
  redirectTo,
}: {
  tripId: string;
  tripName: string;
  stopCount: number;
  itemCount: number;
  /** Where to go once it is gone. The trip's own page cannot stay open. */
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTrip(tripId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  const losses = [
    stopCount > 0 ? `${stopCount} ${stopCount === 1 ? "parada" : "paradas"}` : null,
    itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item" : "itens"} dos dias` : null,
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Excluir a viagem ${tripName}`}>
          <Trash2 />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Excluir {tripName}?</DialogTitle>
        <DialogDescription>
          {losses.length === 0
            ? "Esta viagem ainda não tem nada dentro."
            : `Isto apaga também ${losses.join(" e ")}, junto com os deslocamentos e o que você anotou de reserva.`}{" "}
          Não dá para desfazer.
        </DialogDescription>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1" disabled={pending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button variant="danger" className="flex-1" onClick={confirm} disabled={pending}>
            {pending ? "Excluindo…" : "Excluir viagem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
