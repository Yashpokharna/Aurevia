import "server-only";
import { raise, supabaseAdmin } from "../supabase/server";
import type { CurrencyCode, Order, OrderStatus } from "../types";
import type { OrderRepository } from "./contracts";

/** Shape of a row in `public.orders` — see supabase/schema.sql. */
interface OrderRow {
  id: string;
  product_id: string | null;
  product_title: string;
  quantity: number;
  currency: CurrencyCode;
  amount: number;
  gateway: "razorpay" | "stripe";
  gateway_ref: string;
  payment_ref: string | null;
  status: OrderStatus;
  email: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "orders";

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    productId: row.product_id ?? "",
    productTitle: row.product_title,
    quantity: row.quantity,
    currency: row.currency,
    amount: row.amount,
    gateway: row.gateway,
    gatewayRef: row.gateway_ref,
    paymentRef: row.payment_ref ?? undefined,
    status: row.status,
    email: row.email ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseOrderRepository: OrderRepository = {
  async create(input) {
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .insert({
        id: input.id,
        product_id: input.productId,
        product_title: input.productTitle,
        quantity: input.quantity,
        currency: input.currency,
        amount: input.amount,
        gateway: input.gateway,
        gateway_ref: input.gatewayRef,
        payment_ref: input.paymentRef ?? null,
        status: input.status,
        email: input.email ?? null,
      })
      .select("*")
      .single();
    raise("create order", error);
    return toOrder(data as OrderRow);
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin().from(TABLE).select("*").eq("id", id).maybeSingle();
    raise("find order", error);
    return data ? toOrder(data as OrderRow) : null;
  },

  async findByGatewayRef(ref) {
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .select("*")
      .eq("gateway_ref", ref)
      .maybeSingle();
    raise("find order by gateway ref", error);
    return data ? toOrder(data as OrderRow) : null;
  },

  async markStatus(ref, status, paymentRef) {
    if (status === "paid") {
      // One database function locks the order row, marks it paid and reduces
      // stock in a single transaction — so concurrent confirmations (browser,
      // success page, webhook) can't double-decrement.
      const { data, error } = await supabaseAdmin().rpc("mark_order_paid", {
        p_gateway_ref: ref,
        p_payment_ref: paymentRef ?? null,
      });
      raise("mark order paid", error);
      const row = (Array.isArray(data) ? data[0] : data) as OrderRow | undefined;
      return row ? toOrder(row) : null;
    }

    let request = supabaseAdmin()
      .from(TABLE)
      .update({ status, ...(paymentRef ? { payment_ref: paymentRef } : {}) })
      .eq("gateway_ref", ref);
    // A late "failed" event must never overwrite a captured payment.
    if (status === "failed") request = request.neq("status", "paid");
    const { data, error } = await request.select("*").maybeSingle();
    raise("update order status", error);
    if (data) return toOrder(data as OrderRow);
    return this.findByGatewayRef(ref);
  },

  async list(limit = 50) {
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    raise("list orders", error);
    return ((data ?? []) as OrderRow[]).map(toOrder);
  },
};
