import "server-only";
import type { Order, Product } from "../types";
import type { OrderRepository } from "./contracts";
import { mutateCollection, readCollection } from "./json-store";
import { seedProducts } from "./seed";

const FILE = "orders.json";
const empty = (): Order[] => [];

/**
 * Local development backend. Marking paid and reducing stock touch two files,
 * so unlike the Supabase backend they are not one atomic step — acceptable for
 * a laptop, which is the only place this runs.
 */
export const jsonOrderRepository: OrderRepository = {
  async create(input) {
    return mutateCollection<Order, Order>(FILE, empty, (items) => {
      const timestamp = new Date().toISOString();
      const order: Order = { ...input, createdAt: timestamp, updatedAt: timestamp };
      return { items: [order, ...items], result: order };
    });
  },

  async findById(id) {
    const all = await readCollection<Order>(FILE, empty);
    return all.find((order) => order.id === id) ?? null;
  },

  async findByGatewayRef(ref) {
    const all = await readCollection<Order>(FILE, empty);
    return all.find((order) => order.gatewayRef === ref) ?? null;
  },

  async markStatus(ref, status, paymentRef) {
    let becamePaid: Order | null = null;

    const updated = await mutateCollection<Order, Order | null>(FILE, empty, (items) => {
      const index = items.findIndex((order) => order.gatewayRef === ref);
      if (index === -1) return { items, result: null };
      const previous = items[index];
      // Once paid, stay paid: a late "failed" event must not undo a capture.
      if (previous.status === "paid" && status !== "refunded") {
        return { items, result: previous };
      }
      const next: Order = {
        ...previous,
        status,
        ...(paymentRef ? { paymentRef } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (status === "paid") becamePaid = next;
      const copy = [...items];
      copy[index] = next;
      return { items: copy, result: next };
    });

    const paidOrder = becamePaid as Order | null;
    if (paidOrder) {
      await mutateCollection<Product, null>("products.json", seedProducts, (items) => ({
        items: items.map((product) =>
          product.id === paidOrder.productId && product.inventory !== null
            ? { ...product, inventory: Math.max(0, product.inventory - paidOrder.quantity) }
            : product
        ),
        result: null,
      }));
    }

    return updated;
  },

  async list(limit = 50) {
    const all = await readCollection<Order>(FILE, empty);
    return all.slice(0, limit);
  },
};
