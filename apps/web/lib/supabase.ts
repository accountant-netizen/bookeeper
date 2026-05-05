import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables");
}

// Client for browser (uses publishable key)
export const createBrowserClient = () =>
  createClient(supabaseUrl, supabasePublishableKey);

// Client for server (uses secret key for admin operations)
export const createServerClient = () => {
  if (!supabaseSecretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }
  return createClient(supabaseUrl, supabaseSecretKey);
};
