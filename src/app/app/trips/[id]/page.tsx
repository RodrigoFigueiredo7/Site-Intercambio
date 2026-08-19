import { notFound, redirect } from "next/navigation";

import { TripView } from "@/app/app/trips/[id]/trip-view";
import type { Leg, Profile, Stop, Trip } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profile }, { data: trip }, { data: stops }, { data: legs }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, home_city, home_lat, home_lng, home_code, currency, fx_brl")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
      supabase.from("trips").select("*").eq("id", id).maybeSingle<Trip>(),
      supabase.from("stops").select("*").eq("trip_id", id).order("arrive_at").returns<Stop[]>(),
      // Inactive legs hold booking details for pairs that are not consecutive
      // right now. They stay in the database and out of the route.
      supabase.from("legs").select("*").eq("trip_id", id).eq("is_active", true).returns<Leg[]>(),
    ]);

  if (!trip || !profile) notFound();

  return (
    <TripView
      trip={{ ...trip, stops: stops ?? [], legs: legs ?? [] }}
      profile={profile}
    />
  );
}
