import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  display_name: string | null;
  home_city: string;
  home_code: string;
  home_lat: number;
  home_lng: number;
  currency: string;
  fx_brl: number;
};

export default async function BasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Created by the on_auth_user_created trigger at first sign-in. The base
  // city and its coordinates come from the column defaults in schema.sql —
  // never from a value written here.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, home_city, home_code, home_lat, home_lng, currency, fx_brl")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b border-line px-5">
        <span className="font-display text-section font-bold">Rota</span>
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            Sair
          </Button>
        </form>
      </header>

      <main className="px-5 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="label-caps">Conectado como</p>
          <p className="mt-2 font-mono text-sm text-ink">{user.email}</p>

          {profile ? (
            <section className="mt-10">
              <p className="label-caps">Sua base</p>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-display text-title font-bold">
                  {profile.home_city}
                </span>
                <span className="font-mono text-sm text-muted">
                  {profile.home_code}
                </span>
              </div>

              <dl className="mt-6 border-t border-line">
                <div className="flex items-baseline justify-between border-b border-line py-3">
                  <dt className="label-caps">Coordenadas</dt>
                  <dd className="font-mono text-sm">
                    {profile.home_lat.toFixed(4)}, {profile.home_lng.toFixed(4)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-b border-line py-3">
                  <dt className="label-caps">Moeda</dt>
                  <dd className="font-mono text-sm">{profile.currency}</dd>
                </div>
                <div className="flex items-baseline justify-between border-b border-line py-3">
                  <dt className="label-caps">Câmbio BRL</dt>
                  <dd className="font-mono text-sm">
                    {Number(profile.fx_brl).toFixed(4)}
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <p role="alert" className="mt-10 text-sm text-danger">
              Perfil não encontrado para este usuário
              {error ? `: ${error.message}` : "."} Confira se o schema.sql foi
              executado por inteiro no SQL Editor do Supabase.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
