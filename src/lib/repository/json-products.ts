import "server-only";
import { randomUUID } from "node:crypto";
import type { Product } from "../types";
import {
  clampPage,
  PRODUCTS_PER_PAGE,
  slugify,
  uniqueSlug,
  type ProductQuery,
  type ProductRepository,
} from "./contracts";
import { mutateCollection, readCollection } from "./json-store";
import { seedProducts } from "./seed";

const FILE = "products.json";

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

/** Local development backend: a JSON file in `data/`. Not for production hosts. */
export const jsonProductRepository: ProductRepository = {
  async list(query = {}) {
    const all = await readCollection<Product>(FILE, seedProducts);
    const filtered = all
      .filter((product) => matches(product, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const perPage = Math.max(1, query.perPage ?? PRODUCTS_PER_PAGE);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const page = clampPage(query.page, totalPages);
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
      const updated: Product = {
        ...existing,
        ...input,
        slug: input.slug ? uniqueSlug(slugify(input.slug), taken) : existing.slug,
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
