import type { Order, OrderStatus, Product } from "../types";

/**
 * The only contracts the rest of the app knows about. Each backend (JSON file,
 * Supabase) implements these; `products.ts` and `orders.ts` pick one. No page,
 * component or route handler depends on which.
 */

export const PRODUCTS_PER_PAGE = 6;

export interface ProductQuery {
  page?: number;
  perPage?: number;
  /** Admin listings pass `true` to see drafts alongside published products. */
  includeDrafts?: boolean;
  category?: string | null;
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "slug"> & {
  slug?: string;
};

export interface ProductRepository {
  list(query?: ProductQuery): Promise<Paginated<Product>>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: Partial<ProductInput>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
  categories(): Promise<string[]>;
}

/** The caller supplies the id so it can be threaded through the gateway's metadata. */
export type OrderInput = Omit<Order, "createdAt" | "updatedAt">;

export interface OrderRepository {
  create(input: OrderInput): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByGatewayRef(ref: string): Promise<Order | null>;
  /**
   * Moving an order to "paid" also reduces the product's stock by the order
   * quantity — exactly once, however many times payment is confirmed (the
   * browser, the success page and the webhook can all report the same payment).
   */
  markStatus(ref: string, status: OrderStatus, paymentRef?: string): Promise<Order | null>;
  list(limit?: number): Promise<Order[]>;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "product";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/** Clamp a requested page into range rather than 404 on a stale `?page=99` link. */
export function clampPage(requested: number | undefined, totalPages: number): number {
  return Math.min(Math.max(1, Math.floor(requested ?? 1)), Math.max(1, totalPages));
}
