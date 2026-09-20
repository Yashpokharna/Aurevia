import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE, COUNTRY_COOKIE, GEO_HEADERS, currencyForCountry, isCurrency } from "@/lib/region";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Resolves the visitor's currency once, at the edge, before any page renders:
 *
 *   1. `?currency=USD` in the URL (the on-site switcher) always wins. We store
 *      the choice and redirect to the clean URL so it doesn't stick around.
 *   2. Otherwise the hosting platform's geo header decides — India gets INR,
 *      everyone else gets USD.
 *   3. Locally, where no geo header exists, `DEV_COUNTRY` in .env.local lets you
 *      pretend to be anywhere (try `DEV_COUNTRY=IN` and `DEV_COUNTRY=US`).
 */
export function proxy(request: NextRequest) {
  const override = request.nextUrl.searchParams.get("currency");

  if (isCurrency(override)) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("currency");
    const response = NextResponse.redirect(url);
    response.cookies.set(CURRENCY_COOKIE, override, {
      maxAge: ONE_YEAR,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  const response = NextResponse.next();

  const country =
    GEO_HEADERS.reduce<string | null>(
      (found, name) => found ?? request.headers.get(name),
      null
    ) ??
    process.env.DEV_COUNTRY ??
    process.env.DEFAULT_COUNTRY ??
    null;

  if (country) {
    response.cookies.set(COUNTRY_COOKIE, country.toUpperCase(), {
      maxAge: ONE_YEAR,
      sameSite: "lax",
      path: "/",
    });
  }

  // Only seed the currency cookie if the visitor hasn't chosen one themselves.
  if (!isCurrency(request.cookies.get(CURRENCY_COOKIE)?.value)) {
    response.cookies.set(CURRENCY_COOKIE, currencyForCountry(country), {
      maxAge: ONE_YEAR,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, uploaded media and webhook endpoints.
    "/((?!_next/static|_next/image|uploads/|api/webhooks/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm)$).*)",
  ],
};
