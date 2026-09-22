import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { formatMoney } from "@/lib/money";
import { configuredGateways } from "@/lib/payments";
import { storageMode } from "@/lib/repository/json-store";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { products } from "@/lib/repository/products";
import { deleteProductAction } from "../actions";

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false },
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminProductsPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const saved = firstValue(searchParams.saved);
  const deleted = firstValue(searchParams.deleted);
  const errorCode = firstValue(searchParams.error);

  // Drafts included: this is the place you need to see them.
  const page = await products.list({ includeDrafts: true, perPage: 500 });
  const live = page.items.filter((item) => item.status === "published").length;
  const gateways = configuredGateways();
  // Read after products.list(), which is what triggers the fallback.
  const readOnly = storageMode() === "memory";

  return (
    <div className="shell py-10">
      {saved ? (
        <p className="mb-6 rounded-md border border-positive/25 bg-positive/8 px-4 py-3 text-sm text-positive">
          Saved. <Link href={`/products/${saved}`} className="underline underline-offset-2">View it on the store &rarr;</Link>
        </p>
      ) : null}
      {deleted ? (
        <p className="mb-6 rounded-md border border-line bg-canvas-deep px-4 py-3 text-sm text-ink-soft">
          Product deleted.
        </p>
      ) : null}

      {readOnly || errorCode === "readonly" ? (
        <p className="mb-6 rounded-md border border-critical/25 bg-critical/8 px-4 py-3 text-sm text-critical">
          <span className="font-medium">Read-only host:</span> this server can&apos;t write to disk, so
          you&apos;re seeing the sample catalogue and changes won&apos;t save. Connect a database to
          manage products in production.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Products</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {page.total} total · {live} live · {page.total - live} draft ·{" "}
            <span className={isSupabaseConfigured() ? "text-positive" : ""}>
              {isSupabaseConfigured() ? "Saved to Supabase" : "Saved to local file"}
            </span>
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center rounded-md bg-ink px-5 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Add product
        </Link>
      </div>

      {gateways.length < 2 ? (
        <p className="mt-6 rounded-md border border-line bg-brass-wash px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Payments:</span>{" "}
          {gateways.length === 0
            ? "neither Razorpay nor Stripe is configured, so checkout is disabled."
            : `only ${gateways[0]} is configured — the other currency can't be charged yet.`}{" "}
          Add the keys to <code className="rounded-sm bg-canvas px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      ) : null}

      {page.items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-line-strong px-6 py-20 text-center">
          <p className="font-display text-xl text-ink">No products yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            Add your first piece — images, video, and a price in each currency.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-canvas-deep/60 text-left">
              <tr className="text-xs uppercase tracking-wider text-ink-muted">
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Status</th>
                <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">₹ INR</th>
                <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">$ USD</th>
                <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Stock</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {page.items.map((product) => {
                const thumb = product.media.find((item) => item.kind === "image");
                return (
                  <tr key={product.id} className="bg-canvas align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-sm bg-canvas-deep">
                          {thumb ? (
                            <Image src={thumb.url} alt="" fill sizes="40px" className="object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="block truncate font-medium text-ink hover:underline"
                          >
                            {product.title}
                          </Link>
                          <p className="truncate text-xs text-ink-muted">
                            /{product.slug}
                            {product.media.some((m) => m.kind === "video") ? " · has film" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span
                        className={
                          product.status === "published"
                            ? "inline-flex items-center gap-1.5 text-xs text-positive"
                            : "inline-flex items-center gap-1.5 text-xs text-ink-muted"
                        }
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.status === "published" ? "bg-positive" : "bg-ink-muted"
                          }`}
                          aria-hidden="true"
                        />
                        {product.status === "published" ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-ink-soft md:table-cell">
                      {formatMoney(product.price.INR, "INR", { compact: true })}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-ink-soft md:table-cell">
                      {formatMoney(product.price.USD, "USD", { compact: true })}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-ink-soft lg:table-cell">
                      {product.inventory === null ? "∞" : product.inventory}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="text-sm text-ink-soft transition-colors hover:text-ink"
                        >
                          Edit
                        </Link>
                        <DeleteProductButton
                          id={product.id}
                          title={product.title}
                          action={deleteProductAction}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
