import { redirect } from "next/navigation";

import { BaseView } from "@/app/app/base-view";
import type { Leg, Place, Profile, Trip, TripWithRoute } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export default async function BasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Created by the on_auth_user_created trigger at first sign-in. The base city
  // and its coordinates come from the column defaults in schema.sql — never
  // from a value written here.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, home_city, home_lat, home_lng, home_code, currency, fx_brl")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p role="alert" className="max-w-sm text-sm text-danger">
          Perfil não encontrado para este usuário{error ? `: ${error.message}` : "."} Confira
          se o schema.sql foi executado por inteiro no SQL Editor do Supabase.
        </p>
      </main>
    );
  }

  // RLS keeps all three queries to trips this user may read.
  const [{ data: trips }, { data: places }, { data: legs }] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Trip[]>(),
    supabase.from("places").select("*").returns<Place[]>(),
    supabase.from("legs").select("*").returns<Leg[]>(),
  ]);

  const withRoute: TripWithRoute[] = (trips ?? []).map((trip) => ({
    ...trip,
    places: (places ?? []).filter((place) => place.trip_id === trip.id),
    legs: (legs ?? []).filter((leg) => leg.trip_id === trip.id),
  }));

  return <BaseView profile={profile} trips={withRoute} />;
}
