export type TransportMode = "train" | "bus" | "plane" | "ferry" | "car" | "walk";
export type LegStatus = "idea" | "to_book" | "booked";

export type Profile = {
  id: string;
  display_name: string | null;
  home_city: string;
  home_lat: number;
  home_lng: number;
  home_code: string;
  currency: "EUR" | "BRL";
  fx_brl: number;
};

export type Trip = {
  id: string;
  owner_id: string;
  name: string;
  emoji: string | null;
  color: string;
  /** The calendar frame for the Days tab. Stops may fall outside it. */
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  share_token: string;
  is_public: boolean;
  created_at: string;
};

/**
 * A stop is the unit of a trip: a city, and the window spent in it.
 * Travel between stops is the gap between one depart_at and the next
 * arrive_at — derived, never typed.
 */
export type Stop = {
  id: string;
  trip_id: string;
  name: string;
  region: string | null;
  country: string | null;
  code: string | null;
  lat: number;
  lng: number;
  /** IANA zone of the city. Nights and calendar days are counted in it. */
  tz: string;
  arrive_at: string;
  depart_at: string;
  lodging_name: string | null;
  lodging_address: string | null;
  lodging_url: string | null;
  lodging_cost_cents: number;
  notes: string | null;
};

/** Derived from consecutive stops, and reconciled by the database. */
export type Leg = {
  id: string;
  trip_id: string;
  from_stop_id: string;
  to_stop_id: string;
  suggested_mode: TransportMode | null;
  /** Null means "I did not touch it, use the suggestion". */
  mode: TransportMode | null;
  operator: string | null;
  cost_cents: number;
  booking_url: string | null;
  booking_ref: string | null;
  status: LegStatus;
  notes: string | null;
  is_active: boolean;
};

export type TripWithRoute = Trip & {
  stops: Stop[];
  legs: Leg[];
};
