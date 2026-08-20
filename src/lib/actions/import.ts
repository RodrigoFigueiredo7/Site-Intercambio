"use server";

import { revalidatePath } from "next/cache";

import type { ItemCategory } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type ImportStay = {
  name: string;
  region: string | null;
  country: string | null;
  code: string;
  lat: number;
  lng: number;
  tz: string;
  arriveAt: string;
  departAt: string;
};

export type ImportItem = {
  day: string;
  startTime: string | null;
  title: string;
  costCents: number;
  category: ItemCategory;
};

export type ImportResult =
  | { ok: true; stops: number; items: number }
  | { ok: false; message: string };

/**
 * Writes a whole block of pasted plan at once.
 *
 * The stops go in first and one at a time: each insert fires the database's
 * reconcile_legs, and letting them race would have the trigger reordering a
 * route that is still half-written. The items follow in a single insert, and
 * each is attached to whichever stop covers its day — the same rule the Days
 * tab reads by, so an imported item lands exactly where a typed one would.
 */
export async function importPlan(input: {
  tripId: string;
  stays: ImportStay[];
  items: ImportItem[];
}): Promise<ImportResult> {
  const supabase = await createClient();

  for (const stay of input.stays) {
    if (Date.parse(stay.departAt) < Date.parse(stay.arriveAt)) {
      return { ok: false, message: `A saída de ${stay.name} está antes da chegada.` };
    }
  }

  let stops = 0;
  for (const stay of input.stays) {
    const { error } = await supabase.from("stops").insert({
      trip_id: input.tripId,
      name: stay.name,
      region: stay.region,
      country: stay.country,
      code: stay.code,
      lat: stay.lat,
      lng: stay.lng,
      tz: stay.tz,
      arrive_at: stay.arriveAt,
      depart_at: stay.departAt,
    });
    if (error) return { ok: false, message: `${stay.name}: ${error.message}` };
    stops += 1;
  }

  let items = 0;
  if (input.items.length > 0) {
    // Read the stops back — including any that already existed — so an item
    // can name the stop whose window covers its day.
    const { data: saved, error: readError } = await supabase
      .from("stops")
      .select("id, tz, arrive_at, depart_at")
      .eq("trip_id", input.tripId);

    if (readError) return { ok: false, message: readError.message };

    const localDay = (iso: string, tz: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso));

    const spans = (saved ?? []).map((stop) => ({
      id: stop.id,
      from: localDay(stop.arrive_at, stop.tz),
      to: localDay(stop.depart_at, stop.tz),
    }));

    const rows = input.items.map((item) => ({
      trip_id: input.tripId,
      stop_id: spans.find((span) => span.from <= item.day && item.day <= span.to)?.id ?? null,
      day: item.day,
      start_time: item.startTime,
      category: item.category,
      title: item.title,
      cost_cents: item.costCents,
    }));

    const { error } = await supabase.from("items").insert(rows);
    if (error) return { ok: false, message: error.message };
    items = rows.length;
  }

  revalidatePath(`/app/trips/${input.tripId}`);
  revalidatePath("/app");
  return { ok: true, stops, items };
}
