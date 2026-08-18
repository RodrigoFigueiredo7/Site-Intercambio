"use server";

import { revalidatePath } from "next/cache";

import { nextTripColor } from "@/lib/map/colors";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function createTrip(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Entre de novo." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Dê um nome para a viagem." };

  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "") || null;
  const endDate = String(formData.get("end_date") ?? "") || null;

  if (startDate && endDate && endDate < startDate) {
    return { ok: false, message: "A volta não pode ser antes da ida." };
  }

  // Colour comes from the palette in creation order, so counting is enough.
  const { count, error: countError } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) return { ok: false, message: countError.message };

  const { error } = await supabase.from("trips").insert({
    owner_id: user.id,
    name,
    emoji,
    color: nextTripColor(count ?? 0),
    start_date: startDate,
    end_date: endDate,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/app");
  return { ok: true };
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/app");
  return { ok: true };
}
