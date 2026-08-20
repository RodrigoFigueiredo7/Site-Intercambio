"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ItemCategory } from "@/lib/db/types";
import { centsToInput, parseMoneyToCents } from "@/lib/format";

export const CATEGORIES: Array<{ value: ItemCategory; label: string }> = [
  { value: "activity", label: "Passeio" },
  { value: "food", label: "Comida" },
  { value: "lodging", label: "Hospedagem" },
  { value: "other", label: "Outro" },
];

export type ItemDraft = {
  title: string;
  time: string;
  cost: string;
  category: ItemCategory;
};

export function emptyDraft(): ItemDraft {
  return { title: "", time: "", cost: "", category: "activity" };
}

export function draftFrom(item: {
  title: string;
  start_time: string | null;
  cost_cents: number;
  category: ItemCategory;
}): ItemDraft {
  return {
    title: item.title,
    time: item.start_time ? item.start_time.slice(0, 5) : "",
    cost: item.cost_cents > 0 ? centsToInput(item.cost_cents) : "",
    category: item.category,
  };
}

/** What the draft means once the money is an integer again. Null if it isn't. */
export function readDraft(draft: ItemDraft) {
  const cents = parseMoneyToCents(draft.cost);
  if (cents === null) return null;
  return {
    title: draft.title.trim(),
    start_time: draft.time || null,
    cost_cents: cents,
    category: draft.category,
  };
}

/**
 * One row of fields, shared by adding and by editing — the two are the same
 * shape, and a person who learned one has learned the other.
 */
export function ItemFields({
  draft,
  onChange,
  idPrefix,
  titleRef,
  labels = false,
}: {
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  idPrefix: string;
  titleRef?: React.Ref<HTMLInputElement>;
  labels?: boolean;
}) {
  const showLabels = labels;

  return (
    <div className="space-y-2">
      {/* What happens is the wide field and comes first; the three short ones
          share the line below, so the row never wraps into an orphan. */}
      <div>
        {showLabels && <Label htmlFor={`${idPrefix}-titulo`}>O que acontece</Label>}
        <Input
          id={`${idPrefix}-titulo`}
          ref={titleRef}
          aria-label="O que acontece"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="o que acontece"
          className={showLabels ? "mt-1.5" : undefined}
        />
      </div>

      <div className="flex items-end gap-2">
        <div className="w-[5.5rem] shrink-0">
          {showLabels && <Label htmlFor={`${idPrefix}-hora`}>Hora</Label>}
          <Input
            id={`${idPrefix}-hora`}
            type="time"
            aria-label="Hora"
            value={draft.time}
            onChange={(event) => onChange({ ...draft, time: event.target.value })}
            className={showLabels ? "mt-1.5 px-2 font-mono" : "px-2 font-mono"}
          />
        </div>

        <div className="min-w-0 flex-1">
          {showLabels && <Label htmlFor={`${idPrefix}-cat`}>Categoria</Label>}
          <Select
            id={`${idPrefix}-cat`}
            aria-label="Categoria"
            value={draft.category}
            onChange={(event) =>
              onChange({ ...draft, category: event.target.value as ItemDraft["category"] })
            }
            className={showLabels ? "mt-1.5 text-sm" : "text-sm"}
          >
            {CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-[5.5rem] shrink-0">
          {showLabels && <Label htmlFor={`${idPrefix}-custo`}>Custo</Label>}
          <Input
            id={`${idPrefix}-custo`}
            aria-label="Custo"
            value={draft.cost}
            onChange={(event) => onChange({ ...draft, cost: event.target.value })}
            inputMode="decimal"
            placeholder="0,00"
            className={showLabels ? "mt-1.5 px-2 font-mono" : "px-2 font-mono"}
          />
        </div>
      </div>
    </div>
  );
}
