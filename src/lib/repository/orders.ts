import "server-only";
import type { Order, OrderStatus } from "../types";
import { mutateCollection, readCollection } from "./json-store";

const FILE = "orders.json";

/** The caller supplies the id so it can be threaded through the gateway's metadata. */
export type OrderInput = Omit<Order, "createdAt" | "updatedAt">;

export interface OrderRepository {
  create(input: OrderInput): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByGatewayRef(ref: string): Promise<Order | null>;
  markStatus(ref: string, status: OrderStatus, paymentRef?: string): Promise<Order | null>;
  list(limit?: number): Promise<Order[]>;
}

const empty = (): Order[] => [];

const jsonOrderRepository: OrderRepository = {
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
    return mutateCollection<Order, Order | null>(FILE, empty, (items) => {
      const index = items.findIndex((order) => order.gatewayRef === ref);
      if (index === -1) return { items, result: null };
      const updated: Order = {
        ...items[index],
        status,
        ...(paymentRef ? { paymentRef } : {}),
        updatedAt: new Date().toISOString(),
      };
      const next = [...items];
      next[index] = updated;
      return { items: next, result: updated };
    });
  },

  async list(limit = 50) {
    const all = await readCollection<Order>(FILE, empty);
    return all.slice(0, limit);
  },
};

export const orders: OrderRepository = jsonOrderRepository;
