export type CityResult = {
  name: string;
  country: string | null;
  lat: number;
  lng: number;
  code: string;
};

export type CitySearchResponse =
  | { results: CityResult[]; source: "photon" | "nominatim" }
  | { error: string };

/**
 * Asks our own server, which asks the geocoder.
 *
 * Going straight from the browser meant a blocked host, an ad blocker or a
 * strict network killed the single most important field in the app, and there
 * was nothing the app could do about it.
 */
export async function searchCities(
  query: string,
  signal: AbortSignal,
): Promise<CitySearchResponse> {
  const response = await fetch(`/api/cidades?q=${encodeURIComponent(query)}`, { signal });
  return (await response.json()) as CitySearchResponse;
}
