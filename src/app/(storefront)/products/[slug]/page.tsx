import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyButton } from "@/components/buy-button";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { brand } from "@/lib/brand";
import { isCurrencyPayable } from "@/lib/payments";
import { getCurrency } from "@/lib/region";
import { products } from "@/lib/repository/products";

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await products.findBySlug(slug);
  if (!product) return { title: "Not found" };

  const image = product.media.find((item) => item.kind === "image")?.url;
  return {
    title: product.title,
    description: product.subtitle ?? product.description.slice(0, 155),
    openGraph: {
      title: `${product.title} · ${brand.name}`,
      description: product.subtitle ?? product.description.slice(0, 155),
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await products.findBySlug(slug);

  if (!product || product.status !== "published") notFound();

  const [currency, related] = await Promise.all([getCurrency(), products.list({ perPage: 4 })]);

  const soldOut = product.inventory !== null && product.inventory <= 0;
  const lowStock = product.inventory !== null && product.inventory > 0 && product.inventory <= 5;
  const alsoLike = related.items.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <div className="shell py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span className="px-2" aria-hidden="true">
          /
        </span>
        <Link href="/products" className="transition-colors hover:text-ink">
          Shop
        </Link>
        <span className="px-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{product.title}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery media={product.media} title={product.title} />

        <div className="lg:pt-4">
          {product.category ? <p className="eyebrow text-brass">{product.category}</p> : null}

          <h1 className="mt-3 font-display text-3xl leading-[1.12] text-ink md:text-4xl">
            {product.title}
          </h1>
          {product.subtitle ? (
            <p className="mt-2 text-base text-ink-muted">{product.subtitle}</p>
          ) : null}

          <div className="mt-6">
            <Price product={product} currency={currency} size="lg" />
            <p className="mt-1.5 text-xs text-ink-muted">
              {currency === "INR" ? "Inclusive of all taxes." : "Duties and taxes calculated at checkout."}
            </p>
          </div>

          {lowStock ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-brass-wash px-3 py-1.5 text-xs font-medium text-brass">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
              Only {product.inventory} left
            </p>
          ) : null}

          <BuyButton
            productId={product.id}
            currency={currency}
            maxQuantity={product.inventory}
            soldOut={soldOut}
            payable={isCurrencyPayable(currency)}
          />

          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-6 text-sm text-ink-soft">
            <p>Ships worldwide from India</p>
            <p>Dispatched in 2–4 working days</p>
            <p>30-day returns</p>
            <p>{currency === "INR" ? "UPI, cards and netbanking" : "Cards, Apple Pay and Google Pay"}</p>
          </div>

          <div className="mt-8 space-y-5">
            <p className="text-base leading-relaxed text-ink-soft">{product.description}</p>

            {product.highlights.length > 0 ? (
              <div>
                <h2 className="eyebrow text-ink-muted">Details</h2>
                <ul className="mt-3 space-y-2">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3 text-sm text-ink-soft">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <p className="mt-8 text-sm text-ink-muted">
            Need a measurement or a photograph we haven&apos;t shown? Write to{" "}
            <a
              href={`mailto:${brand.contactEmail}?subject=${encodeURIComponent(product.title)}`}
              className="text-brass underline underline-offset-2"
            >
              {brand.contactEmail}
            </a>
            .
          </p>
        </div>
      </div>

      {alsoLike.length > 0 ? (
        <section className="mt-24 border-t border-line pt-14">
          <h2 className="font-display text-2xl text-ink">You might also like</h2>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {alsoLike.map((item) => (
              <ProductCard key={item.id} product={item} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
