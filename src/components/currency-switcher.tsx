"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CURRENCIES, type CurrencyCode } from "@/lib/types";
import { CURRENCY_META } from "@/lib/money";

/**
 * Writes `?currency=` onto the current URL. `proxy.ts` picks it up, stores the
 * choice in a cookie and redirects back to the clean URL.
 *
 * These are plain anchors, not `<Link>`, on purpose: currency lives in a cookie,
 * and a client-side navigation would re-use the router cache entry rendered with
 * the *previous* cookie — you'd change the currency and see the old prices. A
 * full document request is the only thing that reliably re-renders every price
 * on the page, and switching currency is rare enough to afford one.
 */
export function CurrencySwitcher({ current }: { current: CurrencyCode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (code: CurrencyCode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", code);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div
      className="inline-flex items-center rounded-full border border-line bg-canvas p-0.5"
      role="group"
      aria-label="Display currency"
    >
      {CURRENCIES.map((code) => {
        const active = code === current;
        return (
          <a
            key={code}
            href={hrefFor(code)}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-ink px-3 py-1 text-xs font-medium text-canvas"
                : "rounded-full px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            }
          >
            <span aria-hidden="true">{CURRENCY_META[code].symbol}</span> {code}
          </a>
        );
      })}
    </div>
  );
}
