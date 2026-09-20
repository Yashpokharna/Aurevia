import Link from "next/link";
import { Suspense } from "react";
import { brand, siteNav } from "@/lib/brand";
import { getCurrency } from "@/lib/region";
import { CurrencySwitcher } from "./currency-switcher";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader() {
  const currency = await getCurrency();

  return (
    // h-17 (4.25rem) is mirrored by HEADER_HEIGHT in mobile-nav.tsx.
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="shell flex h-17 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display text-xl tracking-[0.22em] text-ink"
          aria-label={`${brand.name} — home`}
        >
          {brand.wordmark}
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {siteNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="h-7 w-[8.5rem]" />}>
            <CurrencySwitcher current={currency} />
          </Suspense>
          <MobileNav items={siteNav} />
        </div>
      </div>
    </header>
  );
}
