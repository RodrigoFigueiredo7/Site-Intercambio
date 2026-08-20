"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";

import {
  CATEGORIES,
  ItemFields,
  draftFrom,
  readDraft,
  type ItemDraft,
} from "@/components/days/item-fields";
import { Button } from "@/components/ui/button";
import { deleteItem, updateItem } from "@/lib/actions/items";
import type { Item } from "@/lib/db/types";
import { formatMoney } from "@/lib/format";

/**
 * A line of the day's agenda. Reading it and changing it are the same row:
 * clicking turns the text into the very fields that created it, so a typo
 * costs one click instead of a delete and a retype.
 */
export function ItemRow({
  item,
  tripId,
  currency,
  onError,
}: {
  item: Item;
  tripId: string;
  currency: "EUR" | "BRL";
  onError: (message: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ItemDraft>(() => draftFrom(item));
  const [pending, startTransition] = useTransition();

  function open() {
    setDraft(draftFrom(item));
    onError(null);
    setEditing(true);
  }

  function save() {
    const patch = readDraft(draft);
    if (!patch) return onError("Valor inválido. Use algo como 12,50.");
    if (!patch.title) return onError("O título não pode ficar vazio.");

    onError(null);
    startTransition(async () => {
      const result = await updateItem(item.id, tripId, patch);
      if (result.ok) setEditing(false);
      else onError(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteItem(item.id, tripId);
      if (!result.ok) onError(result.message);
    });
  }

  if (editing) {
    return (
      <li className="border-b border-line py-3 last:border-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
        >
          <ItemFields draft={draft} onChange={setDraft} idPrefix={`edit-${item.id}`} />

          <div className="mt-2 flex items-center gap-2">
            <Button type="submit" size="icon" aria-label="Salvar" disabled={pending}>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remover ${item.title}`}
              onClick={remove}
              disabled={pending}
              className="ml-auto text-muted hover:text-danger"
            >
              <Trash2 />
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={open}
        className="flex w-full items-baseline gap-3 py-2.5 text-left hover:bg-paper"
      >
        <span className="w-11 shrink-0 font-mono text-xs text-muted">
          {item.start_time ? item.start_time.slice(0, 5) : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</span>
        <span className="shrink-0 font-mono text-label uppercase tracking-[0.12em] text-muted">
          {CATEGORIES.find((category) => category.value === item.category)?.label}
        </span>
        <span className="w-16 shrink-0 text-right font-mono text-xs text-ink">
          {item.cost_cents > 0 ? formatMoney(item.cost_cents, currency) : ""}
        </span>
      </button>
    </li>
  );
}
