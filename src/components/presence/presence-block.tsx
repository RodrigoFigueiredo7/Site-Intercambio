import Link from "next/link";

import { LocalClock } from "@/components/presence/local-clock";
import type { Profile, TripWithRoute } from "@/lib/db/types";
import { firstName } from "@/lib/brand";
import { formatDayCount } from "@/lib/format";
import { flagOfTimezone } from "@/lib/geo/country";
import { presence } from "@/lib/presence";
import { daysBetween, localDay } from "@/lib/trip-route";
import { formatLocal, localTime } from "@/lib/tz";

/**
 * The answer to the question in the title, at the top of the screen, before
 * anything has to be scrolled. Everything in it is derived: no field anywhere
 * says where the person is.
 */
export function PresenceBlock({
  profile,
  trips,
  now,
}: {
  profile: Profile;
  trips: TripWithRoute[];
  now: Date;
}) {
  const who = firstName(profile.display_name);
  const where = presence(trips, now);

  if (where.kind === "parado") {
    const { stop, trip, nightsSoFar } = where;
    return (
      <Frame
        label="Agora"
        headline={
          <>
            {who} está em <Place name={stop.name} tz={stop.tz} />
          </>
        }
        tripId={trip.id}
        tripName={trip.name}
        tripColor={trip.color}
      >
        <span>
          <LocalClock tz={stop.tz} initial={localTime(now.toISOString(), stop.tz)} /> na
          cidade
        </span>
        <span>
          {nightsSoFar === 0
            ? "chegou hoje"
            : `já dormiu ${nightsSoFar} ${nightsSoFar === 1 ? "noite" : "noites"}`}
        </span>
        <span>sai {formatLocal(stop.depart_at, stop.tz, "d MMM · HH:mm")}</span>
      </Frame>
    );
  }

  if (where.kind === "movendo") {
    const { from, to, trip } = where;
    return (
      <Frame
        label="Agora"
        headline={
          <>
            {who} está a caminho de <Place name={to.name} tz={to.tz} />
          </>
        }
        tripId={trip.id}
        tripName={trip.name}
        tripColor={trip.color}
      >
        <span>saiu de {from.name}</span>
        <span>chega {formatLocal(to.arrive_at, to.tz, "d MMM · HH:mm")}</span>
      </Frame>
    );
  }

  const { next } = where;
  return (
    <Frame
      label="Agora"
      headline={
        <>
          {who} está em casa, em {profile.home_city}
        </>
      }
      tripId={next?.trip.id ?? null}
      tripName={next?.trip.name ?? null}
      tripColor={next?.trip.color ?? null}
    >
      {next ? (
        <>
          <span>
            próxima parada: {next.stop.name} <Flag tz={next.stop.tz} />
          </span>
          <span>
            {formatDayCount(
              daysBetween(
                localDay(now.toISOString(), next.stop.tz),
                localDay(next.stop.arrive_at, next.stop.tz),
              ),
            )}
          </span>
        </>
      ) : (
        <span>nenhuma viagem marcada ainda</span>
      )}
    </Frame>
  );
}

/**
 * A city and its flag, kept on one line. The flag is set smaller than the
 * headline: an emoji rendered at 30px is a second headline, not a mark.
 */
function Place({ name, tz }: { name: string; tz: string }) {
  const flag = flagOfTimezone(tz);
  return (
    <span className="whitespace-nowrap">
      {name}
      {flag && (
        <span aria-hidden="true" className="ml-2 align-middle text-[0.6em]">
          {flag}
        </span>
      )}
    </span>
  );
}

function Flag({ tz }: { tz: string }) {
  const flag = flagOfTimezone(tz);
  if (!flag) return null;
  return <span aria-hidden="true">{flag}</span>;
}

function Frame({
  label,
  headline,
  tripId,
  tripName,
  tripColor,
  children,
}: {
  label: string;
  headline: React.ReactNode;
  tripId: string | null;
  tripName: string | null;
  tripColor: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-5 py-6">
      <p className="label-caps">{label}</p>
      <h2 className="mt-2 font-display text-title font-bold">{headline}</h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
        {children}
      </div>

      {tripId && tripName && (
        <Link
          href={`/app/trips/${tripId}`}
          className="mt-4 inline-flex items-center gap-2 text-sm text-ink hover:underline"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: tripColor ?? undefined }}
          />
          {tripName}
        </Link>
      )}
    </section>
  );
}
