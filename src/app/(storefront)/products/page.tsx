import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { CurrencyNote } from "@/components/price";
import { brand } from "@/lib/brand";
import { getCurrency } from "@/lib/region";
import { PRODUCTS_PER_PAGE, products } from "@/lib/repository/products";

export const metadata: Metadata = {
  title: "Shop",
  description: brand.description,
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage(props: PageProps<"/products">) {
  const searchParams = await props.searchParams;
  const requestedPage = Number.parseInt(firstValue(searchParams.page) ?? "1", 10);
  const category = firstValue(searchParams.category) ?? null;

  const [currency, page, categories] = await Promise.all([
    getCurrency(),
    products.list({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      perPage: PRODUCTS_PER_PAGE,
      category,
    }),
    products.categories(),
  ]);

  const firstIndex = (page.page - 1) * page.perPage + 1;
  const lastIndex = Math.min(page.page * page.perPage, page.total);

  return (
    <div className="shell py-14 md:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow text-brass">The catalogue</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.08] text-ink md:text-5xl">
          Everything we make,
          <br />
          in one place.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-soft">{brand.description}</p>
      </header>

      {/* Category filters appear automatically once products are given a category. */}
      {categories.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <Link
            href="/products"
            aria-current={!category ? "true" : undefined}
            className={
              !category
                ? "rounded-full bg-ink px-4 py-1.5 text-sm text-canvas"
                : "rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            }
          >
            All
          </Link>
          {categories.map((name) => (
            <Link
              key={name}
              href={`/products?category=${encodeURIComponent(name)}`}
              aria-current={category === name ? "true" : undefined}
              className={
                category === name
                  ? "rounded-full bg-ink px-4 py-1.5 text-sm text-canvas"
                  : "rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              }
            >
              {name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-ink-muted">
          {page.total === 0
            ? "No products yet"
            : `Showing ${firstIndex}–${lastIndex} of ${page.total} ${page.total === 1 ? "piece" : "pieces"}`}
        </p>
        <CurrencyNote currency={currency} />
      </div>

      {page.items.length === 0 ? (
        <div className="mt-16 rounded-lg border border-dashed border-line-strong bg-canvas-deep/50 px-6 py-20 text-center">
          <h2 className="font-display text-2xl text-ink">Nothing here yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
            The catalogue is empty. Add your first piece from the store admin and it will appear
            here straight away.
          </p>
          <Link
            href="/admin/products/new"
            className="mt-7 inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            Add a product
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                priority={index < 3}
              />
            ))}
          </div>

          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            basePath="/products"
            params={{ category: category ?? undefined }}
          />
        </>
      )}
    </div>
  );
}
