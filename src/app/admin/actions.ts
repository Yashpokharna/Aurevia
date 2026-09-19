"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, isAdminConfigured, requireAdmin, startSession } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { products, slugify } from "@/lib/repository/products";
import { storage } from "@/lib/storage";
import type { ProductMedia } from "@/lib/types";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isAdminConfigured()) {
    return { error: "Set ADMIN_PASSWORD in .env.local, then restart the dev server." };
  }

  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // Blunt the brute-force edge a little without a full rate limiter.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That password isn't right." };
  }

  await startSession();
  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

function parseMedia(raw: FormDataEntryValue | null): ProductMedia[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.url === "string" && item.url.trim())
      .map((item, index) => ({
        id: typeof item.id === "string" && item.id ? item.id : `m-${Date.now()}-${index}`,
        kind: item.kind === "video" ? "video" : "image",
        url: String(item.url).trim(),
        posterUrl: item.posterUrl ? String(item.posterUrl).trim() : undefined,
        alt: String(item.alt ?? "").trim(),
      }));
  } catch {
    return [];
  }
}

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Server Actions accept direct POSTs, so the gate lives here — not only in
  // the admin layout.
  try {
    await requireAdmin();
  } catch {
    return { error: "Your session expired. Sign in again." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceInr = toMinorUnits(String(formData.get("priceINR") ?? ""), "INR");
  const priceUsd = toMinorUnits(String(formData.get("priceUSD") ?? ""), "USD");

  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = "Give the product a name.";
  if (!description) fieldErrors.description = "Describe the product.";
  if (priceInr <= 0) fieldErrors.priceINR = "Set a rupee price.";
  if (priceUsd <= 0) fieldErrors.priceUSD = "Set a dollar price — US visitors see this one.";

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Some fields need attention.", fieldErrors };
  }

  const compareInr = toMinorUnits(String(formData.get("compareINR") ?? ""), "INR");
  const compareUsd = toMinorUnits(String(formData.get("compareUSD") ?? ""), "USD");
  const inventoryRaw = String(formData.get("inventory") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  const payload = {
    title,
    subtitle: String(formData.get("subtitle") ?? "").trim() || undefined,
    slug: slugify(String(formData.get("slug") ?? "") || title),
    description,
    highlights: String(formData.get("highlights") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    media: parseMedia(formData.get("media")),
    price: { INR: priceInr, USD: priceUsd },
    compareAtPrice:
      compareInr > 0 || compareUsd > 0
        ? { ...(compareInr > 0 ? { INR: compareInr } : {}), ...(compareUsd > 0 ? { USD: compareUsd } : {}) }
        : undefined,
    // Blank means "always available" rather than zero stock.
    inventory: inventoryRaw === "" ? null : Math.max(0, Number.parseInt(inventoryRaw, 10) || 0),
    status: formData.get("status") === "published" ? ("published" as const) : ("draft" as const),
    category: category || null,
  };

  const saved = id ? await products.update(id, payload) : await products.create(payload);
  if (!saved) return { error: "That product no longer exists." };

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${saved.slug}`);
  revalidatePath("/admin");

  redirect(`/admin?saved=${encodeURIComponent(saved.slug)}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const id = String(formData.get("id") ?? "");
  const product = await products.findById(id);
  if (!product) redirect("/admin");

  await products.remove(id);

  // Clean up any files we actually own; remote URLs are left alone.
  await Promise.all(
    product.media.flatMap((item) =>
      [item.url, item.posterUrl].filter(Boolean).map((url) => storage.remove(url as string))
    )
  );

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}
