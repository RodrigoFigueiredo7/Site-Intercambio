import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/** Supabase client for Client Components. Carries the publishable key only. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
