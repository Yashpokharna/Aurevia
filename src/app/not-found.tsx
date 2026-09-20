import Link from "next/link";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Link href="/" className="font-display text-xl tracking-[0.22em] text-ink">
        {brand.wordmark}
      </Link>
      <p className="mt-12 font-display text-6xl text-brass">404</p>
      <h1 className="mt-4 font-display text-3xl text-ink">We can&apos;t find that page</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
        It may have sold out and been retired, or the link may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Browse the shop
        </Link>
        <a
          href={`mailto:${brand.contactEmail}`}
          className="inline-flex h-11 items-center rounded-md border border-line-strong px-6 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          Email us
        </a>
      </div>
    </div>
  );
}
