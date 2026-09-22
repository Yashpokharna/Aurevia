// Copies the local JSON catalogue (data/products.json, data/orders.json) into
// Supabase, uploading any locally stored media (/uploads/...) to the storage
// bucket and rewriting those URLs on the way.
//
//   npm run db:import
//
// Safe to run more than once: rows are upserted by id, and a local file that
// was already uploaded is skipped.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_MEDIA_BUCKET ?? "product-media";

if (!url || !key) {
  console.error("✗ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

if (key.startsWith("sb_publishable_") || key === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  console.error("✗ SUPABASE_SECRET_KEY holds the publishable key, not the secret one.");
  console.error("  Copy the key from the *Secret keys* section of the dashboard (starts with sb_secret_).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const root = process.cwd();

function readJson(file) {
  const full = path.join(root, "data", file);
  return existsSync(full) ? JSON.parse(readFileSync(full, "utf8")) : [];
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};

/** Upload /uploads/<file> to the bucket once and return its public URL. */
async function migrateMediaUrl(value) {
  if (!value || !value.startsWith("/uploads/")) return value;
  const filename = path.basename(value);
  const local = path.join(root, "public", "uploads", filename);
  const objectKey = `products/imported/${filename}`;
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectKey).data.publicUrl;

  if (!existsSync(local)) {
    console.warn(`  ! ${value} is referenced but missing on disk — left as is`);
    return value;
  }
  const { error } = await supabase.storage.from(bucket).upload(objectKey, readFileSync(local), {
    contentType: CONTENT_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`upload ${filename}: ${error.message}`);
  console.log(`  ↑ ${value}${error ? " (already uploaded)" : ""}`);
  return publicUrl;
}

const products = readJson("products.json");
const orders = readJson("orders.json");

if (products.length === 0) {
  console.log("No data/products.json found — nothing to import. The Supabase catalogue starts empty;");
  console.log("add products from /admin once the site is connected.");
  process.exit(0);
}

console.log(`Importing ${products.length} products…`);
const rows = [];
for (const product of products) {
  const media = [];
  for (const item of product.media ?? []) {
    media.push({ ...item, url: await migrateMediaUrl(item.url), ...(item.posterUrl ? { posterUrl: await migrateMediaUrl(item.posterUrl) } : {}) });
  }
  rows.push({
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? "",
    highlights: product.highlights ?? [],
    media,
    price_inr: product.price.INR,
    price_usd: product.price.USD,
    compare_at_inr: product.compareAtPrice?.INR ?? null,
    compare_at_usd: product.compareAtPrice?.USD ?? null,
    inventory: product.inventory ?? null,
    status: product.status,
    category: product.category ?? null,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  });
}

const { error: productError } = await supabase.from("products").upsert(rows, { onConflict: "id" });
if (productError) {
  console.error(`✗ products: ${productError.message}`);
  if (/relation .* does not exist|schema cache/i.test(productError.message)) {
    console.error("  The tables don't exist yet — run supabase/schema.sql in the Supabase SQL Editor first.");
  }
  process.exit(1);
}
console.log(`✓ ${rows.length} products`);

if (orders.length) {
  const { error } = await supabase.from("orders").upsert(
    orders.map((order) => ({
      id: order.id,
      product_id: rows.some((row) => row.id === order.productId) ? order.productId : null,
      product_title: order.productTitle,
      quantity: order.quantity,
      currency: order.currency,
      amount: order.amount,
      gateway: order.gateway,
      gateway_ref: order.gatewayRef,
      payment_ref: order.paymentRef ?? null,
      status: order.status,
      email: order.email ?? null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    })),
    { onConflict: "id" }
  );
  if (error) {
    console.error(`✗ orders: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${orders.length} orders`);
}

console.log("Done.");
