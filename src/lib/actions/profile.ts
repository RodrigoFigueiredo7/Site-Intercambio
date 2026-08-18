"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/trips";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Entre de novo." };

  const homeCity = String(formData.get("home_city") ?? "").trim();
  if (!homeCity) return { ok: false, message: "A base precisa de uma cidade." };

  const lat = Number(formData.get("home_lat"));
  const lng = Number(formData.get("home_lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: "Escolha a cidade na lista da busca para gravar a localização." };
  }

  const fx = Number(formData.get("fx_brl"));
  if (!Number.isFinite(fx) || fx <= 0) {
    return { ok: false, message: "A cotação precisa ser um número maior que zero." };
  }

  const currency = String(formData.get("currency") ?? "EUR");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: String(formData.get("display_name") ?? "").trim() || null,
      home_city: homeCity,
      home_lat: lat,
      home_lng: lng,
      home_code: String(formData.get("home_code") ?? "").trim().toUpperCase().slice(0, 3),
      currency: currency === "BRL" ? "BRL" : "EUR",
      fx_brl: fx,
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/app");
  revalidatePath("/app/perfil");
  return { ok: true };
}
