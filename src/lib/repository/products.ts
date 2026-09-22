import "server-only";
import { isSupabaseConfigured } from "../supabase/server";
import type { ProductRepository } from "./contracts";
import { jsonProductRepository } from "./json-products";
import { supabaseProductRepository } from "./supabase-products";

export * from "./contracts";

/**
 * Supabase whenever it's configured; otherwise the local JSON file, so the app
 * still runs with zero setup on a laptop.
 */
export const products: ProductRepository = isSupabaseConfigured()
  ? supabaseProductRepository
  : jsonProductRepository;
