/**
 * Colours that JavaScript draws — on the Leaflet canvas, in an inline style —
 * rather than applying through a Tailwind class. They live here, in one place,
 * for the same reason the interface colours live in globals.css: so that no
 * component ever writes a hex value of its own.
 *
 * A trip's colour is also persisted in `trips.color`, which is why this list
 * has to exist in TypeScript and not only as a CSS custom property.
 */

/** Assigned in creation order, wrapping after the sixth trip. */
export const TRIP_PALETTE = [
  "#0B5D51",
  "#C1442E",
  "#2B5FAD",
  "#B07D2A",
  "#6B4E9E",
  "#197A8C",
] as const;

export function nextTripColor(existingTripCount: number): string {
  return TRIP_PALETTE[existingTripCount % TRIP_PALETTE.length];
}

export const MODE_COLORS = {
  train: "#2B5FAD",
  bus: "#C1442E",
  plane: "#6B4E9E",
  ferry: "#197A8C",
  car: "#6C7683",
  walk: "#6C7683",
} as const;

/** Plane and ferry draw dashed with a wider arc; ground transport runs nearly straight. */
export const AIR_OR_SEA = new Set(["plane", "ferry"]);
