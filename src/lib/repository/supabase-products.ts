import "server-only";
import { raise, supabaseAdmin } from "../supabase/server";
import type { CurrencyCode, Product, ProductMedia } from "../types";
import {
  clampPage,
  PRODUCTS_PER_PAGE,
  slugify,
  uniqueSlug,
  type ProductInput,
  type ProductRepository,
} from "./contracts";

/** Shape of a row in `public.products` — see supabase/schema.sql. */
interface ProductRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  highlights: string[];
  media: ProductMedia[];
  price_inr: number;
  price_usd: number;
  compare_at_inr: number | null;
  compare_at_usd: number | null;
  inventory: number | null;
  status: "draft" | "published";
  category: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "products";

function toProduct(row: ProductRow): Product {
  const compareAt: Partial<Record<CurrencyCode, number>> = {};
  if (row.compare_at_inr) compareAt.INR = row.compare_at_inr;
  if (row.compare_at_usd) compareAt.USD = row.compare_at_usd;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description,
    highlights: row.highlights ?? [],
    media: row.media ?? [],
    price: { INR: row.price_inr, USD: row.price_usd },
    compareAtPrice: Object.keys(compareAt).length ? compareAt : undefined,
    inventory: row.inventory,
    status: row.status,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Only the columns present in `input` — so a partial update never blanks the rest. */
function toRow(input: Partial<ProductInput>): Partial<ProductRow> {
  const row: Partial<ProductRow> = {};
  if (input.title !== undefined) row.title = input.title;
  if ("subtitle" in input) row.subtitle = input.subtitle ?? null;
  if (input.description !== undefined) row.description = input.description;
  if (input.highlights !== undefined) row.highlights = input.highlights;
  if (input.media !== undefined) row.media = input.media;
  if (input.price !== undefined) {
    row.price_inr = input.price.INR;
    row.price_usd = input.price.USD;
  }
  if ("compareAtPrice" in input) {
    row.compare_at_inr = input.compareAtPrice?.INR ?? null;
    row.compare_at_usd = input.compareAtPrice?.USD ?? null;
  }
  if ("inventory" in input) row.inventory = input.inventory ?? null;
  if (input.status !== undefined) row.status = input.status;
  if ("category" in input) row.category = input.category ?? null;
  return row;
}

/** Postgres LIKE treats % and _ as wildcards; escape them in user input. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function availableSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "product";
  let query = supabaseAdmin().from(TABLE).select("slug").like("slug", `${escapeLike(root)}%`);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  raise("check slugs", error);
  return uniqueSlug(root, new Set((data ?? []).map((row) => row.slug as string)));
}

export const supabaseProductRepository: ProductRepository = {
  async list(query = {}) {
    const perPage = Math.max(1, query.perPage ?? PRODUCTS_PER_PAGE);

    const run = (page: number) => {
      let request = supabaseAdmin()
        .from(TABLE)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);
      if (!query.includeDrafts) request = request.eq("status", "published");
      if (query.category) request = request.eq("category", query.category);
      if (query.search) {
        const needle = `%${escapeLike(query.search)}%`;
        request = request.or(`title.ilike.${needle},subtitle.ilike.${needle},description.ilike.${needle}`);
      }
      return request;
    };

    let page = Math.max(1, Math.floor(query.page ?? 1));
    const first = await run(page);
    raise("list products", first.error);
    let data = first.data;

    const total = first.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const clamped = clampPage(page, totalPages);
    if (clamped !== page) {
      // Stale `?page=99` link: serve the last real page instead of an empty one.
      page = clamped;
      const retry = await run(page);
      raise("list products", retry.error);
      data = retry.data;
    }

    return {
      items: ((data ?? []) as ProductRow[]).map(toProduct),
      page,
      perPage,
      total,
      totalPages,
    };
  },

  async findBySlug(slug) {
    const { data, error } = await supabaseAdmin().from(TABLE).select("*").eq("slug", slug).maybeSingle();
    raise("find product by slug", error);
    return data ? toProduct(data as ProductRow) : null;
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin().from(TABLE).select("*").eq("id", id).maybeSingle();
    raise("find product by id", error);
    return data ? toProduct(data as ProductRow) : null;
  },

  async create(input) {
    const slug = await availableSlug(input.slug || input.title);
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .insert({ ...toRow(input), slug })
      .select("*")
      .single();
    raise("create product", error);
    return toProduct(data as ProductRow);
  },

  async update(id, input) {
    const row = toRow(input);
    if (input.slug) row.slug = await availableSlug(input.slug, id);
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    raise("update product", error);
    return data ? toProduct(data as ProductRow) : null;
  },

  async remove(id) {
    const { data, error } = await supabaseAdmin().from(TABLE).delete().eq("id", id).select("id");
    raise("delete product", error);
    return (data ?? []).length > 0;
  },

  async categories() {
    const { data, error } = await supabaseAdmin()
      .from(TABLE)
      .select("category")
      .not("category", "is", null);
    raise("list categories", error);
    return [...new Set((data ?? []).map((row) => row.category as string))].sort();
  },
};
