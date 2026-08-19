"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/trips";
import { createClient } from "@/lib/supabase/server";
import { timezoneFor } from "@/lib/tz";

export type NewStopInput = {
  tripId: string;
  name: string;
  region: string | null;
  country: string | null;
  code: string;
  lat: number;
  lng: number;
  /** Absolute instants. The panel converts the city's wall clock into these. */
  arriveAt: string;
  departAt: string;
};

export async function createStop(input: NewStopInput): Promise<ActionResult> {
  const supabase = await createClient();

  if (Date.parse(input.departAt) < Date.parse(input.arriveAt)) {
    return { ok: false, message: "A saída não pode ser antes da chegada." };
  }

  const { error } = await supabase.from("stops").insert({
    trip_id: input.tripId,
    name: input.name,
    region: input.region,
    country: input.country,
    code: input.code.toUpperCase().slice(0, 3),
    lat: input.lat,
    lng: input.lng,
    tz: timezoneFor(input.lat, input.lng),
    arrive_at: input.arriveAt,
    depart_at: input.departAt,
  });

  if (error) return { ok: false, message: error.message };

  // The database reconciles the legs; the page only has to read them again.
  revalidatePath(`/app/trips/${input.tripId}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function updateStop(
  stopId: string,
  tripId: string,
  patch: {
    arriveAt?: string;
    departAt?: string;
    code?: string;
    lodging_name?: string | null;
    lodging_address?: string | null;
    lodging_url?: string | null;
    lodging_cost_cents?: number;
    notes?: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();

  if (
    patch.arriveAt &&
    patch.departAt &&
    Date.parse(patch.departAt) < Date.parse(patch.arriveAt)
  ) {
    return { ok: false, message: "A saída não pode ser antes da chegada." };
  }

  const { arriveAt, departAt, code, ...rest } = patch;
  const { error } = await supabase
    .from("stops")
    .update({
      ...rest,
      ...(arriveAt ? { arrive_at: arriveAt } : {}),
      ...(departAt ? { depart_at: departAt } : {}),
      ...(code ? { code: code.toUpperCase().slice(0, 3) } : {}),
    })
    .eq("id", stopId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${tripId}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteStop(stopId: string, tripId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("stops").delete().eq("id", stopId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/app/trips/${tripId}`);
  revalidatePath("/app");
  return { ok: true };
}
