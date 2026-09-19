import Image from "next/image";
import Link from "next/link";
import { Price } from "./price";
import type { CurrencyCode, Product } from "@/lib/types";

export function ProductCard({
  product,
  currency,
  priority = false,
}: {
  product: Product;
  currency: CurrencyCode;
  priority?: boolean;
}) {
  const images = product.media.filter((item) => item.kind === "image");
  const [primary, secondary] = images;
  const hasVideo = product.media.some((item) => item.kind === "video");
  const soldOut = product.inventory !== null && product.inventory <= 0;

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-4/5 overflow-hidden rounded-md bg-canvas-deep">
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt || product.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">
              No image yet
            </div>
          )}

          {/* Second shot crossfades in on hover — only on devices that hover. */}
          {secondary ? (
            <Image
              src={secondary.url}
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="hidden object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:hover)]:block"
            />
          ) : null}

          <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
            {soldOut ? (
              <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[0.6875rem] font-medium text-canvas backdrop-blur-sm">
                Sold out
              </span>
            ) : null}
            {product.status === "draft" ? (
              <span className="rounded-full bg-critical/90 px-2.5 py-1 text-[0.6875rem] font-medium text-canvas">
                Draft
              </span>
            ) : null}
          </div>

          {hasVideo ? (
            <span
              className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-canvas/90 px-2.5 py-1 text-[0.6875rem] font-medium text-ink backdrop-blur-sm"
              title="Includes a product film"
            >
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden="true">
                <path d="M0 0.8c0-.6.7-1 1.2-.7l6.6 4.2c.5.3.5 1 0 1.3L1.2 9.9C.7 10.2 0 9.8 0 9.2V.8Z" />
              </svg>
              Film
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-snug text-ink">{product.title}</h3>
            {product.subtitle ? (
              <p className="mt-1 truncate text-sm text-ink-muted">{product.subtitle}</p>
            ) : null}
          </div>
          <div className="shrink-0 pt-0.5 text-right">
            <Price product={product} currency={currency} size="sm" />
          </div>
        </div>
      </Link>
    </article>
  );
}
