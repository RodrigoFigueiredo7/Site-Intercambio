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
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  share_token: string;
  is_public: boolean;
  created_at: string;
};

export type Place = {
  id: string;
  trip_id: string;
  name: string;
  country: string | null;
  code: string | null;
  lat: number;
  lng: number;
  position: number;
};

export type Leg = {
  id: string;
  trip_id: string;
  from_place_id: string | null;
  to_place_id: string | null;
  mode: TransportMode;
  depart_date: string | null;
  depart_time: string | null;
  cost_cents: number;
  status: LegStatus;
};

/** A trip plus everything needed to draw it on the map and in a RouteStrip. */
export type TripWithRoute = Trip & {
  places: Place[];
  legs: Leg[];
};
