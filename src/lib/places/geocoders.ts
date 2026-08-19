import { cityCode } from "@/lib/format";
import type { CityResult } from "@/lib/places/city";

/**
 * Two free geocoders, neither needing a key. Photon is queried first because
 * it is built for live typing; Nominatim covers a Photon outage.
 *
 * The parsers are separate from the fetching so their shape handling can be
 * checked without a network.
 */

const TIMEOUT_MS = 4000;
const CACHE_SECONDS = 86_400;

type PhotonFeature = {
  properties?: { name?: string; city?: string; country?: string };
  geometry?: { coordinates?: [number, number] };
};

type NominatimPlace = {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: { country?: string };
};

function toCity(name: string, country: string | null, lat: number, lng: number): CityResult {
  return { name, country, lat, lng, code: cityCode(name) };
}

export function parsePhoton(data: unknown): CityResult[] {
  const features = (data as { features?: PhotonFeature[] })?.features ?? [];
  return features.flatMap((feature) => {
    const name = feature?.properties?.name ?? feature?.properties?.city;
    const coordinates = feature?.geometry?.coordinates;
    if (!name || !Array.isArray(coordinates) || coordinates.length < 2) return [];
    const [lng, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [toCity(name, feature.properties?.country ?? null, lat, lng)];
  });
}

export function parseNominatim(data: unknown): CityResult[] {
  const places = Array.isArray(data) ? (data as NominatimPlace[]) : [];
  return places.flatMap((place) => {
    const name = place?.name || place?.display_name?.split(",")[0]?.trim();
    const lat = Number(place?.lat);
    const lng = Number(place?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [toCity(name, place.address?.country ?? null, lat, lng)];
  });
}

export async function fromPhoton(query: string): Promise<CityResult[]> {
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=6&lang=pt`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`photon ${response.status}`);
  return parsePhoton(await response.json());
}

export async function fromNominatim(query: string): Promise<CityResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    "&format=jsonv2&addressdetails=1&limit=6&accept-language=pt";
  const response = await fetch(url, {
    // Nominatim's usage policy asks every client to identify itself.
    headers: { "User-Agent": "Rota trip planner (github.com/RodrigoFigueiredo7/Site-Intercambio)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`nominatim ${response.status}`);
  return parseNominatim(await response.json());
}
