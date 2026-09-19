import { CURRENCY_META, discountPercent, formatMoney } from "@/lib/money";
import type { CurrencyCode, Product } from "@/lib/types";

export function Price({
  product,
  currency,
  size = "md",
}: {
  product: Pick<Product, "price" | "compareAtPrice">;
  currency: CurrencyCode;
  size?: "sm" | "md" | "lg";
}) {
  const amount = product.price[currency] ?? 0;
  const compareAt = product.compareAtPrice?.[currency];
  const off = compareAt ? discountPercent(amount, compareAt) : null;

  const scale = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`${scale} font-medium tabular-nums text-ink`}>
        {formatMoney(amount, currency, { compact: true })}
      </span>
      {compareAt ? (
        <span className="text-sm tabular-nums text-ink-muted line-through">
          {formatMoney(compareAt, currency, { compact: true })}
        </span>
      ) : null}
      {off ? (
        <span className="rounded-sm bg-brass-wash px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-brass">
          {off}% off
        </span>
      ) : null}
    </span>
  );
}

/** "Prices shown in US Dollar" — a small honesty note next to the switcher. */
export function CurrencyNote({ currency }: { currency: CurrencyCode }) {
  return (
    <span className="text-xs text-ink-muted">
      Prices shown in {CURRENCY_META[currency].label}
    </span>
  );
}
