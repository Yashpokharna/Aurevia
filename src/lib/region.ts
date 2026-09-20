import { cookies, headers } from "next/headers";
import type { CurrencyCode } from "./types";

export const CURRENCY_COOKIE = "av_currency";
export const COUNTRY_COOKIE = "av_country";

/** Headers that hosting platforms use to report the visitor's country. */
export const GEO_HEADERS = [
  "x-vercel-ip-country", // Vercel
  "cf-ipcountry", // Cloudflare
  "x-geo-country", // Netlify / generic
  "x-appengine-country", // Google Cloud
] as const;

/**
 * India gets INR; everywhere else is quoted in USD. When you add a third
 * currency, this is the only mapping that needs to change.
 */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  return country?.toUpperCase() === "IN" ? "INR" : "USD";
}

export function isCurrency(value: string | null | undefined): value is CurrencyCode {
  return value === "INR" || value === "USD";
}

/**
 * The currency to render this request in. `proxy.ts` resolves it once per
 * request and stores it in a cookie, so a manual switch always wins over geo.
 */
export async function getCurrency(): Promise<CurrencyCode> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(CURRENCY_COOKIE)?.value;
  if (isCurrency(fromCookie)) return fromCookie;

  // Cookie missing (first paint, or a client that drops cookies): fall back to
  // reading the geo header directly.
  const headerStore = await headers();
  for (const name of GEO_HEADERS) {
    const country = headerStore.get(name);
    if (country) return currencyForCountry(country);
  }
  return currencyForCountry(process.env.DEFAULT_COUNTRY ?? null);
}

export async function getCountry(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COUNTRY_COOKIE)?.value;
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  for (const name of GEO_HEADERS) {
    const country = headerStore.get(name);
    if (country) return country.toUpperCase();
  }
  return null;
}
