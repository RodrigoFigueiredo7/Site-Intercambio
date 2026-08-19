"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/trips";
import type { LegStatus, TransportMode } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Legs are created and ordered by the database. What a person owns is what
 * they chose and paid — that is all this writes.
 */
export async function updateLeg(
  legId: string,
  tripId: string,
  patch: {
    mode?: TransportMode | null;
    operator?: string | null;
    cost_cents?: number;
    booking_url?: string | null;
    booking_ref?: string | null;
    status?: LegStatus;
    notes?: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();

  if (patch.cost_cents !== undefined && patch.cost_cents < 0) {
    return { ok: false, message: "O custo não pode ser negativo." };
  }

  const { error } = await supabase.from("legs").update(patch).eq("id", legId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${tripId}`);
  revalidatePath("/app");
  return { ok: true };
}
