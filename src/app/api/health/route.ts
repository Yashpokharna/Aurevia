import { storageMode } from "@/lib/repository/json-store";
import { products } from "@/lib/repository/products";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Which backend is actually live, and is the data reaching the app.
 *
 * Exists because "the database isn't working" looks identical from outside to
 * "the host has no Supabase variables": both render the sample catalogue.
 * Deliberately says nothing secret — no URLs, no keys, only which of the two
 * env vars are present at runtime.
 */
export async function GET() {
  const supabase = isSupabaseConfigured();

  let productCount: number | null = null;
  let error: string | null = null;
  try {
    productCount = (await products.list({ includeDrafts: true, perPage: 1 })).total;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "unknown error";
  }

  return Response.json({
    backend: supabase ? "supabase" : "json-file",
    // NEXT_PUBLIC_ values are inlined at build time, so a missing URL here
    // usually means the variables were added after the last deploy.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_SECRET_KEY: Boolean(
        process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
    },
    diskWritable: storageMode() === "file",
    productCount,
    error,
  });
}
