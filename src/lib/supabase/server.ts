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

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }
  client ??= createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Turn a Supabase/PostgREST error into a thrown Error with a useful message. */
export function raise(context: string, error: { message: string; code?: string } | null): void {
  if (error) {
    throw new Error(`[supabase] ${context}: ${error.message}${error.code ? ` (${error.code})` : ""}`);
  }
}
