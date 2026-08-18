"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTrip } from "@/lib/actions/trips";
import { nextTripColor } from "@/lib/map/colors";

const QUICK_EMOJI = ["🚆", "✈️", "🏔️", "🏖️", "🍷", "🎒", "🏛️", "❄️"];

export function NewTripDialog({ tripCount }: { tripCount: number }) {
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The next trip's colour is decided by creation order, so it can be shown
  // before the trip exists.
  const color = nextTripColor(tripCount);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTrip(formData);
      if (result.ok) {
        setOpen(false);
        setEmoji("");
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="pill">
          <Plus />
          Nova viagem
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Nova viagem</DialogTitle>
        <DialogDescription>
          As cidades entram depois, quando você cadastrar o primeiro trecho.
        </DialogDescription>

        <form action={onSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <Label htmlFor="trip-name">Nome</Label>
            <div className="mt-2 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <Input
                id="trip-name"
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="Mochilão de outubro"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Esta é a cor desta viagem no mapa, escolhida pela ordem de criação.
            </p>
          </div>

          <div>
            <Label htmlFor="trip-emoji">Emoji</Label>
            <input type="hidden" name="emoji" value={emoji} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_EMOJI.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEmoji(emoji === option ? "" : option)}
                  aria-pressed={emoji === option}
                  className={`flex size-11 items-center justify-center rounded-field border text-lg ${
                    emoji === option
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface hover:bg-paper"
                  }`}
                >
                  {option}
                </button>
              ))}
              <Input
                id="trip-emoji"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value.slice(0, 4))}
                aria-label="Outro emoji"
                placeholder="outro"
                className="w-24"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="trip-start">Ida</Label>
              <Input id="trip-start" name="start_date" type="date" className="mt-2" />
            </div>
            <div className="flex-1">
              <Label htmlFor="trip-end">Volta</Label>
              <Input id="trip-end" name="end_date" type="date" className="mt-2" />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="block" disabled={pending}>
            {pending ? "Criando…" : "Criar viagem"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
