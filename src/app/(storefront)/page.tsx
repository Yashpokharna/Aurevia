import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Price } from "@/components/price";
import { brand } from "@/lib/brand";
import { discountPercent } from "@/lib/money";
import { getCurrency } from "@/lib/region";
import { products } from "@/lib/repository/products";

const TRUST = [
  {
    label: "Free shipping",
    detail: "On every order",
    icon: (
      <>
        <path d="M1 5.5h11v9H1z" />
        <path d="M12 8.5h3.2l2.8 3v3h-6" />
        <circle cx="5" cy="15.5" r="1.8" />
        <circle cx="14" cy="15.5" r="1.8" />
      </>
    ),
  },
  {
    label: "30-day returns",
    detail: "No questions asked",
    icon: (
      <>
        <path d="M3 9a7 7 0 1 1 1.8 4.7" />
        <path d="M2.5 4.5V9H7" />
      </>
    ),
  },
  {
    label: "Secure checkout",
    detail: "UPI, cards & wallets",
    icon: (
      <>
        <rect x="3.5" y="8.5" width="13" height="9" rx="1.5" />
        <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" />
      </>
    ),
  },
  {
    label: "Ships worldwide",
    detail: "From India in 2–4 days",
    icon: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M2.5 10h15M10 2.5a13 13 0 0 1 0 15 13 13 0 0 1 0-15" />
      </>
    ),
  },
];

export default async function HomePage() {
  const [currency, catalogue] = await Promise.all([
    getCurrency(),
    products.list({ perPage: 8 }),
  ]);

  const items = catalogue.items;
  const hero = items[0];
  const heroImage = hero?.media.find((media) => media.kind === "image");

  const onSale = items
    .map((product) => {
      const compareAt = product.compareAtPrice?.[currency];
      const off = compareAt ? discountPercent(product.price[currency], compareAt) : null;
      return off ? { product, off } : null;
    })
    .filter((entry): entry is { product: (typeof items)[number]; off: number } => entry !== null);

  const bestDiscount = onSale.reduce((max, entry) => Math.max(max, entry.off), 0);

  if (items.length === 0) {
    return (
      <div className="shell py-32 text-center">
        <h1 className="font-display text-3xl text-ink">The shop is empty</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
          Add your first product from the store admin and the homepage fills itself in.
        </p>
        <Link
          href="/admin/products/new"
          className="mt-8 inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-canvas"
        >
          Add a product
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Hero banner — one image, one promise, one button. */}
      <section className="relative isolate min-h-[30rem] overflow-hidden md:min-h-[34rem]">
        {heroImage ? (
          <Image
            src={heroImage.url}
            alt=""
            aria-hidden="true"
            fill
            priority
            quality={90}
            sizes="100vw"
            className="-z-10 object-cover"
          />
        ) : null}
        {/* Gradient keeps the copy legible whatever photograph sits behind it. */}
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/15"
          aria-hidden="true"
        />

        <div className="shell flex min-h-[30rem] flex-col justify-center py-16 md:min-h-[34rem]">
          <div className="max-w-xl">
            <p className="eyebrow text-brass-bright">New season · Made in India</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] text-canvas md:text-5xl lg:text-6xl">
              {brand.tagline}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-canvas/80">
              {brand.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-md bg-canvas px-7 text-sm font-medium tracking-wide text-ink transition-opacity hover:opacity-90"
              >
                Shop all {catalogue.total}
              </Link>
              {hero ? (
                <Link
                  href={`/products/${hero.slug}`}
                  className="inline-flex h-12 items-center rounded-md border border-canvas/35 px-7 text-sm font-medium text-canvas transition-colors hover:border-canvas"
                >
                  Shop the {hero.title}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-canvas-deep/50">
        <ul className="shell grid grid-cols-2 gap-x-6 gap-y-6 py-6 md:grid-cols-4">
          {TRUST.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-brass"
                aria-hidden="true"
              >
                {item.icon}
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="truncate text-xs text-ink-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* The catalogue, straight away — this is a shop, not a lookbook. */}
      <section id="featured" className="shell py-14 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
          <div>
            <p className="eyebrow text-brass">New arrivals</p>
            <h2 className="mt-2 font-display text-2xl text-ink md:text-3xl">Just added</h2>
          </div>
          <Link
            href="/products"
            className="border-b border-line-strong pb-1 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            View all {catalogue.total} &rarr;
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {items.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              priority={index < 4}
            />
          ))}
        </div>
      </section>

      {/* Offers — only renders when something is actually discounted. */}
      {onSale.length > 0 ? (
        <section className="border-y border-line bg-brass-wash">
          <div className="shell py-14 md:py-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-brass">On sale</p>
                <h2 className="mt-2 font-display text-2xl text-ink md:text-3xl">
                  Up to {bestDiscount}% off
                </h2>
              </div>
              <p className="text-sm text-ink-muted">While stock lasts</p>
            </div>

            <ul className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {onSale.slice(0, 3).map(({ product, off }) => {
                const image = product.media.find((media) => media.kind === "image");
                return (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      className="group flex gap-4 rounded-lg border border-line-strong/60 bg-canvas p-3 transition-colors hover:border-ink/25"
                    >
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-canvas-deep">
                        {image ? (
                          <Image
                            src={image.url}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                        <span className="absolute left-0 top-0 bg-ink px-1.5 py-0.5 text-[0.625rem] font-medium text-canvas">
                          {off}% off
                        </span>
                      </div>
                      <div className="min-w-0 self-center">
                        <h3 className="font-display text-base leading-snug text-ink">
                          {product.title}
                        </h3>
                        {product.subtitle ? (
                          <p className="mt-0.5 truncate text-xs text-ink-muted">{product.subtitle}</p>
                        ) : null}
                        <div className="mt-2">
                          <Price product={product} currency={currency} size="sm" />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Brand note — kept short, and kept below the products where it belongs. */}
      <section id="story" className="shell py-14 md:py-16">
        <div className="grid items-center gap-8 rounded-lg border border-line bg-canvas-deep/40 px-6 py-10 md:grid-cols-[1.3fr_1fr] md:gap-12 md:px-10 md:py-12">
          <div>
            <p className="eyebrow text-brass">Why {brand.name}</p>
            <h2 className="mt-3 font-display text-2xl leading-snug text-ink md:text-3xl">
              We would rather sell you one thing, once.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
              Every product here is one we use ourselves. We photograph the real item, list what it
              is actually made of, and tell you when something is out of stock instead of pretending
              otherwise.
            </p>
            <a
              href={`mailto:${brand.contactEmail}`}
              className="mt-6 inline-block border-b border-line-strong pb-1 text-sm text-ink transition-colors hover:border-ink"
            >
              Questions? Email us &rarr;
            </a>
          </div>

          <dl className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              { value: "2–4", label: "Days to dispatch" },
              { value: "30", label: "Day returns" },
              { value: "40+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-3xl text-ink">{stat.value}</span>
                  <span className="mt-1 block text-xs leading-snug text-ink-muted">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
