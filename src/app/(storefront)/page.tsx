import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { brand } from "@/lib/brand";
import { getCurrency } from "@/lib/region";
import { products } from "@/lib/repository/products";

const ASSURANCES = [
  { title: "Made in small runs", body: "Nothing is mass-produced. When a run sells out, the next one is months away." },
  { title: "Priced in your currency", body: "₹ in India, $ everywhere else — no surprise conversion at the last step." },
  { title: "Shipped worldwide", body: "Tracked dispatch from India in two to four working days, duties shown up front." },
];

export default async function HomePage() {
  const [currency, featured] = await Promise.all([
    getCurrency(),
    products.list({ perPage: 3 }),
  ]);

  const hero = featured.items[0];
  const heroImage = hero?.media.find((item) => item.kind === "image");

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-canvas-deep/45">
        <div className="shell grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="max-w-xl">
            <p className="eyebrow text-brass">Est. {brand.foundedYear} · Made in India</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
              {brand.tagline}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{brand.description}</p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-md bg-ink px-7 text-sm font-medium tracking-wide text-canvas transition-opacity hover:opacity-90"
              >
                Browse the catalogue
              </Link>
              <Link
                href="#story"
                className="inline-flex h-12 items-center rounded-md border border-line-strong px-7 text-sm font-medium text-ink transition-colors hover:border-ink"
              >
                How we work
              </Link>
            </div>
          </div>

          {heroImage ? (
            <Link
              href={`/products/${hero.slug}`}
              className="group relative block aspect-4/5 overflow-hidden rounded-lg bg-canvas-sink lg:aspect-3/4"
            >
              <Image
                src={heroImage.url}
                alt={heroImage.alt || hero.title}
                fill
                priority
                sizes="(min-width: 1024px) 46vw, 92vw"
                quality={90}
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-md bg-canvas/92 px-5 py-4 backdrop-blur-sm">
                <p className="eyebrow text-brass">This week</p>
                <p className="mt-1.5 font-display text-lg text-ink">{hero.title}</p>
                {hero.subtitle ? (
                  <p className="mt-0.5 text-sm text-ink-muted">{hero.subtitle}</p>
                ) : null}
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Assurances */}
      <section className="border-b border-line">
        <div className="shell grid gap-10 py-14 md:grid-cols-3 md:gap-14">
          {ASSURANCES.map((item, index) => (
            <div key={item.title}>
              <p className="font-display text-sm text-brass">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 font-display text-xl text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section id="featured" className="shell py-20 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-brass">Selected pieces</p>
            <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">Recently added</h2>
          </div>
          <Link
            href="/products"
            className="border-b border-line-strong pb-1 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            View all {featured.total} pieces &rarr;
          </Link>
        </div>

        {featured.items.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="font-display text-xl text-ink">The catalogue is empty</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              Add your first product from the store admin and it will show up here.
            </p>
            <Link
              href="/admin/products/new"
              className="mt-6 inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-canvas"
            >
              Add a product
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((product) => (
              <ProductCard key={product.id} product={product} currency={currency} />
            ))}
          </div>
        )}
      </section>

      {/* Story */}
      <section id="story" className="border-y border-line bg-canvas-deep/45">
        <div className="shell grid gap-12 py-20 md:py-24 lg:grid-cols-2 lg:gap-20">
          <div className="max-w-lg">
            <p className="eyebrow text-brass">Our story</p>
            <h2 className="mt-4 font-display text-3xl leading-tight text-ink md:text-4xl">
              We would rather sell you
              <br />
              one thing, once.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
              <p>
                {brand.name} started with a simple frustration: almost everything is designed to be
                replaced. So we went looking for the workshops still making things the slow way, and
                put a small number of their pieces in one place.
              </p>
              <p>
                Every product here is one we use ourselves. We photograph the real item, list what it
                is actually made of, and tell you when something is out of stock instead of
                pretending otherwise.
              </p>
            </div>
            <a
              href={`mailto:${brand.contactEmail}`}
              className="mt-8 inline-block border-b border-line-strong pb-1 text-sm text-ink transition-colors hover:border-ink"
            >
              Talk to us &rarr;
            </a>
          </div>

          <dl className="grid grid-cols-2 gap-y-10 self-center">
            {[
              { value: "2–4", label: "Working days to dispatch" },
              { value: "30", label: "Day return window" },
              { value: "2", label: "Currencies, priced separately" },
              { value: "40+", label: "Countries shipped to" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block font-display text-4xl text-ink md:text-5xl">{stat.value}</span>
                  <span className="mt-2 block text-sm text-ink-muted">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
