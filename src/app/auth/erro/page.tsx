import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="label-caps">Entrada</p>
        <h1 className="mt-2 text-title font-semibold">
          Não deu para entrar
        </h1>
        <p className="mt-3 text-base text-muted">
          O link pode ter expirado ou já ter sido usado. Peça outro e tente de
          novo.
        </p>
        {motivo && (
          <p className="mt-4 rounded-field border border-line bg-surface p-3 font-mono text-xs text-muted">
            {motivo}
          </p>
        )}
        <Button asChild size="block" className="mt-6">
          <Link href="/">Voltar para a entrada</Link>
        </Button>
      </div>
    </main>
  );
}
