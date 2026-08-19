declare module "tz-lookup" {
  /** IANA zone name for a coordinate. Throws for out-of-range values. */
  export default function tzLookup(lat: number, lng: number): string;
}
