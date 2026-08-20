import { redirect } from "next/navigation";

import { SignInPanel } from "@/components/auth/sign-in-panel";
import { BRAND } from "@/lib/brand";
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
        <h1 className="font-display text-display font-bold">{BRAND}</h1>
        <p className="mt-3 text-base text-muted">
          O mapa do intercâmbio: onde eu estou agora, para onde vou depois e como
          foi cada viagem. Entre para editar.
        </p>

        <div className="mt-8">
          <SignInPanel />
        </div>
      </div>
    </main>
  );
}
