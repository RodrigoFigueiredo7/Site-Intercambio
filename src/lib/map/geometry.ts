export type LatLng = [number, number];

/**
 * A quadratic arc between two points, sampled as a polyline.
 *
 * The map draws geometric arcs, never real routes — a real one needs a paid
 * routing API and changes nothing about planning. The curve exists so that two
 * legs between the same pair of cities stay distinguishable, and so that a
 * flight reads differently from a train.
 */
export function arcBetween(from: LatLng, to: LatLng, curvature: number, samples = 48): LatLng[] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;

  // Control point: the midpoint pushed perpendicular to the line between ends.
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const controlLat = midLat + dLng * curvature;
  const controlLng = midLng - dLat * curvature;

  const points: LatLng[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const inv = 1 - t;
    points.push([
      inv * inv * lat1 + 2 * inv * t * controlLat + t * t * lat2,
      inv * inv * lng1 + 2 * inv * t * controlLng + t * t * lng2,
    ]);
  }
  return points;
}

/** Ground transport runs nearly straight; air and sea bow out further. */
export const CURVATURE = { ground: 0.08, air: 0.18 } as const;
