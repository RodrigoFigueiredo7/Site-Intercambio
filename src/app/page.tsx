import { redirect } from "next/navigation";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/app");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-display font-bold">Rota</h1>
        <p className="mt-3 text-base text-muted">
          Planeje as viagens do seu intercâmbio. Cada trecho que você cadastra
          vira um ramo colorido saindo da sua base no mapa.
        </p>

        <div className="mt-8">
          <SignInPanel />
        </div>
      </div>
    </main>
  );
}
