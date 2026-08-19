"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/trips";
import type { ItemCategory } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export async function createItem(input: {
  tripId: string;
  stopId: string | null;
  day: string;
  startTime: string | null;
  category: ItemCategory;
  title: string;
  costCents: number;
  notes: string | null;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: "Dê um título para o item." };
  if (input.costCents < 0) return { ok: false, message: "O custo não pode ser negativo." };

  const supabase = await createClient();
  const { error } = await supabase.from("items").insert({
    trip_id: input.tripId,
    stop_id: input.stopId,
    day: input.day,
    start_time: input.startTime,
    category: input.category,
    title,
    cost_cents: input.costCents,
    notes: input.notes,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${input.tripId}`);
  return { ok: true };
}

export async function updateItem(
  itemId: string,
  tripId: string,
  patch: {
    start_time?: string | null;
    category?: ItemCategory;
    title?: string;
    cost_cents?: number;
    notes?: string | null;
  },
): Promise<ActionResult> {
  if (patch.title !== undefined && patch.title.trim() === "") {
    return { ok: false, message: "O título não pode ficar vazio." };
  }
  if (patch.cost_cents !== undefined && patch.cost_cents < 0) {
    return { ok: false, message: "O custo não pode ser negativo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("items").update(patch).eq("id", itemId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${tripId}`);
  return { ok: true };
}

export async function deleteItem(itemId: string, tripId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${tripId}`);
  return { ok: true };
}
