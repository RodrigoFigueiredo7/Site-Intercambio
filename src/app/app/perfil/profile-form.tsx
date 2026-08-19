"use client";

import { useState, useTransition } from "react";

import { CitySearch, type CityResult } from "@/components/places/city-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/db/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [base, setBase] = useState({
    city: profile.home_city,
    lat: profile.home_lat,
    lng: profile.home_lng,
    code: profile.home_code,
  });
  const [status, setStatus] = useState<{ kind: "idle" | "saved" } | { kind: "error"; message: string }>({
    kind: "idle",
  });
  // Coordinates only exist for a city picked from the list. Typing a name and
  // saving used to keep the old base without saying so.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function onCity(city: CityResult) {
    setBase({ city: city.name, lat: city.lat, lng: city.lng, code: city.code });
    setUnconfirmed(false);
  }

  function onSubmit(formData: FormData) {
    if (unconfirmed) {
      setStatus({
        kind: "error",
        message: "Escolha a cidade na lista que aparece abaixo do campo — é dela que saem as coordenadas do mapa.",
      });
      return;
    }
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await updateProfile(formData);
      setStatus(result.ok ? { kind: "saved" } : { kind: "error", message: result.message });
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-7">
      <div>
        <Label htmlFor="display-name">Seu nome</Label>
        <Input
          id="display-name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          maxLength={80}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="home-city">Cidade base</Label>
        <CitySearch
          id="home-city"
          initialValue={profile.home_city}
          onSelect={onCity}
          onType={(text) => setUnconfirmed(text.trim() !== base.city)}
          className="mt-2"
        />
        <input type="hidden" name="home_city" value={base.city} />
        <input type="hidden" name="home_lat" value={base.lat} />
        <input type="hidden" name="home_lng" value={base.lng} />
        <p className="mt-2 font-mono text-xs text-muted">
          {base.city} · {base.lat.toFixed(4)}, {base.lng.toFixed(4)}
        </p>
        {unconfirmed ? (
          <p className="mt-1.5 text-xs text-danger">
            Ainda não escolhido. Toque num resultado da lista para gravar a nova base —
            enquanto isso, a base continua sendo {base.city}.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            É de onde suas viagens saem no mapa. A linha acima mostra o que será salvo.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <div className="w-28">
          <Label htmlFor="home-code">Código</Label>
          <Input
            id="home-code"
            name="home_code"
            value={base.code}
            onChange={(event) =>
              setBase((current) => ({
                ...current,
                code: event.target.value.toUpperCase().slice(0, 3),
              }))
            }
            maxLength={3}
            className="mt-2 font-mono"
          />
        </div>
        <div className="w-32">
          <Label htmlFor="currency">Moeda</Label>
          <select
            id="currency"
            name="currency"
            defaultValue={profile.currency}
            className="mt-2 h-11 w-full rounded-field border border-line bg-surface px-3 text-base text-ink"
          >
            <option value="EUR">EUR</option>
            <option value="BRL">BRL</option>
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="fx">Euro em reais</Label>
          <Input
            id="fx"
            name="fx_brl"
            type="number"
            step="0.0001"
            min="0.0001"
            defaultValue={Number(profile.fx_brl).toFixed(4)}
            className="mt-2 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        {status.kind === "saved" && (
          <span role="status" className="font-mono text-xs text-accent">
            salvo
          </span>
        )}
        {status.kind === "error" && (
          <span role="alert" className="text-sm text-danger">
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
