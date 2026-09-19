import "server-only";
import { randomUUID } from "node:crypto";
import type { Product } from "../types";
import { mutateCollection, readCollection } from "./json-store";
import { seedProducts } from "./seed";

const FILE = "products.json";

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

/**
 * The only contract the rest of the app knows about. Swapping the JSON file for
 * Postgres, Supabase or anything else means writing one new object that
 * satisfies this interface and changing the export at the bottom of the file —
 * no page, component or action needs to change.
 */
export interface ProductRepository {
  list(query?: ProductQuery): Promise<Paginated<Product>>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: Partial<ProductInput>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
  categories(): Promise<string[]>;
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

function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "product";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

function matches(product: Product, query: ProductQuery): boolean {
  if (!query.includeDrafts && product.status !== "published") return false;
  if (query.category && product.category !== query.category) return false;
  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = `${product.title} ${product.subtitle ?? ""} ${product.description}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

const jsonProductRepository: ProductRepository = {
  async list(query = {}) {
    const all = await readCollection<Product>(FILE, seedProducts);
    const filtered = all
      .filter((product) => matches(product, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const perPage = Math.max(1, query.perPage ?? PRODUCTS_PER_PAGE);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    // Clamp rather than 404 so a stale `?page=99` link still renders something.
    const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), totalPages);
    const start = (page - 1) * perPage;

    return { items: filtered.slice(start, start + perPage), page, perPage, total, totalPages };
  },

  async findBySlug(slug) {
    const all = await readCollection<Product>(FILE, seedProducts);
    return all.find((product) => product.slug === slug) ?? null;
  },

  async findById(id) {
    const all = await readCollection<Product>(FILE, seedProducts);
    return all.find((product) => product.id === id) ?? null;
  },

  async create(input) {
    return mutateCollection<Product, Product>(FILE, seedProducts, (items) => {
      const taken = new Set(items.map((item) => item.slug));
      const timestamp = new Date().toISOString();
      const product: Product = {
        ...input,
        id: randomUUID(),
        slug: uniqueSlug(slugify(input.slug || input.title), taken),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return { items: [product, ...items], result: product };
    });
  },

  async update(id, input) {
    return mutateCollection<Product, Product | null>(FILE, seedProducts, (items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return { items, result: null };

      const taken = new Set(items.filter((item) => item.id !== id).map((item) => item.slug));
      const existing = items[index];
      const nextSlug = input.slug
        ? uniqueSlug(slugify(input.slug), taken)
        : existing.slug;

      const updated: Product = {
        ...existing,
        ...input,
        slug: nextSlug,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      const next = [...items];
      next[index] = updated;
      return { items: next, result: updated };
    });
  },

  async remove(id) {
    return mutateCollection<Product, boolean>(FILE, seedProducts, (items) => {
      const next = items.filter((item) => item.id !== id);
      return { items: next, result: next.length !== items.length };
    });
  },

  async categories() {
    const all = await readCollection<Product>(FILE, seedProducts);
    return [...new Set(all.map((item) => item.category).filter((c): c is string => Boolean(c)))].sort();
  },
};

/** Swap this line to change storage backend. */
export const products: ProductRepository = jsonProductRepository;
