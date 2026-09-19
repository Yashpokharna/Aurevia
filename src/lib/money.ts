import type { CurrencyCode, PriceMap } from "./types";

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  /** How many minor units make one major unit. */
  minorPerMajor: number;
  label: string;
  flag: string;
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  INR: {
    code: "INR",
    symbol: "₹",
    locale: "en-IN",
    minorPerMajor: 100,
    label: "Indian Rupee",
    flag: "🇮🇳",
  },
  USD: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
    minorPerMajor: 100,
    label: "US Dollar",
    flag: "🇺🇸",
  },
};

/**
 * Indicative rate used only to *suggest* a USD price in the admin form when you
 * enter an INR one. Displayed prices are never converted on the fly — each
 * currency has a real, merchant-set price so customers see round numbers and
 * your margins do not drift with the market.
 */
export const INR_PER_USD = Number(process.env.NEXT_PUBLIC_INR_PER_USD ?? 88);

/** Format an amount in minor units as a display string, e.g. 249900 -> "₹2,499.00". */
export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode,
  options: { compact?: boolean } = {}
): string {
  const meta = CURRENCY_META[currency];
  const major = minorUnits / meta.minorPerMajor;
  const hasFraction = minorUnits % meta.minorPerMajor !== 0;

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: options.compact && !hasFraction ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** "2499.50" (major units, as typed into a form) -> 249950 (minor units). */
export function toMinorUnits(major: string | number, currency: CurrencyCode): number {
  const value = typeof major === "number" ? major : Number.parseFloat(major);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * CURRENCY_META[currency].minorPerMajor);
}

/** 249950 -> "2499.50", for pre-filling a form field. */
export function toMajorUnits(minorUnits: number, currency: CurrencyCode): string {
  return (minorUnits / CURRENCY_META[currency].minorPerMajor).toFixed(2);
}

/** Suggest a USD price from an INR one, rounded to a tidy `.00`. */
export function suggestUsdFromInr(inrMinor: number): number {
  const usdMajor = inrMinor / 100 / INR_PER_USD;
  return Math.round(usdMajor) * 100;
}

export function priceIn(price: PriceMap, currency: CurrencyCode): number {
  return price[currency] ?? 0;
}

export function discountPercent(price: number, compareAt: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
