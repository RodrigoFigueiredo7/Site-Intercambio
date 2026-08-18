import { AIR_OR_SEA } from "@/lib/map/colors";
import type { Stop } from "@/lib/trip-route";
import { cn } from "@/lib/utils";

/**
 * The signature element: a whole trip on one line.
 *
 *   ●━━━━━━●━━━━━━●╌╌╌╌╌╌●━━━━━━●
 *   BCN    PRG    VIE    KRK    BCN
 *
 * Dashed where the leg flies or sails, so it mirrors the map exactly — the
 * same information at two densities.
 *
 * Columns alternate stop / connector / stop, so stop `i` sits at column
 * `2i + 1` and the connector that reaches it at column `2i`. Both rows are
 * placed explicitly; auto-placement would let the codes drift out from under
 * their dots.
 */
export function RouteStrip({
  stops,
  color,
  className,
}: {
  stops: Stop[];
  color: string;
  className?: string;
}) {
  if (stops.length === 0) {
    return (
      <p className={cn("font-mono text-xs text-muted", className)}>sem trechos ainda</p>
    );
  }

  const template = stops.map(() => "auto").join(" 1fr ");

  return (
    <div
      className={cn("grid items-center gap-y-1.5", className)}
      style={{ gridTemplateColumns: template }}
      role="img"
      aria-label={`Rota: ${stops
        .map((stop) => stop.place.code ?? stop.place.name)
        .join(", ")}`}
    >
      {stops.map((stop, index) => {
        const column = 2 * index + 1;
        const dashed = stop.arrivedBy ? AIR_OR_SEA.has(stop.arrivedBy.mode) : false;

        return (
          <div key={`${stop.place.id}-${index}`} className="contents">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="h-px w-full"
                style={{
                  gridRow: 1,
                  gridColumn: column - 1,
                  ...(dashed
                    ? {
                        backgroundImage: `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`,
                      }
                    : { backgroundColor: color }),
                }}
              />
            )}
            <span
              aria-hidden="true"
              className="size-1.5 justify-self-center rounded-full"
              style={{ gridRow: 1, gridColumn: column, backgroundColor: color }}
            />
            <span
              className="justify-self-center font-mono text-label tracking-[0.06em] text-muted"
              style={{ gridRow: 2, gridColumn: column }}
            >
              {stop.place.code ?? stop.place.name.slice(0, 3).toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
