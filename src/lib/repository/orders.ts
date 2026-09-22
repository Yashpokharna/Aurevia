import "server-only";
import { isSupabaseConfigured } from "../supabase/server";
import type { OrderRepository } from "./contracts";
import { jsonOrderRepository } from "./json-orders";
import { supabaseOrderRepository } from "./supabase-orders";

export type { OrderInput, OrderRepository } from "./contracts";

/** Supabase whenever it's configured; otherwise the local JSON file. */
export const orders: OrderRepository = isSupabaseConfigured()
  ? supabaseOrderRepository
  : jsonOrderRepository;
