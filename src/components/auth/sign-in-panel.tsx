"use client";

import { useState } from "react";

import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function SignInPanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const busy = status.kind === "sending";

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser navigates away, so only failure lands here.
    if (error) setStatus({ kind: "error", message: error.message });
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(
      error ? { kind: "error", message: error.message } : { kind: "sent", email },
    );
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <p className="label-caps">Link enviado</p>
        <p className="mt-3 text-base text-ink">
          Abra o e-mail que acabou de chegar em{" "}
          <span className="font-mono text-sm">{status.email}</span> e toque no link
          para entrar.
        </p>
        <p className="mt-2 text-xs text-muted">
          O link vale por uma hora e abre em uma aba só. Se não chegou, confira o
          spam.
        </p>
        <Button
          variant="ghost"
          size="block"
          className="mt-4"
          onClick={() => setStatus({ kind: "idle" })}
        >
          Usar outro e-mail
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <Button
        variant="outline"
        size="block"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        <GoogleMark className="size-[18px]" />
        Entrar com Google
      </Button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="label-caps">ou</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={sendMagicLink}>
        <Label htmlFor="email">Seu e-mail</Label>
        <Input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={busy}
          className="mt-2"
        />
        <Button type="submit" size="block" className="mt-3" disabled={busy}>
          {busy ? "Enviando…" : "Receber link de acesso"}
        </Button>
      </form>

      {status.kind === "error" && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {status.message}
        </p>
      )}
    </div>
  );
}
