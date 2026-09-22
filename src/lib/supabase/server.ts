import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer dashboards call it the "secret" key; older ones call it
// "service_role". Either works — both bypass Row Level Security, which is why
// this file is server-only and the key must never carry a NEXT_PUBLIC_ prefix.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET ?? "product-media";

export function isSupabaseConfigured(): boolean {
  return Boolean(url && secretKey);
}

/**
 * The dashboard shows the publishable and secret keys in near-identical rows,
 * and pasting the wrong one produces only "row violates row-level security"
 * deep inside an unrelated query. Name the actual mistake instead.
 */
function assertSecretKey(key: string): void {
  if (key.startsWith("sb_publishable_") || key.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SECRET_KEY holds a publishable/anon key, not a secret key. The server needs the " +
        "key from the *Secret keys* section (starts with sb_secret_). With a publishable key every " +
        "read comes back empty and every write is refused by Row Level Security."
    );
  }
  if (key === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are the same value. " +
        "Copy the key from the *Secret keys* section of the Supabase dashboard instead."
    );
  }
}

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }
  assertSecretKey(secretKey);
  client ??= createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Turn a Supabase/PostgREST error into a thrown Error with a useful message. */
export function raise(context: string, error: { message: string; code?: string } | null): void {
  if (!error) return;

  // "Invalid API key" on its own sends people hunting through the database.
  // It is almost always a truncated or wrong key in the environment — the
  // dashboard shows a shortened preview that is easy to copy by mistake.
  const looksLikeBadKey =
    /invalid api key|invalid compact jws|jwt/i.test(error.message);
  const hint = looksLikeBadKey
    ? ` — check SUPABASE_SECRET_KEY${
        secretKey ? ` (currently ${secretKey.length} characters; a real key is far longer)` : " (not set)"
      }`
    : "";

  throw new Error(
    `[supabase] ${context}: ${error.message}${error.code ? ` (${error.code})` : ""}${hint}`
  );
}
