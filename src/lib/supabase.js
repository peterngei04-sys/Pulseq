// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://imdqedkqbqnrqwtvhimv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xRmFCdCWuPYDq5pcoigSOg_m3zIMrAY";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
