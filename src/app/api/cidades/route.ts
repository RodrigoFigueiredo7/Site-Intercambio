import { NextResponse, type NextRequest } from "next/server";

import type { CitySearchResponse } from "@/lib/places/city";
import { fromNominatim, fromPhoton } from "@/lib/places/geocoders";

/**
 * City search, run on the server so that a browser extension or a filtered
 * network cannot disable the most important field in the app.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json<CitySearchResponse>({ results: [], source: "photon" });
  }

  const attempts = [
    { source: "photon" as const, run: () => fromPhoton(query) },
    { source: "nominatim" as const, run: () => fromNominatim(query) },
  ];

  const failures: string[] = [];
  for (const { source, run } of attempts) {
    try {
      const results = await run();
      // An empty answer from the first geocoder is worth a second opinion;
      // an empty answer from the last one is the answer.
      if (results.length > 0 || source === "nominatim") {
        return NextResponse.json<CitySearchResponse>({ results, source });
      }
    } catch (error) {
      failures.push(`${source}: ${(error as Error).message}`);
    }
  }

  return NextResponse.json<CitySearchResponse>(
    {
      error:
        "Nenhum dos serviços de busca de cidade respondeu. " +
        "Eles são consultados pelo servidor do site, então isso costuma ser a rede desta máquina. " +
        `Detalhe: ${failures.join(" · ") || "sem resposta"}`,
    },
    { status: 503 },
  );
}
