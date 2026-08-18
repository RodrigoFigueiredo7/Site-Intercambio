import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ProfileForm } from "@/app/app/perfil/profile-form";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, home_city, home_lat, home_lng, home_code, currency, fx_brl")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/app");

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center gap-1 border-b border-line px-5">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app" aria-label="Voltar para a base">
            <ArrowLeft />
          </Link>
        </Button>
        <span className="font-display text-section font-bold">Perfil</span>
      </header>

      <main className="px-5 py-10">
        <div className="mx-auto max-w-md">
          <p className="label-caps">Conectado como</p>
          <p className="mt-2 font-mono text-sm text-ink">{user.email}</p>

          <div className="mt-9 border-t border-line pt-9">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </main>
    </div>
  );
}
